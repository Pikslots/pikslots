import request from 'supertest';
import { randomUUID } from 'node:crypto';
import type { UserRole, UserWorkingHours } from '@pikslots/domain';
import { BOOKING_ENDPOINTS } from '@pikslots/shared';

import { unique } from '../../common/unique-id';
import { endpointFor } from '../../common/endpoint-path';
import { authHeader, tokenFor } from '../../common/auth';
import {
  successBody,
  errorBody,
  type SuccessEnvelope,
  type ErrorEnvelope,
  type SupertestResponse,
} from '../../common/http-envelope';
import { createBusiness as createBusinessViaBusinessSuite } from '../../business/support/business-fixtures';
import { createCustomer as createCustomerViaCustomerSuite } from '../../customer/support/customer-fixtures';
import { createService as createServiceViaServiceSuite } from '../../service/support/service.fixtures';
import type { BookingTestContext } from './booking-test-context';

const DEFAULT_WORKING_HOURS: UserWorkingHours = {
  monday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  tuesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  wednesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  thursday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  friday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  saturday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
  sunday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
};

// ── Business / user / customer / service setup ─────────────────────────────

/** Registers a real owning business through the real Business suite fixtures. */
export async function createOwningBusiness(
  ctx: BookingTestContext,
): Promise<string> {
  const business = await createBusinessViaBusinessSuite(ctx);
  return business.id;
}

/**
 * Inserts a real staff user directly under the given business (this suite
 * isn't testing user registration/invite flows), tracked for cleanup.
 *
 * Unlike Timeoff's RegisterTimeoffDto, RegisterBookingDto's `userId` uses a
 * plain @IsUUID() (any version) -- not the strict @PikSlotsUUIDValidation()
 * v7 check -- so a v4 randomUUID() is fine here. What DOES matter: the
 * booking's persisted `user_id` column has a real (RESTRICT) fk to
 * users.id, and -- per RegisterBookingUseCaseImpl -- that persisted value
 * is always `securityContext.userId` (the caller), never `command.userId`
 * (see the note on registerBookingPayload below). So whichever user's id is
 * signed into the acting token for a *register* call MUST be a real row
 * from this function, or the insert fails with a live fk violation.
 */
export async function createStaffUser(
  ctx: BookingTestContext,
  businessId: string,
  role: UserRole = 'Standard',
): Promise<{ id: string; email: string }> {
  const id = randomUUID();
  const suffix = randomUUID().replace(/-/g, '').slice(0, 16);

  await ctx.db
    .insertInto('users')
    .values({
      id,
      business_id: businessId,
      username: `e2e${suffix}`,
      password: 'e2e-unused-password-hash',
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
  return { id, email: `${suffix}@example.com` };
}

/** Registers a real customer under the business through the real Customer suite fixtures. */
export async function createCustomerForBusiness(
  ctx: BookingTestContext,
  businessId: string,
): Promise<string> {
  const customer = await createCustomerViaCustomerSuite(ctx, businessId);
  return customer.id;
}

/** Registers a real service under the business through the real Service suite fixtures. */
export async function createServiceForBusiness(
  ctx: BookingTestContext,
  businessId: string,
): Promise<string> {
  return createServiceViaServiceSuite(ctx, {
    businessId,
    title: unique('E2E Service'),
  });
}

export async function tokenForRole(
  ctx: BookingTestContext,
  role: UserRole,
  businessId: string | null = null,
  userId?: string | null,
): Promise<string> {
  return tokenFor(ctx.sessionCacheService, role, businessId, userId);
}

// ── Booking payload / register / lookups ────────────────────────────────────

export interface ServiceSnapshotOverrides {
  title?: string;
  durationInMins?: number;
  cost?: number;
  colorCode?: string;
}

export function serviceSnapshotPayload(
  overrides: ServiceSnapshotOverrides = {},
) {
  return {
    title: overrides.title ?? 'Haircut',
    durationInMins: overrides.durationInMins ?? 30,
    cost: overrides.cost ?? 2500,
    colorCode: overrides.colorCode ?? '#0d9488',
  };
}

export interface BookingPayloadOverrides {
  bookingDate?: string;
  bookingStartTime?: string;
  bookingEndTime?: string;
  serviceSnapshot?: ServiceSnapshotOverrides;
  label?: string;
  notes?: string;
}

/**
 * Builds a real RegisterBookingDto payload.
 *
 * NOTE on `userId`: this is the "book for" target and is what the use
 * case's isSelf/authorization check reads (see RegisterBookingUseCaseImpl).
 * It is NOT, however, what ends up persisted as the booking's actual
 * `userId` -- the use case hardcodes `userId: this.securityContext.userId`
 * (the caller) onto the created Booking entity regardless of what's sent
 * here. See register.e2e-test.ts's "known bug" describe block.
 */
export function registerBookingPayload(
  businessId: string,
  serviceId: string,
  userId: string,
  customerId: string,
  overrides: BookingPayloadOverrides = {},
) {
  return {
    bookingDate: overrides.bookingDate ?? '2026-06-16',
    bookingStartTime: overrides.bookingStartTime ?? '2026-06-16T09:00:00.000Z',
    bookingEndTime: overrides.bookingEndTime ?? '2026-06-16T09:30:00.000Z',
    businessId,
    serviceId,
    userId,
    customerId,
    serviceSnapshot: serviceSnapshotPayload(overrides.serviceSnapshot),
    ...(overrides.label ? { label: overrides.label } : {}),
    ...(overrides.notes ? { notes: overrides.notes } : {}),
  };
}

export async function registerBooking(
  ctx: BookingTestContext,
  payload: ReturnType<typeof registerBookingPayload>,
  actorToken: string,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .post(BOOKING_ENDPOINTS.REGISTER)
    .set(authHeader(actorToken))
    .send(payload);
}

/**
 * Registers a real booking through the real HTTP endpoint (expecting
 * success) and reads its generated id back out of the DB, since the
 * register endpoint only ever echoes `{ message: 'success' }`.
 *
 * Looked up by (businessId, bookingStartTime, bookingEndTime) rather than
 * userId: because of the known userId bug described on
 * registerBookingPayload, the persisted row's user_id may not equal
 * payload.userId, so it isn't a reliable lookup key here.
 */
export async function createBooking(
  ctx: BookingTestContext,
  payload: ReturnType<typeof registerBookingPayload>,
  actorToken: string,
): Promise<{ id: string; bookingId: string }> {
  await registerBooking(ctx, payload, actorToken).then((res) => {
    if (res.status !== 201) {
      throw new Error(
        `createBooking setup failed: expected 201, got ${res.status}: ${JSON.stringify(res.body)}`,
      );
    }
  });

  const row = await ctx.db
    .selectFrom('bookings')
    .select(['id', 'booking_id'])
    .where('business_id', '=', payload.businessId)
    .where('booking_start_time', '=', new Date(payload.bookingStartTime))
    .where('booking_end_time', '=', new Date(payload.bookingEndTime))
    .where('is_deleted', '=', false)
    .orderBy('created_at', 'desc')
    .executeTakeFirstOrThrow();

  return { id: row.id, bookingId: row.booking_id };
}

export async function findBookingById(
  ctx: BookingTestContext,
  bookingId: string,
  actorToken: string,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .get(endpointFor(BOOKING_ENDPOINTS.FIND_BY_ID, { bookingId }))
    .set(authHeader(actorToken));
}

export async function findAllBookingsByBusinessForUser(
  ctx: BookingTestContext,
  businessId: string,
  userId: string,
  actorToken: string,
  query?: {
    startDateTime?: string;
    endDateTime?: string;
    timezone?: string;
  },
): Promise<SupertestResponse> {
  const qs = new URLSearchParams();
  if (query?.startDateTime) qs.set('startDateTime', query.startDateTime);
  if (query?.endDateTime) qs.set('endDateTime', query.endDateTime);
  if (query?.timezone) qs.set('timezone', query.timezone);

  const queryString = qs.toString();
  const path = endpointFor(BOOKING_ENDPOINTS.FIND_ALL_BY_BUSINESS_FOR_USER, {
    businessId,
    userId,
  });

  return request(ctx.app.getHttpServer())
    .get(queryString ? `${path}?${queryString}` : path)
    .set(authHeader(actorToken));
}

export interface EditBookingPayloadOverrides {
  bookingDate?: string;
  bookingStartTime?: string;
  bookingEndTime?: string;
  serviceId?: string;
  customerId?: string;
  userId?: string;
  label?: string;
  notes?: string;
}

export function editBookingPayload(
  base: {
    bookingDate: string;
    bookingStartTime: string;
    bookingEndTime: string;
    serviceId: string;
    customerId: string;
    userId: string;
  },
  overrides: EditBookingPayloadOverrides = {},
) {
  return {
    bookingDate: overrides.bookingDate ?? base.bookingDate,
    bookingStartTime: overrides.bookingStartTime ?? base.bookingStartTime,
    bookingEndTime: overrides.bookingEndTime ?? base.bookingEndTime,
    serviceId: overrides.serviceId ?? base.serviceId,
    customerId: overrides.customerId ?? base.customerId,
    userId: overrides.userId ?? base.userId,
    ...(overrides.label ? { label: overrides.label } : {}),
    ...(overrides.notes ? { notes: overrides.notes } : {}),
  };
}

export async function editBooking(
  ctx: BookingTestContext,
  bookingId: string,
  payload: ReturnType<typeof editBookingPayload>,
  actorToken: string,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .patch(endpointFor(BOOKING_ENDPOINTS.EDIT, { bookingId }))
    .set(authHeader(actorToken))
    .send(payload);
}

export async function deleteBooking(
  ctx: BookingTestContext,
  bookingId: string,
  actorToken: string,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .delete(endpointFor(BOOKING_ENDPOINTS.DELETE, { bookingId }))
    .set(authHeader(actorToken));
}

export { successBody, errorBody };
export type { SuccessEnvelope, ErrorEnvelope };
