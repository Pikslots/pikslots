import request from 'supertest';
import { randomUUID } from 'node:crypto';
import type { UserRole, UserWorkingHours } from '@pikslots/domain';
import {
  BUSINESS_ENDPOINTS,
  SERVICE_ENDPOINTS,
  SERVICE_GROUP_ENDPOINTS,
} from '@pikslots/shared';

import { unique } from '../../common/unique-id';
import { authHeader, tokenFor } from '../../common/auth';
import { waitFor } from '../../common/wait-for';
import type { PublicBookingPageTestContext } from './public-booking-page-test-context';

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

async function insertUser(
  ctx: PublicBookingPageTestContext,
  businessId: string | null,
  role: UserRole,
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
  return id;
}

/** Registers a real business (with a fresh owner) through the real HTTP endpoint. */
export async function createBusiness(
  ctx: PublicBookingPageTestContext,
): Promise<{ id: string; slug: string; ownerId: string }> {
  const ownerId = await insertUser(ctx, null, 'Business Owner');
  const slug = unique('e2e-pbp-biz');

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
  return { id: row.id, slug, ownerId };
}

/** Inserts a real user row directly under the given business (team member for the public page). */
export async function createTeamMember(
  ctx: PublicBookingPageTestContext,
  businessId: string,
  role: UserRole = 'Standard',
): Promise<string> {
  return insertUser(ctx, businessId, role);
}

// ── Service registration ─────────────────────────────────────────────────

export interface RegisterServiceOverrides {
  title?: string;
  isHiddenFromBookingPage?: boolean;
  associatedServiceGroups?: string[];
  associatedUsers?: string[];
}

/** Registers a real service through the real HTTP endpoint; resolves the row id by (title, businessId) since the endpoint only echoes {message:'success'}. */
export async function registerService(
  ctx: PublicBookingPageTestContext,
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
      businessId,
      isHiddenFromBookingPage: overrides.isHiddenFromBookingPage ?? false,
      associatedUsers: overrides.associatedUsers ?? [
        await createTeamMember(ctx, businessId),
      ],
      associatedServiceGroups: overrides.associatedServiceGroups ?? [],
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

// ── Service group registration ───────────────────────────────────────────

export interface RegisterServiceGroupOverrides {
  name?: string;
  associatedServices?: string[];
}

/** Registers a real service group through the real HTTP endpoint; resolves the row id by (name, businessId) since the endpoint only echoes {message:'success'}. */
export async function registerServiceGroup(
  ctx: PublicBookingPageTestContext,
  businessId: string,
  overrides: RegisterServiceGroupOverrides = {},
): Promise<{ id: string; name: string }> {
  const name = overrides.name ?? unique('E2E Service Group');

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

// ── Waiting on the async sync workers ────────────────────────────────────
// Registering a service with associatedServiceGroups/associatedUsers only
// enqueues real BullMQ jobs; the assignment rows are written by the real
// worker asynchronously. Polling the DB directly (rather than the public
// page endpoint under test) keeps setup verification independent of the
// thing being tested.

export async function waitForActiveServiceGroupAssignmentCount(
  ctx: PublicBookingPageTestContext,
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

export async function waitForActiveServiceUserAssignmentCount(
  ctx: PublicBookingPageTestContext,
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
