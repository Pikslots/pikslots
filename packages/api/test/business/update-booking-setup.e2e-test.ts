import request from 'supertest';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { endpointFor } from '../common/endpoint-path';
import { authHeader, tokenFor } from '../common/auth';
import { setupBusinessTestContext } from './support/business-test-context';
import { createBusiness, getBusiness } from './support/business-fixtures';

describe(`PATCH ${BUSINESS_ENDPOINTS.UPDATE_BOOKING_SETUP}`, () => {
  const ctx = setupBusinessTestContext();
  let businessId: string;

  beforeAll(async () => {
    const business = await createBusiness(ctx);
    businessId = business.id;
  });

  it('updates booking setup and persists it for real', async () => {
    await request(ctx.app.getHttpServer())
      .patch(endpointFor(BUSINESS_ENDPOINTS.UPDATE_BOOKING_SETUP, businessId))
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin')))
      .send({
        bookAppointmentSectionVisible: true,
        bookClassSectionVisible: true,
        aboutUsSectionVisible: true,
        ourTeamSectionVisible: true,
        servicesSectionVisible: true,
        classesSectionVisible: true,
        showFirstAvailable: true,
        skipTeamSelection: true,
        allowToBookMultipleServices: true,
        bypassTeamMemberSelection: true,
        customerLoginEnabled: true,
        customerLoginRequired: true,
        hidePikslotsBranding: true,
        accordionView: true,
        allowRescheduling: true,
        allowCancellations: true,
        showBookNewButton: true,
        nameEnabled: true,
        nameRequired: true,
        emailEnabled: true,
        emailRequired: true,
        phoneEnabled: true,
        phoneRequired: true,
        addressEnabled: true,
        addressRequired: true,
        customFields: [
          {
            label: 'city',
            enabled: true,
            required: true,
          },
        ],
      })
      .expect(200);

    const body = await getBusiness(ctx, businessId);
    const setup = body.data.bookingSetup as { showBookNewButton: boolean };
    expect(setup.showBookNewButton).toBe(true);
  });
});
