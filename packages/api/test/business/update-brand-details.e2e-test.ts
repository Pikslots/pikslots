import request from 'supertest';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { unique } from '../common/unique-id';
import { endpointFor } from '../common/endpoint-path';
import { authHeader, tokenFor } from '../common/auth';
import { setupBusinessTestContext } from './support/business-test-context';
import { createBusiness, getBusiness } from './support/business-fixtures';

describe(`PATCH ${BUSINESS_ENDPOINTS.UPDATE_BRAND_DETAILS}`, () => {
  const ctx = setupBusinessTestContext();

  function payload(overrides: Record<string, unknown> = {}) {
    return {
      bannerImageUrl: '',
      logoUrl: '',
      name: 'E2E Brand Details Business',
      slug: unique('e2e-brand-details'),
      industry: 'fitness',
      about: 'Updated description',
      ...overrides,
    };
  }

  it('updates brand details and persists them for real', async () => {
    const business = await createBusiness(ctx);
    const newSlug = unique('e2e-brand-details-updated');

    await request(ctx.app.getHttpServer())
      .patch(endpointFor(BUSINESS_ENDPOINTS.UPDATE_BRAND_DETAILS, business.id))
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Business Owner')))
      .send(payload({ slug: newSlug }))
      .expect(200);

    const body = await getBusiness(ctx, business.id);
    expect(body.data.name).toBe('E2E Brand Details Business');
    expect(body.data.slug).toBe(newSlug);
  });

  it('returns 409 when the new slug collides with another real business', async () => {
    const business = await createBusiness(ctx);
    const takenSlug = (await createBusiness(ctx)).slug;

    await request(ctx.app.getHttpServer())
      .patch(endpointFor(BUSINESS_ENDPOINTS.UPDATE_BRAND_DETAILS, business.id))
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Business Owner')))
      .send(payload({ slug: takenSlug }))
      .expect(409);
  });

  it('returns 400 for an invalid industry value', async () => {
    const business = await createBusiness(ctx);

    await request(ctx.app.getHttpServer())
      .patch(endpointFor(BUSINESS_ENDPOINTS.UPDATE_BRAND_DETAILS, business.id))
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Business Owner')))
      .send(payload({ industry: 'not-a-real-industry' }))
      .expect(400);
  });
});
