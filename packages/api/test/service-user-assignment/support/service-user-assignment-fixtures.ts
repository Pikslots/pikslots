import request from 'supertest';
import { randomUUID } from 'node:crypto';
import type { UserRole, UserWorkingHours } from '@pikslots/domain';
import {
  BUSINESS_ENDPOINTS,
  SERVICE_ENDPOINTS,
  SERVICE_USER_ASSIGNMENT_ENDPOINTS,
} from '@pikslots/shared';

import { unique } from '../../common/unique-id';
import { endpointForParams } from '../../common/endpoint-path';
import { authHeader, tokenFor } from '../../common/auth';
import { waitFor } from '../../common/wait-for';
import type {
  SuccessEnvelope,
  ErrorEnvelope,
  SupertestResponse,
} from '../../common/http-envelope';
import type { ServiceUserAssignmentTestContext } from './service-user-assignment-test-context';

const DEFAULT_WORKING_HOURS: UserWorkingHours = {
  monday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  tuesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  wednesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  thursday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  friday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  saturday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
  sunday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
};

// ── Business / user setup ────────────────────────────────────────────────
// Self-contained, same reasoning as the Class/Service Group Assignment
// suites: avoids a type mismatch with BusinessTestContext (S3 client/bucket
// this suite has no use for) for the sake of a few lines of setup.

export async function createStaffUser(
  ctx: ServiceUserAssignmentTestContext,
  businessId: string | null,
  role: UserRole = 'Business Owner',
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

export async function createBusiness(
  ctx: ServiceUserAssignmentTestContext,
): Promise<{ id: string; ownerId: string }> {
  const owner = await createStaffUser(ctx, null, 'Business Owner');
  const slug = unique('e2e-sua-biz');

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
  return { id: row.id, ownerId: owner.id };
}

// ── Service registration/editing ─────────────────────────────────────────

export interface RegisterServiceOverrides {
  title?: string;
  associatedUsers?: string[];
}

/** Registers a real service through the real HTTP endpoint; resolves the row id by (title, businessId) since the endpoint only echoes {message:'success'}. */
export async function registerService(
  ctx: ServiceUserAssignmentTestContext,
  businessId: string,
  overrides: RegisterServiceOverrides = {},
): Promise<{
  id: string;
  title: string;
  durationInMins: number;
  bufferTimeInMins: number;
  cost: number;
  colorCode: string;
}> {
  const title = overrides.title ?? unique('E2E Service');
  const associatedUsers = overrides.associatedUsers ?? [
    (await createStaffUser(ctx, businessId, 'Standard')).id,
  ];

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
      associatedUsers,
      associatedServiceGroups: [],
      businessId,
      isHiddenFromBookingPage: false,
      colorCode: '#F54927',
    })
    .expect(201);

  const row = await ctx.db
    .selectFrom('services')
    .select([
      'id',
      'duration_in_mins',
      'buffer_time_in_mins',
      'cost',
      'color_code',
    ])
    .where('title', '=', title)
    .where('business_id', '=', businessId)
    .executeTakeFirstOrThrow();

  return {
    id: row.id,
    title,
    durationInMins: row.duration_in_mins,
    bufferTimeInMins: row.buffer_time_in_mins,
    cost: row.cost,
    colorCode: row.color_code,
  };
}

export interface EditServiceOverrides {
  title: string;
  associatedUsers: string[];
}

/** Edits a service through the real HTTP endpoint (always re-fires the service-user sync so removals process). */
export async function editService(
  ctx: ServiceUserAssignmentTestContext,
  serviceId: string,
  businessId: string,
  overrides: EditServiceOverrides,
): Promise<void> {
  await request(ctx.app.getHttpServer())
    .patch(endpointForParams(SERVICE_ENDPOINTS.UPDATE, { serviceId }))
    .set(
      authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)),
    )
    .send({
      title: overrides.title,
      description: 'An e2e test service',
      serviceAvatar: '',
      durationInMins: 30,
      bufferTimeInMins: 10,
      cost: 2500,
      associatedUsers: overrides.associatedUsers,
      associatedServiceGroups: [],
      businessId,
      isHiddenFromBookingPage: false,
      colorCode: '#F54927',
    })
    .expect(200);
}

// ── Direct assign / remove endpoints ─────────────────────────────────────

export interface AssignUserToServicePayload {
  serviceId: string;
  userId: string;
  businessId: string;
}

export async function assignUserToService(
  ctx: ServiceUserAssignmentTestContext,
  payload: AssignUserToServicePayload,
  actorToken: string,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .post(SERVICE_USER_ASSIGNMENT_ENDPOINTS.ASSIGN_USER)
    .set(authHeader(actorToken))
    .send(payload);
}

/** Assigns through the real HTTP endpoint, expecting success. */
export async function createAssignment(
  ctx: ServiceUserAssignmentTestContext,
  payload: AssignUserToServicePayload,
  actorToken: string,
): Promise<{ id: string }> {
  const response = await assignUserToService(ctx, payload, actorToken);
  if (response.status !== 201) {
    throw new Error(
      `createAssignment setup failed: expected 201, got ${response.status}: ${JSON.stringify(response.body)}`,
    );
  }
  return { id: (response.body as SuccessEnvelope<{ id: string }>).data.id };
}

export async function removeUserFromService(
  ctx: ServiceUserAssignmentTestContext,
  serviceId: string,
  userId: string,
  actorToken: string,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .delete(
      endpointForParams(SERVICE_USER_ASSIGNMENT_ENDPOINTS.REMOVE_USER, {
        serviceId,
        userId,
      }),
    )
    .set(authHeader(actorToken));
}

// ── Read endpoints ────────────────────────────────────────────────────────

export async function findUsersByService(
  ctx: ServiceUserAssignmentTestContext,
  serviceId: string,
  actorToken: string,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .get(
      endpointForParams(SERVICE_USER_ASSIGNMENT_ENDPOINTS.FIND_BY_SERVICE, {
        serviceId,
      }),
    )
    .set(authHeader(actorToken));
}

export async function findServicesByUser(
  ctx: ServiceUserAssignmentTestContext,
  userId: string,
  actorToken: string,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .get(
      endpointForParams(
        SERVICE_USER_ASSIGNMENT_ENDPOINTS.FIND_SERVICES_BY_USER,
        { userId },
      ),
    )
    .set(authHeader(actorToken));
}

// ── Waiting on the async sync worker ─────────────────────────────────────
// Registering/editing a service only enqueues a real BullMQ job; the
// service_user_assignments row is written by the real worker
// (SyncServiceToUsersEventImpl) asynchronously. Polling the DB directly
// (rather than the GET endpoints under test) keeps setup verification
// independent of the thing being tested.

export async function waitForActiveAssignmentCountByService(
  ctx: ServiceUserAssignmentTestContext,
  serviceId: string,
  expectedCount: number,
): Promise<void> {
  await waitFor(async () => {
    const rows = await ctx.db
      .selectFrom('service_user_assignments')
      .select('id')
      .where('service_id', '=', serviceId)
      .where('is_deleted', '=', false)
      .execute();
    return rows.length === expectedCount;
  });
}

export async function waitForActiveAssignmentCountByUser(
  ctx: ServiceUserAssignmentTestContext,
  userId: string,
  expectedCount: number,
): Promise<void> {
  await waitFor(async () => {
    const rows = await ctx.db
      .selectFrom('service_user_assignments')
      .select('id')
      .where('user_id', '=', userId)
      .where('is_deleted', '=', false)
      .execute();
    return rows.length === expectedCount;
  });
}

export async function tokenForRole(
  ctx: ServiceUserAssignmentTestContext,
  role: UserRole,
  businessId: string | null = null,
): Promise<string> {
  return tokenFor(ctx.sessionCacheService, role, businessId);
}

export type { SuccessEnvelope, ErrorEnvelope };
