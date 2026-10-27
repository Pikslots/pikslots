import request from 'supertest';
import { randomUUID } from 'node:crypto';
import type { UserRole, UserWorkingHours } from '@pikslots/domain';
import { BUSINESS_ENDPOINTS, SERVICE_GROUP_ENDPOINTS } from '@pikslots/shared';

import { unique } from '../../common/unique-id';
import { endpointFor } from '../../common/endpoint-path';
import { authHeader, tokenFor } from '../../common/auth';
import type { ServiceGroupTestContext } from './service-group-test-context';

const DEFAULT_WORKING_HOURS: UserWorkingHours = {
  monday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  tuesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  wednesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  thursday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  friday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  saturday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
  sunday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
};

// ── Business setup ───────────────────────────────────────────────────────

async function createOwnerUser(ctx: ServiceGroupTestContext): Promise<string> {
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
  ctx: ServiceGroupTestContext,
): Promise<{ id: string; ownerId: string }> {
  const ownerId = await createOwnerUser(ctx);
  const slug = unique('e2e-svc-group-biz');

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

// ── Service group register/edit/delete ───────────────────────────────────

export interface RegisterServiceGroupOverrides {
  name?: string;
  associatedServices?: string[];
}

/** Registers a real service group through the real HTTP endpoint; resolves the row id by (name, businessId) since the endpoint only echoes {message:'success'}. */
export async function registerServiceGroup(
  ctx: ServiceGroupTestContext,
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

export interface EditServiceGroupOverrides {
  name: string;
  businessId: string;
  serviceIds: string[];
}

export function editServiceGroupPath(serviceGroupId: string): string {
  return endpointFor(SERVICE_GROUP_ENDPOINTS.EDIT, { serviceGroupId });
}

export function deleteServiceGroupPath(serviceGroupId: string): string {
  return endpointFor(SERVICE_GROUP_ENDPOINTS.DELETE, {
    serviceGroupId,
  });
}

export function findAllByBusinessPath(businessId: string): string {
  return endpointFor(SERVICE_GROUP_ENDPOINTS.FIND_ALL_BY_BUSINESS, {
    businessId,
  });
}

export async function tokenForRole(
  ctx: ServiceGroupTestContext,
  role: UserRole,
  businessId: string | null = null,
): Promise<string> {
  return tokenFor(ctx.sessionCacheService, role, businessId);
}
