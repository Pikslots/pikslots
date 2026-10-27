import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { endpointFor } from '../common/endpoint-path';
import { authHeader, tokenFor } from '../common/auth';
import { setupBusinessTestContext } from './support/business-test-context';
import { createBusiness, getBusiness } from './support/business-fixtures';

describe(`PATCH ${BUSINESS_ENDPOINTS.UPDATE_VISIBILITY}`, () => {
  const ctx = setupBusinessTestContext();
  let businessId: string;

  beforeAll(async () => {
    const business = await createBusiness(ctx);
    businessId = business.id;
  });

  it('updates visibility for an authorized role', async () => {
    await request(ctx.app.getHttpServer())
      .patch(endpointFor(BUSINESS_ENDPOINTS.UPDATE_VISIBILITY, businessId))
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Business Owner')))
      .send({ appearInSearchResults: true })
      .expect(200);

    const body = await getBusiness(ctx, businessId);
    expect(body.data.appearInSearchResults).toBe(true);
  });

  // These guard/validation/not-found checks are generic RolesGuard and
  // ValidationPipe behavior (not specific to visibility), so they're only
  // exercised once here rather than duplicated across every PATCH endpoint.

  it('returns 404 for an unknown business', async () => {
    await request(ctx.app.getHttpServer())
      .patch(endpointFor(BUSINESS_ENDPOINTS.UPDATE_VISIBILITY, randomUUID()))
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin')))
      .send({ appearInSearchResults: true })
      .expect(404);
  });

  it('returns 400 when the payload fails validation', async () => {
    await request(ctx.app.getHttpServer())
      .patch(endpointFor(BUSINESS_ENDPOINTS.UPDATE_VISIBILITY, businessId))
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin')))
      .send({ appearInSearchResults: 'not-a-boolean' })
      .expect(400);
  });

  it('returns 403 for a role outside the allowed list', async () => {
    await request(ctx.app.getHttpServer())
      .patch(endpointFor(BUSINESS_ENDPOINTS.UPDATE_VISIBILITY, businessId))
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Standard')))
      .send({ appearInSearchResults: true })
      .expect(403);
  });
});
