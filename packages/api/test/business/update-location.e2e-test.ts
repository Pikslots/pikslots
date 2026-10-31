import request from 'supertest';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { endpointFor } from '../common/endpoint-path';
import { authHeader, tokenFor } from '../common/auth';
import { setupBusinessTestContext } from './support/business-test-context';
import { createBusiness, getBusiness } from './support/business-fixtures';

describe(`PATCH ${BUSINESS_ENDPOINTS.UPDATE_LOCATION}`, () => {
  const ctx = setupBusinessTestContext();
  let businessId: string;

  beforeAll(async () => {
    const business = await createBusiness(ctx);
    businessId = business.id;
  });

  it('updates location and persists it for real', async () => {
    await request(ctx.app.getHttpServer())
      .patch(endpointFor(BUSINESS_ENDPOINTS.UPDATE_LOCATION, businessId))
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin')))
      .send({
        address: '1 Test Street',
        city: 'Testville',
        state: 'TS',
        zip: '00000',
        country: 'Testland',
        currency: 'USD',
        timeZone: 'America/New_York',
      })
      .expect(200);

    const body = await getBusiness(ctx, businessId);
    const location = body.data.locationDetails as { city: string };
    expect(location.city).toBe('Testville');
  });
});
