import request from 'supertest';
import type { UserRole } from '@pikslots/domain';
import { CUSTOMER_ENDPOINTS } from '@pikslots/shared';

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
import type { CustomerTestContext } from './customer-test-context';

/**
 * All social-link keys are required on the DTO (@IsObject with no
 * @IsOptional), so every payload needs the full shape even when unused.
 */
export const EMPTY_SOCIAL_LINKS: Record<string, string> = {
  Website: '',
  Instagram: '',
  Facebook: '',
  Tiktok: '',
  X: '',
  Youtube: '',
  LinkedIn: '',
};

export interface RegisterCustomerPayloadOverrides {
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string | null;
  email?: string | null;
  additionalEmail?: string | null;
  primaryPhone?: string | null;
  additionalPhone?: string | null;
  company?: string | null;
  country?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  notes?: string | null;
  customerSocialLinks?: Record<string, string>;
}

/**
 * Builds a real RegisterCustomerDto payload.
 *
 * profileImageUrl defaults to '' (not null): CustomerResponseMapper treats
 * '' as "no image" but null falls through to a presign call instead (see
 * session notes) — using '' here keeps these fixtures on the known-good
 * path unless a test is specifically exercising that edge case.
 */
export function registerCustomerPayload(
  businessId: string,
  overrides: RegisterCustomerPayloadOverrides = {},
) {
  const suffix = unique('cust');
  return {
    firstName: overrides.firstName ?? 'E2E',
    lastName: overrides.lastName ?? 'Customer',
    profileImageUrl:
      overrides.profileImageUrl === undefined ? '' : overrides.profileImageUrl,
    email:
      overrides.email === undefined ? `${suffix}@example.com` : overrides.email,
    additionalEmail: overrides.additionalEmail ?? null,
    primaryPhone: overrides.primaryPhone ?? null,
    additionalPhone: overrides.additionalPhone ?? null,
    company: overrides.company ?? null,
    country: overrides.country ?? null,
    address: overrides.address ?? null,
    city: overrides.city ?? null,
    state: overrides.state ?? null,
    zipCode: overrides.zipCode ?? null,
    notes: overrides.notes ?? null,
    customerSocialLinks: overrides.customerSocialLinks ?? EMPTY_SOCIAL_LINKS,
    businessId,
  };
}

/** Registers a real owning business through the real Business suite fixtures. */
export async function createOwningBusiness(
  ctx: CustomerTestContext,
): Promise<string> {
  const business = await createBusiness(ctx);
  return business.id;
}

/**
 * Registers a real customer through the real HTTP endpoint and reads its
 * generated id back out of the DB — the register response only echoes
 * `{ message: 'success' }`, the same shape as Business's register endpoint,
 * so the (business_id, email) unique index is the only way back to the id.
 */
export async function createCustomer(
  ctx: CustomerTestContext,
  businessId: string,
  overrides: RegisterCustomerPayloadOverrides = {},
  role: UserRole = 'Platform Owner',
): Promise<{ id: string; email: string | null; businessId: string }> {
  const payload = registerCustomerPayload(businessId, overrides);

  await request(ctx.app.getHttpServer())
    .post(CUSTOMER_ENDPOINTS.REGISTER)
    .set(authHeader(await tokenFor(ctx.sessionCacheService, role, businessId)))
    .send(payload)
    .expect(201);

  let query = ctx.db
    .selectFrom('customers')
    .select('id')
    .where('business_id', '=', businessId)
    .where('first_name', '=', payload.firstName)
    .where('last_name', '=', payload.lastName)
    .orderBy('created_at', 'desc');

  query =
    payload.email === null
      ? query.where('email', 'is', null)
      : query.where('email', '=', payload.email);

  const row = await query.executeTakeFirstOrThrow();

  return { id: row.id, email: payload.email, businessId };
}

export async function getCustomerById(
  ctx: CustomerTestContext,
  customerId: string,
  role: UserRole = 'Platform Owner',
  businessId: string | null = null,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .get(endpointFor(CUSTOMER_ENDPOINTS.FIND_BY_ID, { customerId }))
    .set(authHeader(await tokenFor(ctx.sessionCacheService, role, businessId)));
}

export async function editCustomer(
  ctx: CustomerTestContext,
  customerId: string,
  businessId: string,
  overrides: RegisterCustomerPayloadOverrides = {},
  role: UserRole = 'Platform Owner',
  actingBusinessId: string | null = businessId,
): Promise<SupertestResponse> {
  const payload = registerCustomerPayload(businessId, overrides);
  return request(ctx.app.getHttpServer())
    .patch(endpointFor(CUSTOMER_ENDPOINTS.EDIT, { customerId }))
    .set(
      authHeader(
        await tokenFor(ctx.sessionCacheService, role, actingBusinessId),
      ),
    )
    .send(payload);
}

export async function deleteCustomer(
  ctx: CustomerTestContext,
  customerId: string,
  role: UserRole = 'Platform Owner',
  businessId: string | null = null,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .delete(endpointFor(CUSTOMER_ENDPOINTS.DELETE, { customerId }))
    .set(authHeader(await tokenFor(ctx.sessionCacheService, role, businessId)));
}

export async function findAllCustomersByBusiness(
  ctx: CustomerTestContext,
  businessId: string,
  role: UserRole = 'Platform Owner',
  actingBusinessId: string | null = businessId,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .get(endpointFor(CUSTOMER_ENDPOINTS.FIND_ALL_BY_BUSINESS, { businessId }))
    .set(
      authHeader(
        await tokenFor(ctx.sessionCacheService, role, actingBusinessId),
      ),
    );
}

export async function updateCustomerProfileImage(
  ctx: CustomerTestContext,
  customerId: string,
  profileImageKey: string,
  role: UserRole = 'Platform Owner',
  businessId: string | null = null,
): Promise<SupertestResponse> {
  return request(ctx.app.getHttpServer())
    .patch(endpointFor(CUSTOMER_ENDPOINTS.UPDATE_PROFILE_IMAGE, { customerId }))
    .set(authHeader(await tokenFor(ctx.sessionCacheService, role, businessId)))
    .send({ profileImageKey });
}

export { successBody, errorBody };
export type { SuccessEnvelope, ErrorEnvelope };
