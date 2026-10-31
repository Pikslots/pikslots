import request from 'supertest';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { endpointFor } from '../common/endpoint-path';
import { authHeader, tokenFor } from '../common/auth';
import { setupBusinessTestContext } from './support/business-test-context';
import { createBusiness, getBusiness } from './support/business-fixtures';

describe(`PATCH ${BUSINESS_ENDPOINTS.UPDATE_BOOKING_CUSTOMIZATION}`, () => {
  const ctx = setupBusinessTestContext();
  let businessId: string;

  beforeAll(async () => {
    const business = await createBusiness(ctx);
    businessId = business.id;
  });

  it('updates booking customization and persists it for real', async () => {
    await request(ctx.app.getHttpServer())
      .patch(
        endpointFor(
          BUSINESS_ENDPOINTS.UPDATE_BOOKING_CUSTOMIZATION,
          businessId,
        ),
      )
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin')))
      .send({
        language: 'en',
        timeFormat: '24 hours',
        weekStartsOn: 'monday',
        showBookAnotherAppointmentButton: true,
        showServiceAndClassPrices: true,
        showServiceAndClassDuration: true,
        showBusinessHours: true,
        showLocalTime: true,
        labelService: 'Service',
        labelClass: 'Class',
        labelTeamMember: 'Team member',
        labelCity: 'City',
        labelState: 'State',
        labelPostalCode: 'Postal code',
        termsLabel: 'Terms',
        termsLink: 'https://example.com/terms',
        requireTermsAcceptance: true,
        redirectLabel: 'Back to site',
        redirectLink: 'https://example.com',
      })
      .expect(200);

    const body = await getBusiness(ctx, businessId);
    const customization = body.data.bookingCustomization as {
      timeFormat: string;
    };
    expect(customization.timeFormat).toBe('24 hours');
  });
});
