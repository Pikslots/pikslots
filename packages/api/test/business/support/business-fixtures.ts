import request from 'supertest';
import { randomUUID } from 'node:crypto';
import type { UserRole, UserWorkingHours } from '@pikslots/domain';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { unique } from '../../common/unique-id';
import { endpointFor } from '../../common/endpoint-path';
import { authHeader, tokenFor } from '../../common/auth';
import { successBody, type SuccessEnvelope } from '../../common/http-envelope';
import type { BusinessTestContext } from './business-test-context';

const DEFAULT_WORKING_HOURS: UserWorkingHours = {
  monday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  tuesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  wednesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  thursday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  friday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  saturday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
  sunday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
};

export interface RegisterPayloadOverrides {
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  slug?: string;
  name?: string;
  industry?: string;
  defaultTimeZone?: string;
}

/**
 * businesses.owner_id has a real FK to users.id, so every registered
 * business needs a real owning row first. This is pure setup (not what the
 * suite is testing), so it's a direct insert rather than going through the
 * full real /users/register flow.
 */
export async function createOwnerUser(
  ctx: BusinessTestContext,
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

export async function registerPayload(
  ctx: BusinessTestContext,
  overrides: RegisterPayloadOverrides = {},
) {
  const slug = overrides.slug ?? unique('e2e-biz');
  return {
    ownerId: overrides.ownerId ?? (await createOwnerUser(ctx)),
    ownerName: overrides.ownerName ?? 'E2E Test Owner',
    ownerEmail: overrides.ownerEmail ?? `${unique('owner')}@example.com`,
    slug,
    name: overrides.name ?? `E2E Business ${slug}`,
    industry: overrides.industry ?? 'fitness',
    defaultTimeZone: overrides.defaultTimeZone ?? 'America/New_York',
  };
}

/** Registers a real business through the real HTTP endpoint and tracks it for cleanup. */
export async function createBusiness(
  ctx: BusinessTestContext,
  overrides: RegisterPayloadOverrides = {},
): Promise<{ id: string; slug: string; ownerEmail: string }> {
  const payload = await registerPayload(ctx, overrides);

  await request(ctx.app.getHttpServer())
    .post(BUSINESS_ENDPOINTS.REGISTER)
    .send(payload)
    .expect(201);

  const row = await ctx.db
    .selectFrom('businesses')
    .select('id')
    .where('slug', '=', payload.slug)
    .executeTakeFirstOrThrow();

  ctx.createdBusinessIds.push(row.id);
  return { id: row.id, slug: payload.slug, ownerEmail: payload.ownerEmail };
}

export async function getBusiness(
  ctx: BusinessTestContext,
  id: string,
  role: UserRole = 'Platform Owner',
): Promise<SuccessEnvelope<Record<string, unknown>>> {
  const response = await request(ctx.app.getHttpServer())
    .get(endpointFor(BUSINESS_ENDPOINTS.GET_BY_ID, id))
    .set(authHeader(await tokenFor(ctx.sessionCacheService, role)))
    .expect(200);
  return successBody<Record<string, unknown>>(response);
}
