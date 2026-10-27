import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { endpointFor } from '../common/endpoint-path';
import { authHeader, tokenFor } from '../common/auth';
import { setupBusinessTestContext } from './support/business-test-context';
import { createBusiness, getBusiness } from './support/business-fixtures';

describe(`GET ${BUSINESS_ENDPOINTS.GET_BY_ID}`, () => {
  const ctx = setupBusinessTestContext();

  it('returns the real persisted business', async () => {
    const business = await createBusiness(ctx);

    const body = await getBusiness(ctx, business.id);
    expect(body.data.id).toBe(business.id);
    expect(body.data.slug).toBe(business.slug);
  });

  it('returns 404 for an unknown business id', async () => {
    await request(ctx.app.getHttpServer())
      .get(endpointFor(BUSINESS_ENDPOINTS.GET_BY_ID, randomUUID()))
      .set(
        authHeader(await tokenFor(ctx.sessionCacheService, 'Platform Owner')),
      )
      .expect(404);
  });

  it('returns 401 when no Authorization header is sent', async () => {
    const business = await createBusiness(ctx);
    await request(ctx.app.getHttpServer())
      .get(endpointFor(BUSINESS_ENDPOINTS.GET_BY_ID, business.id))
      .expect(401);
  });

  it('returns 403 for a role outside the allowed list', async () => {
    const business = await createBusiness(ctx);
    await request(ctx.app.getHttpServer())
      .get(endpointFor(BUSINESS_ENDPOINTS.GET_BY_ID, business.id))
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'No Access')))
      .expect(403);
  });

  it('returns 403 when the business is suspended', async () => {
    const business = await createBusiness(ctx);
    await ctx.db
      .updateTable('businesses')
      .set({ status: 'suspended', suspended_reason: 'e2e test' })
      .where('id', '=', business.id)
      .execute();

    await request(ctx.app.getHttpServer())
      .get(endpointFor(BUSINESS_ENDPOINTS.GET_BY_ID, business.id))
      .set(
        authHeader(await tokenFor(ctx.sessionCacheService, 'Platform Owner')),
      )
      .expect(403);
  });

  it('returns 403 when the business is inactive', async () => {
    const business = await createBusiness(ctx);
    await ctx.db
      .updateTable('businesses')
      .set({ status: 'inactive' })
      .where('id', '=', business.id)
      .execute();

    await request(ctx.app.getHttpServer())
      .get(endpointFor(BUSINESS_ENDPOINTS.GET_BY_ID, business.id))
      .set(
        authHeader(await tokenFor(ctx.sessionCacheService, 'Platform Owner')),
      )
      .expect(403);
  });
});
