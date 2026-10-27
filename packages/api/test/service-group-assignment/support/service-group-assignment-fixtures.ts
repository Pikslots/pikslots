import request from 'supertest';
import { randomUUID } from 'node:crypto';
import type { UserRole, UserWorkingHours } from '@pikslots/domain';
import {
  BUSINESS_ENDPOINTS,
  SERVICE_ENDPOINTS,
  SERVICE_GROUP_ENDPOINTS,
} from '@pikslots/shared';

import { unique } from '../../common/unique-id';
import { endpointForParams } from '../../common/endpoint-path';
import { authHeader, tokenFor } from '../../common/auth';
import { waitFor } from '../../common/wait-for';
import type { ServiceGroupAssignmentTestContext } from './service-group-assignment-test-context';

const DEFAULT_WORKING_HOURS: UserWorkingHours = {
  monday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  tuesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  wednesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  thursday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  friday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  saturday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
  sunday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
};

// ── Business / owner setup ───────────────────────────────────────────────
// Duplicated (in miniature) from test/business/support/business-fixtures.ts
// rather than imported — same reasoning as class-group-assignment-fixtures.ts:
// those helpers are typed against BusinessTestContext (which also carries an
// S3 client/bucket this suite has no use for). Keeping this suite
// self-contained avoids a type mismatch for the sake of a few lines of setup.

async function createOwnerUser(
  ctx: ServiceGroupAssignmentTestContext,
): Promise<string> {
  return insertTestUser(ctx, null, 'Business Owner', 'Owner');
}

async function createTeamMember(
  ctx: ServiceGroupAssignmentTestContext,
  businessId: string,
): Promise<string> {
  return insertTestUser(ctx, businessId, 'Standard', 'Member');
}

async function insertTestUser(
  ctx: ServiceGroupAssignmentTestContext,
  businessId: string | null,
  role: UserRole,
  lastName: string,
): Promise<string> {
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
      last_name: lastName,
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
  return id;
}

export async function createBusiness(
  ctx: ServiceGroupAssignmentTestContext,
): Promise<{ id: string; ownerId: string }> {
  const ownerId = await createOwnerUser(ctx);
  const slug = unique('e2e-sga-biz');

  await request(ctx.app.getHttpServer())
    .post(BUSINESS_ENDPOINTS.REGISTER)
    .send({
      ownerId,
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
  return { id: row.id, ownerId };
}

// ── Service registration/editing ─────────────────────────────────────────

export interface RegisterServiceOverrides {
  title?: string;
  associatedServiceGroups?: string[];
}

/** Registers a real service through the real HTTP endpoint; resolves the row id by (title, businessId) since the endpoint only echoes {message:'success'}. */
export async function registerService(
  ctx: ServiceGroupAssignmentTestContext,
  businessId: string,
  overrides: RegisterServiceOverrides = {},
): Promise<{ id: string; title: string }> {
  const title = overrides.title ?? unique('E2E Service');

  await request(ctx.app.getHttpServer())
    .post(SERVICE_ENDPOINTS.REGISTER)
    .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)))
    .send({
      title,
      description: 'An e2e test service',
      serviceAvatar: '',
      durationInMins: 30,
      bufferTimeInMins: 10,
      cost: 2500,
      associatedUsers: [await createTeamMember(ctx, businessId)],
      associatedServiceGroups: overrides.associatedServiceGroups ?? [],
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

  return { id: row.id, title };
}

export interface EditServiceOverrides {
  title: string;
  associatedServiceGroups: string[];
}

/** Edits a service through the real HTTP endpoint (always re-fires the service-group sync so removals process). */
export async function editService(
  ctx: ServiceGroupAssignmentTestContext,
  serviceId: string,
  businessId: string,
  overrides: EditServiceOverrides,
): Promise<void> {
  await request(ctx.app.getHttpServer())
    .patch(endpointForParams(SERVICE_ENDPOINTS.UPDATE, { serviceId }))
    .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)))
    .send({
      title: overrides.title,
      description: 'An e2e test service',
      serviceAvatar: '',
      durationInMins: 30,
      bufferTimeInMins: 10,
      cost: 2500,
      associatedUsers: [await createTeamMember(ctx, businessId)],
      associatedServiceGroups: overrides.associatedServiceGroups,
      businessId,
      isHiddenFromBookingPage: false,
      colorCode: '#F54927',
    })
    .expect(200);
}

// ── Service group registration/editing ───────────────────────────────────

export interface RegisterServiceGroupOverrides {
  name?: string;
  associatedServices?: string[];
}

/** Registers a real service group through the real HTTP endpoint; resolves the row id by (name, businessId) since the endpoint only echoes {message:'success'}. */
export async function registerServiceGroup(
  ctx: ServiceGroupAssignmentTestContext,
  businessId: string,
  overrides: RegisterServiceGroupOverrides = {},
): Promise<{ id: string; name: string }> {
  const name = overrides.name ?? unique('E2E Group');

  await request(ctx.app.getHttpServer())
    .post(SERVICE_GROUP_ENDPOINTS.REGISTER)
    .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)))
    .send({
      name,
      businessId,
      associatedServices: overrides.associatedServices ?? [],
    })
    .expect(201);

  const row = await ctx.db
    .selectFrom('service_groups')
    .select('id')
    .where('name', '=', name)
    .where('business_id', '=', businessId)
    .executeTakeFirstOrThrow();

  return { id: row.id, name };
}

export interface EditServiceGroupOverrides {
  name: string;
  serviceIds: string[];
}

/** Edits a service group through the real HTTP endpoint (always re-fires the service sync so removals process). */
export async function editServiceGroup(
  ctx: ServiceGroupAssignmentTestContext,
  serviceGroupId: string,
  businessId: string,
  overrides: EditServiceGroupOverrides,
): Promise<void> {
  await request(ctx.app.getHttpServer())
    .patch(
      endpointForParams(SERVICE_GROUP_ENDPOINTS.EDIT, {
        serviceGroupId,
      }),
    )
    .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)))
    .send({
      name: overrides.name,
      businessId,
      serviceIds: overrides.serviceIds,
    })
    .expect(200);
}

// ── Waiting on the async sync workers ────────────────────────────────────
// Registering/editing a service or service group only enqueues a real
// BullMQ job; the service_group_assignments row is written by the real
// worker (SyncServiceServiceGroupsEventImpl / SyncServiceGroupServicesEventImpl)
// asynchronously. Polling the DB directly (rather than the GET endpoints
// under test) keeps setup verification independent of the thing being
// tested.

export async function waitForActiveAssignmentCountByService(
  ctx: ServiceGroupAssignmentTestContext,
  serviceId: string,
  expectedCount: number,
): Promise<void> {
  await waitFor(async () => {
    const rows = await ctx.db
      .selectFrom('service_group_assignments')
      .select('id')
      .where('service_id', '=', serviceId)
      .where('is_deleted', '=', false)
      .execute();
    return rows.length === expectedCount;
  });
}

export async function waitForActiveAssignmentCountByGroup(
  ctx: ServiceGroupAssignmentTestContext,
  serviceGroupId: string,
  expectedCount: number,
): Promise<void> {
  await waitFor(async () => {
    const rows = await ctx.db
      .selectFrom('service_group_assignments')
      .select('id')
      .where('service_group_id', '=', serviceGroupId)
      .where('is_deleted', '=', false)
      .execute();
    return rows.length === expectedCount;
  });
}

export async function tokenForRole(
  ctx: ServiceGroupAssignmentTestContext,
  role: UserRole,
  businessId: string | null = null,
): Promise<string> {
  return tokenFor(ctx.sessionCacheService, role, businessId);
}
