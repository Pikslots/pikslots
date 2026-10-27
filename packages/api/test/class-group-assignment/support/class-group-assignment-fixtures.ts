import request from 'supertest';
import { randomUUID } from 'node:crypto';
import type { UserRole, UserWorkingHours } from '@pikslots/domain';
import {
  BUSINESS_ENDPOINTS,
  CLASS_ENDPOINTS,
  CLASS_GROUP_ENDPOINTS,
} from '@pikslots/shared';

import { unique } from '../../common/unique-id';
import { endpointFor } from '../../common/endpoint-path';
import { authHeader, tokenFor } from '../../common/auth';
import { waitFor } from '../../common/wait-for';
import type { ClassGroupAssignmentTestContext } from './class-group-assignment-test-context';

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
// rather than imported, since those helpers are typed against
// BusinessTestContext (which also carries S3 client/bucket this suite has
// no use for). Keeping this suite's context self-contained avoids a type
// mismatch for the sake of a few lines of setup.

async function createOwnerUser(
  ctx: ClassGroupAssignmentTestContext,
): Promise<string> {
  const id = randomUUID();
  const suffix = randomUUID().replace(/-/g, '').slice(0, 16);

  await ctx.db
    .insertInto('users')
    .values({
      id,
      business_id: null,
      username: `e2e${suffix}`,
      password: 'e2e-unused-password-hash',
      first_name: 'E2E',
      last_name: 'Owner',
      email: `${suffix}@example.com`,
      phone: null,
      role: 'Business Owner',
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
  ctx: ClassGroupAssignmentTestContext,
): Promise<{ id: string; ownerId: string }> {
  const ownerId = await createOwnerUser(ctx);
  const slug = unique('e2e-cga-biz');

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

// ── Class registration/editing ───────────────────────────────────────────

export interface RegisterClassOverrides {
  title?: string;
  associatedClassGroupIds?: string[];
}

/** Registers a real class through the real HTTP endpoint; resolves the row id by (title, businessId) since the endpoint only echoes {message:'success'}. */
export async function registerClass(
  ctx: ClassGroupAssignmentTestContext,
  businessId: string,
  overrides: RegisterClassOverrides = {},
): Promise<{ id: string; title: string }> {
  const title = overrides.title ?? unique('E2E Class');

  await request(ctx.app.getHttpServer())
    .post(CLASS_ENDPOINTS.REGISTER)
    .set(
      authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)),
    )
    .send({
      title,
      description: 'An e2e test class',
      imagesUrls: [],
      durationInMins: 60,
      seats: 10,
      cost: 1500,
      businessId,
      isHiddenFromBookingPage: false,
      associatedClassGroupIds: overrides.associatedClassGroupIds ?? [],
    })
    .expect(201);

  const row = await ctx.db
    .selectFrom('classes')
    .select('id')
    .where('title', '=', title)
    .where('business_id', '=', businessId)
    .executeTakeFirstOrThrow();

  return { id: row.id, title };
}

export interface EditClassOverrides {
  title: string;
  associatedClassGroupIds: string[];
}

/** Edits a class through the real HTTP endpoint (always re-fires the class-group sync so removals process). */
export async function editClass(
  ctx: ClassGroupAssignmentTestContext,
  classId: string,
  businessId: string,
  overrides: EditClassOverrides,
): Promise<void> {
  await request(ctx.app.getHttpServer())
    .patch(endpointFor(CLASS_ENDPOINTS.UPDATE, { classId }))
    .set(
      authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)),
    )
    .send({
      title: overrides.title,
      description: 'An e2e test class',
      imagesUrls: [],
      durationInMins: 60,
      seats: 10,
      cost: 1500,
      businessId,
      isHiddenFromBookingPage: false,
      associatedClassGroupIds: overrides.associatedClassGroupIds,
    })
    .expect(200);
}

// ── Class group registration/editing ─────────────────────────────────────

export interface RegisterClassGroupOverrides {
  name?: string;
  associatedClasses?: string[];
}

/** Registers a real class group through the real HTTP endpoint; resolves the row id by (name, businessId) since the endpoint only echoes {message:'success'}. */
export async function registerClassGroup(
  ctx: ClassGroupAssignmentTestContext,
  businessId: string,
  overrides: RegisterClassGroupOverrides = {},
): Promise<{ id: string; name: string }> {
  const name = overrides.name ?? unique('E2E Group');

  await request(ctx.app.getHttpServer())
    .post(CLASS_GROUP_ENDPOINTS.REGISTER)
    .set(
      authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)),
    )
    .send({
      name,
      businessId,
      associatedClasses: overrides.associatedClasses ?? [],
    })
    .expect(201);

  const row = await ctx.db
    .selectFrom('class_groups')
    .select('id')
    .where('name', '=', name)
    .where('business_id', '=', businessId)
    .executeTakeFirstOrThrow();

  return { id: row.id, name };
}

export interface EditClassGroupOverrides {
  name: string;
  classIds: string[];
}

/** Edits a class group through the real HTTP endpoint (always re-fires the class sync so removals process). */
export async function editClassGroup(
  ctx: ClassGroupAssignmentTestContext,
  classGroupId: string,
  businessId: string,
  overrides: EditClassGroupOverrides,
): Promise<void> {
  await request(ctx.app.getHttpServer())
    .patch(endpointFor(CLASS_GROUP_ENDPOINTS.EDIT, { classGroupId }))
    .set(
      authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)),
    )
    .send({
      name: overrides.name,
      businessId,
      classIds: overrides.classIds,
    })
    .expect(200);
}

// ── Waiting on the async sync workers ────────────────────────────────────
// Registering/editing a class or class group only enqueues a real BullMQ
// job; the class_group_assignments row is written by the real worker
// (SyncClassClassGroupsEventImpl / SyncClassGroupClassesEventImpl)
// asynchronously. Polling the DB directly (rather than the GET endpoints
// under test) keeps setup verification independent of the thing being
// tested.

export async function waitForActiveAssignmentCountByClass(
  ctx: ClassGroupAssignmentTestContext,
  classId: string,
  expectedCount: number,
): Promise<void> {
  await waitFor(async () => {
    const rows = await ctx.db
      .selectFrom('class_group_assignments')
      .select('id')
      .where('class_id', '=', classId)
      .where('is_deleted', '=', false)
      .execute();
    return rows.length === expectedCount;
  });
}

export async function waitForActiveAssignmentCountByGroup(
  ctx: ClassGroupAssignmentTestContext,
  classGroupId: string,
  expectedCount: number,
): Promise<void> {
  await waitFor(async () => {
    const rows = await ctx.db
      .selectFrom('class_group_assignments')
      .select('id')
      .where('class_group_id', '=', classGroupId)
      .where('is_deleted', '=', false)
      .execute();
    return rows.length === expectedCount;
  });
}

export async function tokenForRole(
  ctx: ClassGroupAssignmentTestContext,
  role: UserRole,
  businessId: string | null = null,
): Promise<string> {
  return tokenFor(ctx.sessionCacheService, role, businessId);
}
