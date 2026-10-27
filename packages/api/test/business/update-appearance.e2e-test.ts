import request from 'supertest';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { endpointFor } from '../common/endpoint-path';
import { authHeader, tokenFor } from '../common/auth';
import { setupBusinessTestContext } from './support/business-test-context';
import { createBusiness, getBusiness } from './support/business-fixtures';

describe(`PATCH ${BUSINESS_ENDPOINTS.UPDATE_APPEARANCE}`, () => {
  const ctx = setupBusinessTestContext();
  let businessId: string;

  beforeAll(async () => {
    const business = await createBusiness(ctx);
    businessId = business.id;
  });

  it('updates appearance and persists it for real', async () => {
    await request(ctx.app.getHttpServer())
      .patch(endpointFor(BUSINESS_ENDPOINTS.UPDATE_APPEARANCE, businessId))
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin')))
      .send({
        brandColor: '#336699',
        brandButtonShape: 'pill',
        theme: 'dark',
        gallaryPhotosUrls: [],
      })
      .expect(200);

    const body = await getBusiness(ctx, businessId);
    const appearance = body.data.brandAppearanceDetails as {
      brandColor: string;
      theme: string;
    };
    expect(appearance.brandColor).toBe('#336699');
    expect(appearance.theme).toBe('dark');
  });
});
