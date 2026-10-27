import request from 'supertest';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { endpointFor } from '../common/endpoint-path';
import { authHeader, tokenFor } from '../common/auth';
import { setupBusinessTestContext } from './support/business-test-context';
import { createBusiness, getBusiness } from './support/business-fixtures';

describe(`PATCH ${BUSINESS_ENDPOINTS.UPDATE_BUSINESS_HOURS}`, () => {
  const ctx = setupBusinessTestContext();
  let businessId: string;

  beforeAll(async () => {
    const business = await createBusiness(ctx);
    businessId = business.id;
  });

  it('updates business hours and persists them for real', async () => {
    const day = { enabled: true, openTime: '08:00', closeTime: '18:00' };

    await request(ctx.app.getHttpServer())
      .patch(endpointFor(BUSINESS_ENDPOINTS.UPDATE_BUSINESS_HOURS, businessId))
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin')))
      .send({
        monday: day,
        tuesday: day,
        wednesday: day,
        thursday: day,
        friday: day,
        saturday: { enabled: false, openTime: '00:00', closeTime: '00:00' },
        sunday: { enabled: false, openTime: '00:00', closeTime: '00:00' },
      })
      .expect(200);

    const body = await getBusiness(ctx, businessId);
    const hours = body.data.businessHours as { monday: { openTime: string } };
    expect(hours.monday.openTime).toBe('08:00');
  });
});
