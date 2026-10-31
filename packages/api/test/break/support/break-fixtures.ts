import request from 'supertest';
import { randomUUID } from 'node:crypto';
import type { UserRole, UserWorkingHours, WeekDay } from '@pikslots/domain';
import { BREAK_ENDPOINTS, BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { unique } from '../../common/unique-id';
import { endpointFor } from '../../common/endpoint-path';
import { authHeader, tokenFor } from '../../common/auth';
import type { BreakTestContext } from './break-test-context';

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
  ctx: BreakTestContext,
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
  ctx: BreakTestContext,
): Promise<{ id: string; ownerId: string }> {
  const ownerId = await insertUser(ctx, null, 'Business Owner');
  const slug = unique('e2e-break-biz');

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

/** Inserts a real user row directly under the given business (bypasses the invite flow, which isn't what this suite is testing). */
export async function createUser(
  ctx: BreakTestContext,
  businessId: string,
  role: UserRole = 'Standard',
): Promise<string> {
  return insertUser(ctx, businessId, role);
}

// ── Break create/update ──────────────────────────────────────────────────

export interface BreakPayload {
  day: WeekDay;
  startTime: string;
  endTime: string;
  userId: string;
  businessId: string;
}

export function breakPayload(
  overrides: Partial<BreakPayload> &
    Pick<BreakPayload, 'userId' | 'businessId'>,
): BreakPayload {
  return {
    day: overrides.day ?? 'monday',
    startTime: overrides.startTime ?? '09:00',
    endTime: overrides.endTime ?? '09:30',
    userId: overrides.userId,
    businessId: overrides.businessId,
  };
}

/** Creates a real break through the real HTTP endpoint (as the given actor) and resolves its row id, since the endpoint only echoes {message:'success'}. */
export async function createBreak(
  ctx: BreakTestContext,
  payload: BreakPayload,
  actorToken: string,
): Promise<{ id: string } & BreakPayload> {
  await request(ctx.app.getHttpServer())
    .post(BREAK_ENDPOINTS.CREATE)
    .set(authHeader(actorToken))
    .send(payload)
    .expect(201);

  const row = await ctx.db
    .selectFrom('breaks')
    .select('id')
    .where('user_id', '=', payload.userId)
    .where('day', '=', payload.day)
    .where('start_time', '=', payload.startTime)
    .where('end_time', '=', payload.endTime)
    .where('is_deleted', '=', false)
    .executeTakeFirstOrThrow();

  return { id: row.id, ...payload };
}

// ── Endpoint path helpers ────────────────────────────────────────────────

export function findByIdPath(breakId: string): string {
  return endpointFor(BREAK_ENDPOINTS.FIND_BY_ID, { breakId });
}

export function updatePath(breakId: string): string {
  return endpointFor(BREAK_ENDPOINTS.UPDATE, { breakId });
}

export function deletePath(breakId: string): string {
  return endpointFor(BREAK_ENDPOINTS.DELETE, { breakId });
}

export function findAllByUserPath(userId: string, businessId: string): string {
  return endpointFor(BREAK_ENDPOINTS.FIND_ALL_BY_USER, {
    userId,
    businessId,
  });
}

export async function tokenForRole(
  ctx: BreakTestContext,
  role: UserRole,
  businessId: string | null = null,
  userId?: string,
): Promise<string> {
  return tokenFor(ctx.sessionCacheService, role, businessId, userId);
}
