import request from 'supertest';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { endpointFor } from '../common/endpoint-path';
import { authHeader, tokenFor } from '../common/auth';
import { setupBusinessTestContext } from './support/business-test-context';
import { createBusiness, getBusiness } from './support/business-fixtures';

describe(`PATCH ${BUSINESS_ENDPOINTS.UPDATE_BOOKING_POLICIES}`, () => {
  const ctx = setupBusinessTestContext();
  let businessId: string;

  beforeAll(async () => {
    const business = await createBusiness(ctx);
    businessId = business.id;
  });

  it('updates booking policies and persists them for real', async () => {
    await request(ctx.app.getHttpServer())
      .patch(
        endpointFor(BUSINESS_ENDPOINTS.UPDATE_BOOKING_POLICIES, businessId),
      )
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin')))
      .send({
        leadTime: { unit: 'hours', value: 2 },
        scheduleWindow: { unit: 'days', value: 14 },
        cancellationPolicy: { unit: 'hours', value: 24 },
        bookingPolicyText: 'E2E policy text',
        showPolicyOnBookingPage: true,
      })
      .expect(200);

    const body = await getBusiness(ctx, businessId);
    const policies = body.data.bookingPolicies as {
      bookingPolicyText: string;
    };
    expect(policies.bookingPolicyText).toBe('E2E policy text');
  });
});
