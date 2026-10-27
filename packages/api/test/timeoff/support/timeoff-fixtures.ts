import request from 'supertest';
import { v7 as uuidv7 } from 'uuid';
import type { UserRole, UserWorkingHours } from '@pikslots/domain';
import { TIMEOFF_ENDPOINTS } from '@pikslots/shared';

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
import { createBusiness } from '../../business/support/business-fixtures';
import type { TimeoffTestContext } from './timeoff-test-context';

const DEFAULT_WORKING_HOURS: UserWorkingHours = {
  monday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  tuesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  wednesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  thursday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  friday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  saturday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
  sunday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
};

/** Registers a real owning business through the real Business suite fixtures. */
export async function createOwningBusiness(
  ctx: TimeoffTestContext,
): Promise<string> {
  const business = await createBusiness(ctx);
  return business.id;
}

/**
 * Inserts a real staff user directly (this suite isn't testing user
 * registration), tracked for cleanup.
 *
 * IMPORTANT: uses uuid's v7() rather than node:crypto's randomUUID(),
 * unlike Business's createOwnerUser. RegisterTimeoffDto validates `userId`
 * with @PikSlotsUUIDValidation() which is strictly IsUUID(7) -- a v4 id
 * (like createOwnerUser produces) would fail DTO validation with a 400 the
 * moment it's used as a timeoff's userId. EditTimeoffDto is inconsistent
 * with this (plain @IsUUID(), any version) but there's no reason to rely on
 * that gap, so every user created here is a real v7 id regardless of which
 * endpoint it'll be used against.
 */
export async function createStaffUser(
  ctx: TimeoffTestContext,
  businessId: string,
  role: UserRole = 'Standard',
): Promise<{ id: string; email: string }> {
  const id = uuidv7();
  // Derived from this row's own fresh uuidv7 `id`, NOT from unique(): a
  // uuidv7's first ~11-12 hex chars are a millisecond timestamp, so two
  // calls a few ms apart (e.g. two createStaffUser calls back to back in
  // the same beforeAll) share that prefix. Taking the LAST 16 hex chars
  // instead guarantees we're reading from the random portion of the uuid,
  // not the shared timestamp portion -- so no cross-call collision.
  const suffix = id.replace(/-/g, '').slice(-16);

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

export interface TimeoffPayloadOverrides {
  title?: string;
  startDateTime?: string;
  endDateTime?: string;
  allDay?: boolean;
  timeZone?: string;
  recurrence?: string | null;
}

export function registerTimeoffPayload(
  userId: string,
  businessId: string,
  overrides: TimeoffPayloadOverrides = {},
) {
  return {
    title: overrides.title ?? unique('Timeoff'),
    userId,
    businessId,
    startDateTime: overrides.startDateTime ?? '2026-06-16T10:00:00.000Z',
    endDateTime: overrides.endDateTime ?? '2026-06-20T10:00:00.000Z',
    allDay: overrides.allDay ?? false,
    timeZone: overrides.timeZone ?? 'America/New_York',
    recurrence: overrides.recurrence ?? null,
  };
}

/**
 * Registers a real timeoff through the real HTTP endpoint and reads its
 * generated id back out of the DB (register only echoes
 * `{ message: 'success' }`). `title` is run through unique() by default
 * specifically so this lookup is unambiguous.
 */
export async function createTimeoff(
  ctx: TimeoffTestContext,
  userId: string,
  businessId: string,
  overrides: TimeoffPayloadOverrides = {},
  role: UserRole = 'Platform Owner',
  actingUserId: string = userId,
  actingBusinessId: string | null = businessId,
): Promise<{ id: string; userId: string; businessId: string; title: string }> {
  const payload = registerTimeoffPayload(userId, businessId, overrides);

  await request(ctx.app.getHttpServer())
    .post(TIMEOFF_ENDPOINTS.REGISTER)
    .set(
      authHeader(
        await tokenFor(
          ctx.sessionCacheService,
          role,
          actingBusinessId,
          actingUserId,
        ),
      ),
    )
    .send(payload)
    .expect(201);

  const row = await ctx.db
    .selectFrom('timeoffs')
    .select('id')
    .where('user_id', '=', userId)
    .where('business_id', '=', businessId)
    .where('title', '=', payload.title)
    .orderBy('created_at', 'desc')
    .executeTakeFirstOrThrow();

  ctx.createdTimeoffIds.push(row.id);
  return { id: row.id, userId, businessId, title: payload.title };
}

export async function getTimeoffById(
  ctx: TimeoffTestContext,
  timeoffId: string,
  role: UserRole = 'Platform Owner',
  actingUserId: string | null = null,
  actingBusinessId: string | null = null,
): Promise<SupertestResponse> {
  return (
    request(ctx.app.getHttpServer())
      // The route's own @Param name is 'findById', not 'id' -- confirmed via
      // both the controller and its @ApiParam Swagger docs.
      .get(endpointFor(TIMEOFF_ENDPOINTS.FIND, { findById: timeoffId }))
      .set(
        authHeader(
          await tokenFor(
            ctx.sessionCacheService,
            role,
            actingBusinessId,
            actingUserId,
          ),
        ),
      )
  );
}

export async function findAllTimeoffsByUser(
  ctx: TimeoffTestContext,
  userId: string,
  businessId: string,
  role: UserRole = 'Platform Owner',
  actingUserId: string | null = userId,
  actingBusinessId: string | null = businessId,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .get(endpointFor(TIMEOFF_ENDPOINTS.FINDALL, { userId, businessId }))
    .set(
      authHeader(
        await tokenFor(
          ctx.sessionCacheService,
          role,
          actingBusinessId,
          actingUserId,
        ),
      ),
    );
}

/**
 * EditTimeoffDto has its own `id` field (@IsNotEmpty @IsUUID, any version)
 * that is validated but then silently discarded by the controller -- the
 * actual id used comes from `@Param('id')`, not `dto.id`. Similarly,
 * `dto.userId`/`dto.businessId` are required by the DTO (plain @IsUUID(),
 * any version -- unlike RegisterTimeoffDto's @PikSlotsUUIDValidation()
 * which is strictly v7) but the use case never reads command.userId or
 * command.businessId: authorization and the record's own userId/businessId
 * are both re-derived from the existing row via findById, and update()
 * only touches title/startDateTime/endDateTime/allDay/timeZone/recurrence.
 * A body missing any of these still fails DTO validation with 400, so
 * placeholder-but-valid UUIDs are sent for both regardless of what the
 * real record's userId/businessId are.
 */
export async function editTimeoff(
  ctx: TimeoffTestContext,
  timeoffId: string,
  businessId: string,
  overrides: TimeoffPayloadOverrides = {},
  role: UserRole = 'Platform Owner',
  actingUserId: string | null = null,
  actingBusinessId: string | null = businessId,
): Promise<SupertestResponse> {
  const payload = {
    id: timeoffId,
    ...registerTimeoffPayload(uuidv7(), businessId, overrides),
  };

  return request(ctx.app.getHttpServer())
    .patch(endpointFor(TIMEOFF_ENDPOINTS.UPDATE, { id: timeoffId }))
    .set(
      authHeader(
        await tokenFor(
          ctx.sessionCacheService,
          role,
          actingBusinessId,
          actingUserId,
        ),
      ),
    )
    .send(payload);
}

export async function deleteTimeoff(
  ctx: TimeoffTestContext,
  timeoffId: string,
  role: UserRole = 'Platform Owner',
  actingUserId: string | null = null,
  actingBusinessId: string | null = null,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .delete(endpointFor(TIMEOFF_ENDPOINTS.DELETE, { id: timeoffId }))
    .set(
      authHeader(
        await tokenFor(
          ctx.sessionCacheService,
          role,
          actingBusinessId,
          actingUserId,
        ),
      ),
    );
}

export { successBody, errorBody };
export type { SuccessEnvelope, ErrorEnvelope };
