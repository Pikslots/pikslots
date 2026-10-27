import request from 'supertest';
import { randomUUID } from 'node:crypto';
import type { UserRole, UserWorkingHours } from '@pikslots/domain';
import {
  BUSINESS_ENDPOINTS,
  USER_ENDPOINTS,
  SERVICE_ENDPOINTS,
  CUSTOMER_ENDPOINTS,
} from '@pikslots/shared';

import { unique } from '../../common/unique-id';
import { endpointForParams } from '../../common/endpoint-path';
import { authHeader, tokenFor } from '../../common/auth';
import { waitFor } from '../../common/wait-for';
import type { SupertestResponse } from '../../common/http-envelope';
import type {
  EmailTemplateContextMap,
  SendEmailOptions,
} from '../../../src/shared/email/pikslot.email.service';
import type { UserTestContext } from './user-test-context';

export const DEFAULT_WORKING_HOURS: UserWorkingHours = {
  monday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  tuesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  wednesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  thursday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  friday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  saturday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
  sunday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
};

// ── Business / staff-user setup (direct insert, not through the flows under test) ──

export async function createStaffUser(
  ctx: UserTestContext,
  businessId: string | null,
  role: UserRole = 'Business Owner',
  overrides: { password?: string } = {},
): Promise<{ id: string; username: string; email: string }> {
  const id = randomUUID();
  const suffix = randomUUID().replace(/-/g, '').slice(0, 16);
  const password = overrides.password
    ? await ctx.passwordHashingService.hash(overrides.password)
    : 'e2e-unused-password-hash'; // not a real bcrypt hash — fine as long as no test logs in as this user

  await ctx.db
    .insertInto('users')
    .values({
      id,
      business_id: businessId,
      username: `e2e${suffix}`,
      password,
      first_name: 'E2E',
      last_name: role.replace(/\s+/g, ''),
      email: `${suffix}@example.com`,
      phone: null,
      role,
      status: 'active',
      avatar_url: null,
      email_verified: true,
      booking_url: `https://example.com/book/${suffix}`,
      notification_mode: 'all',
      notification_sound_enabled: true,
      notification_sound_type: 'chime',
      reminder_enabled: true,
      reminder_mins_before: 10,
      reminder_sound_type: 'chime',
      user_working_hours: DEFAULT_WORKING_HOURS,
      last_login_at: null,
      suspended_reason: null,
      created_at: new Date(),
      created_by: id,
      updated_at: new Date(),
      updated_by: id,
      deleted_at: null,
      deleted_by: null,
      is_deleted: false,
    })
    .execute();

  ctx.createdUserIds.push(id);
  return { id, username: `e2e${suffix}`, email: `${suffix}@example.com` };
}

export async function createBusiness(
  ctx: UserTestContext,
): Promise<{ id: string; ownerId: string }> {
  const owner = await createStaffUser(ctx, null, 'Business Owner');
  const slug = unique('e2e-user-biz');

  await request(ctx.app.getHttpServer())
    .post(BUSINESS_ENDPOINTS.REGISTER)
    .send({
      ownerId: owner.id,
      ownerName: 'E2E Test Owner',
      ownerEmail: `${unique('owner')}@example.com`,
      slug,
      name: `E2E Business ${slug}`,
      industry: 'fitness',
      defaultTimeZone: 'America/New_York',
    })
    .expect(201);

  const row = await ctx.db
    .selectFrom('businesses')
    .select('id')
    .where('slug', '=', slug)
    .executeTakeFirstOrThrow();

  ctx.createdBusinessIds.push(row.id);

  // Registering a business only enqueues a real BUSINESS_REGISTRATION_INVITE
  // job; that job sends the owner's welcome email and THEN enqueues a
  // second real job (USER_ASSIGN_TO_BUSINESS) which is what actually
  // updates the owner's own users.business_id column (see
  // business.registration.invite.ts -> user.assigned.to.business.event.ts).
  // Until that second job runs, the owner's business_id in Postgres is
  // still null even though businesses.owner_id already points at them.
  // Callers that only need a businessId to embed in a JWT (most of this
  // suite) don't care about this ordering, but anything that reads the
  // owner back out of the real `users` table (e.g. getBusinessUsers) does.
  await waitFor(
    async () => {
      const ownerRow = await ctx.db
        .selectFrom('users')
        .select('business_id')
        .where('id', '=', owner.id)
        .executeTakeFirstOrThrow();
      return ownerRow.business_id === row.id;
    },
    // Two sequential real BullMQ jobs (not one), so this needs more
    // headroom than a typical single-hop wait, especially under a full
    // test-suite run where the shared worker is processing jobs for many
    // suites concurrently.
    { timeoutMs: 20000 },
  );

  return { id: row.id, ownerId: owner.id };
}

export async function setUserStatus(
  ctx: UserTestContext,
  userId: string,
  status: 'active' | 'inactive' | 'suspended' | 'invited',
  suspendedReason: string | null = null,
): Promise<void> {
  await ctx.db
    .updateTable('users')
    .set({ status, suspended_reason: suspendedReason })
    .where('id', '=', userId)
    .execute();
}

export async function tokenForRole(
  ctx: UserTestContext,
  role: UserRole,
  businessId: string | null = null,
  userId?: string,
): Promise<string> {
  return tokenFor(ctx.sessionCacheService, role, businessId, userId);
}

// ── Invite / OTP / accept-invite (real HTTP + real captured emails) ─────────

export interface InviteUserPayload {
  username: string;
  email: string;
  name: { firstName: string; lastName: string };
  role: UserRole;
  phone?: string;
  businessId?: string;
  businessName?: string;
}

export function inviteUserPayload(
  overrides: Partial<InviteUserPayload> = {},
): InviteUserPayload {
  const suffix = unique('invitee');
  return {
    username: suffix.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30),
    email: `${suffix}@example.com`,
    name: { firstName: 'Invited', lastName: 'Person' },
    role: 'Standard',
    phone: '+12025551234',
    ...overrides,
  };
}

export async function inviteUser(
  ctx: UserTestContext,
  payload: InviteUserPayload,
  actorToken: string,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .post(USER_ENDPOINTS.INVITE)
    .set(authHeader(actorToken))
    .send(payload);
}

function findCapturedEmail<T extends keyof EmailTemplateContextMap>(
  ctx: UserTestContext,
  template: T,
  recipientEmail: string,
): SendEmailOptions<T> {
  const calls = ctx.sentEmails.mock.calls as Array<
    Array<SendEmailOptions<keyof EmailTemplateContextMap>>
  >;
  const call = calls.find(
    (c) => c[0]?.template === template && c[0]?.to === recipientEmail,
  );
  if (!call) {
    throw new Error(
      `findCapturedEmail: no '${template}' email found for ${recipientEmail}`,
    );
  }
  return call[0] as SendEmailOptions<T>;
}

/**
 * Pulls the real invite JWT out of the captured 'user-invite' email — the
 * only place the token is ever exposed (it's embedded in the emailed
 * acceptUrl, never returned in the HTTP response body). Matches by
 * recipient email since a test may trigger more than one invite.
 */
export function extractInviteToken(
  ctx: UserTestContext,
  recipientEmail: string,
): string {
  const email = findCapturedEmail(ctx, 'user-invite', recipientEmail);
  const acceptUrl: string = email.context.acceptUrl;
  const token = new URL(acceptUrl).searchParams.get('jid');
  if (!token) {
    throw new Error(
      `extractInviteToken: acceptUrl had no 'jid' param: ${acceptUrl}`,
    );
  }
  return token;
}

export async function requestInviteOtp(
  ctx: UserTestContext,
  token: string,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .post(USER_ENDPOINTS.REQUEST_INVITE_OTP)
    .send({ token });
}

/** Pulls the real OTP code out of the captured 'otp' email, matched by recipient. */
export function extractOtp(
  ctx: UserTestContext,
  recipientEmail: string,
): string {
  const email = findCapturedEmail(ctx, 'otp', recipientEmail);
  return email.context.otp;
}

export async function acceptInvite(
  ctx: UserTestContext,
  payload: { token: string; otp: string; newPassword: string },
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .post(USER_ENDPOINTS.ACCEPT_INVITE)
    .send(payload);
}

/**
 * Runs the full real invite -> request-otp -> accept-invite flow via HTTP,
 * pulling the invite token and OTP out of captured emails along the way,
 * and returns login-ready credentials. Throws on any unexpected status so
 * setup failures surface immediately rather than as a confusing later
 * assertion failure.
 */
export async function inviteAndAcceptRealUser(
  ctx: UserTestContext,
  businessId: string,
  businessName: string,
  actorToken: string,
  overrides: Partial<InviteUserPayload> = {},
  newPassword = 'NewPassword123!',
): Promise<{ username: string; email: string; password: string }> {
  const payload = inviteUserPayload({
    businessId,
    businessName,
    ...overrides,
  });

  const inviteResponse = await inviteUser(ctx, payload, actorToken);
  if (inviteResponse.status !== 201) {
    throw new Error(
      `inviteAndAcceptRealUser: invite failed with ${inviteResponse.status}: ${JSON.stringify(inviteResponse.body)}`,
    );
  }

  const token = extractInviteToken(ctx, payload.email);

  const otpResponse = await requestInviteOtp(ctx, token);
  if (otpResponse.status !== 200) {
    throw new Error(
      `inviteAndAcceptRealUser: request-otp failed with ${otpResponse.status}: ${JSON.stringify(otpResponse.body)}`,
    );
  }

  const otp = extractOtp(ctx, payload.email);

  const acceptResponse = await acceptInvite(ctx, {
    token,
    otp,
    newPassword,
  });
  if (acceptResponse.status !== 200) {
    throw new Error(
      `inviteAndAcceptRealUser: accept-invite failed with ${acceptResponse.status}: ${JSON.stringify(acceptResponse.body)}`,
    );
  }

  // Track for cleanup — this user was created via the real flow, not
  // createStaffUser, so it isn't pushed to createdUserIds anywhere else.
  const row = await ctx.db
    .selectFrom('users')
    .select('id')
    .where('username', '=', payload.username)
    .executeTakeFirstOrThrow();
  ctx.createdUserIds.push(row.id);

  return {
    username: payload.username,
    email: payload.email,
    password: newPassword,
  };
}

// ── Login / logout ────────────────────────────────────────────────────────

export async function login(
  ctx: UserTestContext,
  usernameOrEmail: string,
  password: string,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .post(USER_ENDPOINTS.LOGIN)
    .send({ usernameOrEmail, password });
}

/** Pulls just the `jid=...` cookie value out of a Set-Cookie response header, for forwarding on the next request. */
export function extractSessionCookie(response: SupertestResponse): string {
  const raw = response.headers['set-cookie'] as unknown as string[] | undefined;
  const jidCookie = raw?.find((c) => c.startsWith('jid='));
  if (!jidCookie) {
    throw new Error(
      `extractSessionCookie: no 'jid' cookie in Set-Cookie header: ${JSON.stringify(raw)}`,
    );
  }
  return jidCookie.split(';')[0]; // strip attributes (Path=, HttpOnly, ...), keep "jid=<value>"
}

export async function logout(
  ctx: UserTestContext,
  sessionCookie?: string,
): Promise<SupertestResponse> {
  const req = request(ctx.app.getHttpServer()).post(USER_ENDPOINTS.LOGOUT);
  if (sessionCookie) req.set('Cookie', sessionCookie);
  return req;
}

// ── Profile / working hours / avatar ─────────────────────────────────────

export async function getUserProfile(
  ctx: UserTestContext,
  actorToken: string,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .get(USER_ENDPOINTS.ME)
    .set(authHeader(actorToken));
}

export async function updateWorkingHours(
  ctx: UserTestContext,
  userId: string,
  workingHours: UserWorkingHours,
  actorToken: string,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .patch(endpointForParams(USER_ENDPOINTS.UPDATE_WORKING_HOURS, { userId }))
    .set(authHeader(actorToken))
    .send(workingHours);
}

export async function updateUserAvatar(
  ctx: UserTestContext,
  userId: string,
  avatarKey: string,
  actorToken: string,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .patch(endpointForParams(USER_ENDPOINTS.UPDATE_AVATAR, { userId }))
    .set(authHeader(actorToken))
    .send({ avatarKey });
}

// ── Org queries ───────────────────────────────────────────────────────────

export async function getBusinessUsers(
  ctx: UserTestContext,
  businessId: string,
  actorToken: string,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .get(endpointForParams(USER_ENDPOINTS.BUSINESS_USERS, { businessId }))
    .set(authHeader(actorToken));
}

export async function getUsersByRole(
  ctx: UserTestContext,
  role: UserRole,
  actorToken: string,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .get(USER_ENDPOINTS.BY_ROLE)
    .query({ role })
    .set(authHeader(actorToken));
}

export async function getAllBusinessOwners(
  ctx: UserTestContext,
  actorToken: string,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .get(USER_ENDPOINTS.BUSINESS_OWNERS)
    .set(authHeader(actorToken));
}

// ── Free slots / available dates (public booking-page endpoints) ────────────
// These need a real Service + Customer for a realistic booking-exclusion
// test. Kept self-contained here (real HTTP registration, minimal fields)
// rather than importing the Service/Customer suites' own fixtures, since
// those are typed against test contexts carrying an S3 client/bucket this
// suite has no other use for.

export async function registerServiceForBusiness(
  ctx: UserTestContext,
  businessId: string,
): Promise<{ id: string }> {
  const title = unique('E2E Service');
  const { id: memberId } = await createStaffUser(ctx, businessId, 'Standard');
  await request(ctx.app.getHttpServer())
    .post(SERVICE_ENDPOINTS.REGISTER)
    .set(
      authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)),
    )
    .send({
      title,
      description: 'An e2e test service',
      serviceAvatar: '',
      durationInMins: 30,
      bufferTimeInMins: 10,
      cost: 2500,
      associatedUsers: [memberId],
      associatedServiceGroups: [],
      businessId,
      isHiddenFromBookingPage: false,
      colorCode: '#F54927',
    })
    .expect(201);

  const row = await ctx.db
    .selectFrom('services')
    .select('id')
    .where('title', '=', title)
    .where('business_id', '=', businessId)
    .executeTakeFirstOrThrow();
  return { id: row.id };
}

export async function registerCustomerForBusiness(
  ctx: UserTestContext,
  businessId: string,
): Promise<{ id: string }> {
  const suffix = unique('customer');
  await request(ctx.app.getHttpServer())
    .post(CUSTOMER_ENDPOINTS.REGISTER)
    .set(
      authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)),
    )
    .send({
      firstName: 'E2E',
      lastName: 'Customer',
      profileImageUrl: null,
      email: `${suffix}@example.com`,
      additionalEmail: null,
      primaryPhone: null,
      additionalPhone: null,
      company: null,
      country: null,
      address: null,
      city: null,
      state: null,
      zipCode: null,
      notes: null,
      customerSocialLinks: {},
      businessId,
    })
    .expect(201);

  const row = await ctx.db
    .selectFrom('customers')
    .select('id')
    .where('email', '=', `${suffix}@example.com`)
    .where('business_id', '=', businessId)
    .executeTakeFirstOrThrow();
  return { id: row.id };
}

/**
 * Direct insert rather than the real Booking module's HTTP flow — this
 * suite is only using a booking as a blocked-slot fixture for
 * GetFreeSlotsForUser, not testing booking creation itself (see the
 * Booking module's own e2e suite for that).
 */
export async function insertBooking(
  ctx: UserTestContext,
  params: {
    businessId: string;
    serviceId: string;
    customerId: string;
    userId: string;
    bookingDate: string;
    startTimeIso: string;
    endTimeIso: string;
  },
): Promise<void> {
  const id = randomUUID();
  await ctx.db
    .insertInto('bookings')
    .values({
      id,
      booking_id: `BK${unique('')
        .replace(/[^0-9]/g, '')
        .slice(0, 10)}`,
      booking_date: params.bookingDate,
      booking_start_time: new Date(params.startTimeIso),
      booking_end_time: new Date(params.endTimeIso),
      business_id: params.businessId,
      service_id: params.serviceId,
      service_snapshot: {
        title: 'E2E Service',
        durationInMins: 30,
        cost: 2500,
      },
      customer_id: params.customerId,
      user_id: params.userId,
      created_at: new Date(),
      created_by: params.userId,
      updated_at: new Date(),
      updated_by: params.userId,
      deleted_at: null,
      deleted_by: null,
      is_deleted: false,
    })
    .execute();
}

/** Direct insert — this suite is exercising GetFreeSlotsForUser, not the Break module itself. */
export async function insertBreak(
  ctx: UserTestContext,
  params: {
    businessId: string;
    userId: string;
    day: string; // lowercase weekday, e.g. 'monday'
    startTime: string; // HH:mm
    endTime: string; // HH:mm
  },
): Promise<void> {
  const id = randomUUID();
  await ctx.db
    .insertInto('breaks')
    .values({
      id,
      day: params.day,
      start_time: params.startTime,
      end_time: params.endTime,
      user_id: params.userId,
      business_id: params.businessId,
      created_at: new Date(),
      created_by: params.userId,
      updated_at: new Date(),
      updated_by: params.userId,
      deleted_at: null,
      deleted_by: null,
      is_deleted: false,
    })
    .execute();
}

/** Direct insert — this suite is exercising GetFreeSlotsForUser / GetAvailableDatesForBooking, not the Timeoff module itself. */
export async function insertTimeoff(
  ctx: UserTestContext,
  params: {
    businessId: string;
    userId: string;
    startDateTimeIso: string;
    endDateTimeIso: string;
    allDay: boolean;
  },
): Promise<void> {
  const id = randomUUID();
  await ctx.db
    .insertInto('timeoffs')
    .values({
      id,
      title: 'E2E Timeoff',
      user_id: params.userId,
      business_id: params.businessId,
      start_date_time: new Date(params.startDateTimeIso),
      end_date_time: new Date(params.endDateTimeIso),
      all_day: params.allDay,
      time_zone: 'UTC',
      recurrence: null,
      created_at: new Date(),
      created_by: params.userId,
      updated_at: new Date(),
      updated_by: params.userId,
      deleted_at: null,
      deleted_by: null,
      is_deleted: false,
    })
    .execute();
}

export interface GetFreeSlotsOverrides {
  durationInMins?: number;
  bufferTimeInMins?: number;
  businessTimezone?: string;
}

export async function getFreeSlotsForUser(
  ctx: UserTestContext,
  userId: string,
  businessId: string,
  date: string,
  overrides: GetFreeSlotsOverrides = {},
  actorToken?: string,
): Promise<SupertestResponse> {
  const req = request(ctx.app.getHttpServer())
    .get(endpointForParams(USER_ENDPOINTS.FREE_SLOTS, { userId }))
    .query({
      businessId,
      date,
      durationInMins: overrides.durationInMins ?? 30,
      bufferTimeInMins: overrides.bufferTimeInMins ?? 0,
      businessTimezone: overrides.businessTimezone ?? 'UTC',
    });
  if (actorToken) req.set(authHeader(actorToken));
  return req;
}

export async function getAvailableDatesForBooking(
  ctx: UserTestContext,
  userId: string,
  businessId: string,
  serviceId: string,
  businessTimezone = 'UTC',
  actorToken?: string,
): Promise<SupertestResponse> {
  const url = USER_ENDPOINTS.AVAILABLE_DATES.replace(':userId', userId);
  const req = request(ctx.app.getHttpServer())
    .post(url)
    .send({ businessId, serviceId, businessTimezone });
  if (actorToken) req.set(authHeader(actorToken));
  return req;
}

// ── Date helpers (deterministic, timezone-free — tests use businessTimezone: 'UTC') ──

/** Returns a YYYY-MM-DD string at least `minDaysAhead` days out, landing on `targetDow` (0=Sun..6=Sat). Always in the future, so slot-generation's "clamp to now" logic never kicks in. */
export function futureDateOnWeekday(
  targetDow: number,
  minDaysAhead = 7,
): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + minDaysAhead);
  while (d.getUTCDay() !== targetDow) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}
