import request from 'supertest';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { successBody } from '../common/http-envelope';
import { authHeader, tokenFor } from '../common/auth';
import { setupBusinessTestContext } from './support/business-test-context';
import { createBusiness } from './support/business-fixtures';

describe(`GET ${BUSINESS_ENDPOINTS.GET_ALL}`, () => {
  const ctx = setupBusinessTestContext();

  it('includes a freshly registered business for a Platform Owner', async () => {
    const business = await createBusiness(ctx);

    const response = await request(ctx.app.getHttpServer())
      .get(BUSINESS_ENDPOINTS.GET_ALL)
      .set(
        authHeader(await tokenFor(ctx.sessionCacheService, 'Platform Owner')),
      )
      .expect(200);

    const ids = successBody<Array<{ id: string }>>(response).data.map(
      (b) => b.id,
    );
    expect(ids).toContain(business.id);
  });

  it('returns 403 for a role other than Platform Owner', async () => {
    await request(ctx.app.getHttpServer())
      .get(BUSINESS_ENDPOINTS.GET_ALL)
      .set(
        authHeader(await tokenFor(ctx.sessionCacheService, 'Business Owner')),
      )
      .expect(403);
  });
});
