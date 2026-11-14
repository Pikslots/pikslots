import request from 'supertest';
import { ONBOARDING_ENDPOINTS } from '@pikslots/shared';

import { successBody, errorBody } from '../common/http-envelope';
import { setupOnboardingTestContext } from './support/onboarding-test-context';
import {
  completeOnboarding,
  completePayload,
} from './support/onboarding-fixtures';

describe(`POST ${ONBOARDING_ENDPOINTS.ONBOARDING_COMPLETE}`, () => {
  const ctx = setupOnboardingTestContext();

  it('persists the platform owner, business owner and business rows in Postgres', async () => {
    const { response, payload, platformOwnerId, businessOwnerId, businessId } =
      await completeOnboarding(ctx);

    expect(successBody(response).data).toEqual({ message: 'success' });

    const platformOwner = await ctx.db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', platformOwnerId)
      .executeTakeFirstOrThrow();

    expect(platformOwner.username).toBe(payload.platformOwner.username);
    expect(platformOwner.email).toBe(payload.platformOwner.email);
    expect(platformOwner.role).toBe('Platform Owner');
    expect(platformOwner.business_id).toBe(businessId);
    expect(platformOwner.created_by).toBe(platformOwnerId);

    const businessOwner = await ctx.db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', businessOwnerId)
      .executeTakeFirstOrThrow();

    expect(businessOwner.username).toBe(payload.businessOwner.username);
    expect(businessOwner.email).toBe(payload.businessOwner.email);
    expect(businessOwner.role).toBe('Business Owner');
    expect(businessOwner.business_id).toBe(businessId);
    expect(businessOwner.created_by).toBe(platformOwnerId);

    const business = await ctx.db
      .selectFrom('businesses')
      .selectAll()
      .where('id', '=', businessId)
      .executeTakeFirstOrThrow();

    expect(business.slug).toBe(payload.business.slug);
    expect(business.name).toBe(payload.business.name);
    expect(business.industry).toBe(payload.business.industry);
    expect(business.owner_id).toBe(businessOwnerId);
    expect(business.status).toBe('pending_setup');
    expect(business.created_by).toBe(platformOwnerId);
  });

  it('returns 409 when the platform owner email is already registered', async () => {
    const { payload } = await completeOnboarding(ctx);

    const response = await request(ctx.app.getHttpServer())
      .post(ONBOARDING_ENDPOINTS.ONBOARDING_COMPLETE)
      .send(payload)
      .expect(409);

    expect(errorBody(response).statusCode).toBe(409);
  });

  it('returns 409 when the business slug is already taken', async () => {
    const { payload } = await completeOnboarding(ctx);

    const response = await request(ctx.app.getHttpServer())
      .post(ONBOARDING_ENDPOINTS.ONBOARDING_COMPLETE)
      .send(completePayload({ businessSlug: payload.business.slug }))
      .expect(409);

    expect(errorBody(response).statusCode).toBe(409);
  });

  it('returns 400 for an invalid payload', async () => {
    const response = await request(ctx.app.getHttpServer())
      .post(ONBOARDING_ENDPOINTS.ONBOARDING_COMPLETE)
      .send({})
      .expect(400);

    expect(errorBody(response).statusCode).toBe(400);
    expect(typeof errorBody(response).message).toBe('string');
  });
});
