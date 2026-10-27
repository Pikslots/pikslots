import request from 'supertest';
import type { UserRole } from '@pikslots/domain';
import { CLASS_ENDPOINTS } from '@pikslots/shared';

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
import type { ClassTestContext } from './class-test-context';

/** Registers a real owning business through the real Business suite fixtures. */
export async function createOwningBusiness(
  ctx: ClassTestContext,
): Promise<string> {
  const business = await createBusiness(ctx);
  return business.id;
}

export interface ClassPayloadOverrides {
  title?: string;
  description?: string;
  imagesUrls?: string[];
  durationInMins?: number;
  seats?: number;
  cost?: number;
  isHiddenFromBookingPage?: boolean;
  associatedClassGroupIds?: string[];
}

export function registerClassPayload(
  businessId: string,
  overrides: ClassPayloadOverrides = {},
) {
  return {
    title: overrides.title ?? unique('Class'),
    description: overrides.description ?? 'A real e2e test class',
    imagesUrls: overrides.imagesUrls ?? [],
    durationInMins: overrides.durationInMins ?? 60,
    seats: overrides.seats ?? 10,
    cost: overrides.cost ?? 1500,
    isHiddenFromBookingPage: overrides.isHiddenFromBookingPage ?? false,
    associatedClassGroupIds: overrides.associatedClassGroupIds ?? [],
    businessId,
  };
}

/**
 * Registers a real class through the real HTTP endpoint and reads its
 * generated id back out of Postgres -- register only echoes
 * `{ message: 'success' }`. `title` runs through unique() by default
 * specifically so this lookup is unambiguous (there's no DB-level or
 * usecase-level uniqueness constraint on title -- see the register.e2e-test
 * notes -- so two classes really could share a title; unique() here is
 * purely a test-lookup convenience, not relying on any real constraint).
 */
export async function createClass(
  ctx: ClassTestContext,
  businessId: string,
  overrides: ClassPayloadOverrides = {},
  role: UserRole = 'Platform Owner',
  actingBusinessId: string | null = businessId,
): Promise<{ id: string; businessId: string; title: string }> {
  const payload = registerClassPayload(businessId, overrides);

  await request(ctx.app.getHttpServer())
    .post(CLASS_ENDPOINTS.REGISTER)
    .set(
      authHeader(
        await tokenFor(ctx.sessionCacheService, role, actingBusinessId),
      ),
    )
    .send(payload)
    .expect(201);

  const row = await ctx.db
    .selectFrom('classes')
    .select('id')
    .where('business_id', '=', businessId)
    .where('title', '=', payload.title)
    .orderBy('created_at', 'desc')
    .executeTakeFirstOrThrow();

  ctx.createdClassIds.push(row.id);
  return { id: row.id, businessId, title: payload.title };
}

export async function editClass(
  ctx: ClassTestContext,
  classId: string,
  businessId: string,
  overrides: ClassPayloadOverrides = {},
  role: UserRole = 'Platform Owner',
  actingBusinessId: string | null = businessId,
): Promise<SupertestResponse> {
  const payload = registerClassPayload(businessId, overrides);
  return request(ctx.app.getHttpServer())
    .patch(endpointFor(CLASS_ENDPOINTS.UPDATE, { classId }))
    .set(
      authHeader(
        await tokenFor(ctx.sessionCacheService, role, actingBusinessId),
      ),
    )
    .send(payload);
}

export async function deleteClass(
  ctx: ClassTestContext,
  classId: string,
  role: UserRole = 'Platform Owner',
  actingBusinessId: string | null = null,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .delete(endpointFor(CLASS_ENDPOINTS.DELETE, { classId }))
    .set(
      authHeader(
        await tokenFor(ctx.sessionCacheService, role, actingBusinessId),
      ),
    );
}

export async function findAllClassesByBusiness(
  ctx: ClassTestContext,
  businessId: string,
  role: UserRole = 'Platform Owner',
  actingBusinessId: string | null = businessId,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .get(endpointFor(CLASS_ENDPOINTS.FIND_ALL_BY_BUSINESS, { businessId }))
    .set(
      authHeader(
        await tokenFor(ctx.sessionCacheService, role, actingBusinessId),
      ),
    );
}

export { successBody, errorBody };
export type { SuccessEnvelope, ErrorEnvelope };
