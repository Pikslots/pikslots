import request from 'supertest';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { endpointFor } from '../common/endpoint-path';
import { authHeader, tokenFor } from '../common/auth';
import { setupBusinessTestContext } from './support/business-test-context';
import { createBusiness, getBusiness } from './support/business-fixtures';

describe(`PATCH ${BUSINESS_ENDPOINTS.UPDATE_BUSINESS_LINKS}`, () => {
  const ctx = setupBusinessTestContext();
  let businessId: string;

  beforeAll(async () => {
    const business = await createBusiness(ctx);
    businessId = business.id;
  });

  it('updates business links and persists them for real', async () => {
    await request(ctx.app.getHttpServer())
      .patch(endpointFor(BUSINESS_ENDPOINTS.UPDATE_BUSINESS_LINKS, businessId))
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin')))
      .send({
        Website: 'https://example.com',
        Instagram: 'https://instagram.com/e2e',
        Facebook: '',
        Tiktok: '',
        X: '',
        Youtube: '',
        LinkedIn: '',
      })
      .expect(200);

    const body = await getBusiness(ctx, businessId);
    const links = body.data.businessLinks as { Website: string };
    expect(links.Website).toBe('https://example.com');
  });
});
