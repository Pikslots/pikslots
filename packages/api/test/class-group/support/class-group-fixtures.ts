import request from 'supertest';
import type { UserRole } from '@pikslots/domain';
import { CLASS_GROUP_ENDPOINTS } from '@pikslots/shared';

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
import type { ClassGroupTestContext } from './class-group-test-context';

export async function createOwningBusiness(
  ctx: ClassGroupTestContext,
): Promise<string> {
  const business = await createBusiness(ctx);
  return business.id;
}

export interface ClassGroupPayloadOverrides {
  name?: string;
  associatedClasses?: string[];
}

export function registerClassGroupPayload(
  businessId: string,
  overrides: ClassGroupPayloadOverrides = {},
) {
  return {
    name: overrides.name ?? unique('ClassGroup'),
    businessId,
    associatedClasses: overrides.associatedClasses ?? [],
  };
}

/**
 * Registers a real class group through the real HTTP endpoint and reads
 * its generated id back out of Postgres -- register only echoes
 * `{ message: 'success' }`. Unlike Class's title, `name` here has a REAL
 * DB unique index on (business_id, name), so this lookup is guaranteed
 * unambiguous without needing unique() as a mere convention.
 */
export async function createClassGroup(
  ctx: ClassGroupTestContext,
  businessId: string,
  overrides: ClassGroupPayloadOverrides = {},
  role: UserRole = 'Platform Owner',
  actingBusinessId: string | null = businessId,
): Promise<{ id: string; businessId: string; name: string }> {
  const payload = registerClassGroupPayload(businessId, overrides);

  await request(ctx.app.getHttpServer())
    .post(CLASS_GROUP_ENDPOINTS.REGISTER)
    .set(
      authHeader(
        await tokenFor(ctx.sessionCacheService, role, actingBusinessId),
      ),
    )
    .send(payload)
    .expect(201);

  const row = await ctx.db
    .selectFrom('class_groups')
    .select('id')
    .where('business_id', '=', businessId)
    .where('name', '=', payload.name)
    .executeTakeFirstOrThrow();

  ctx.createdClassGroupIds.push(row.id);
  return { id: row.id, businessId, name: payload.name };
}

export interface EditClassGroupPayloadOverrides {
  name: string;
  classIds?: string[];
}

export async function editClassGroup(
  ctx: ClassGroupTestContext,
  classGroupId: string,
  businessId: string,
  overrides: EditClassGroupPayloadOverrides,
  role: UserRole = 'Platform Owner',
  actingBusinessId: string | null = businessId,
): Promise<SupertestResponse> {
  const payload = {
    name: overrides.name,
    businessId,
    classIds: overrides.classIds ?? [],
  };
  return request(ctx.app.getHttpServer())
    .patch(endpointFor(CLASS_GROUP_ENDPOINTS.EDIT, { classGroupId }))
    .set(
      authHeader(
        await tokenFor(ctx.sessionCacheService, role, actingBusinessId),
      ),
    )
    .send(payload);
}

export async function deleteClassGroup(
  ctx: ClassGroupTestContext,
  classGroupId: string,
  role: UserRole = 'Platform Owner',
  actingBusinessId: string | null = null,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .delete(endpointFor(CLASS_GROUP_ENDPOINTS.DELETE, { classGroupId }))
    .set(
      authHeader(
        await tokenFor(ctx.sessionCacheService, role, actingBusinessId),
      ),
    );
}

export async function findAllClassGroupsByBusiness(
  ctx: ClassGroupTestContext,
  businessId: string,
  role: UserRole = 'Platform Owner',
  actingBusinessId: string | null = businessId,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .get(
      endpointFor(CLASS_GROUP_ENDPOINTS.FIND_ALL_BY_BUSINESS, { businessId }),
    )
    .set(
      authHeader(
        await tokenFor(ctx.sessionCacheService, role, actingBusinessId),
      ),
    );
}

export { successBody, errorBody };
export type { SuccessEnvelope, ErrorEnvelope };
