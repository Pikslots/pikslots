import request from 'supertest';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { endpointFor } from '../common/endpoint-path';
import { authHeader, tokenFor } from '../common/auth';
import { setupBusinessTestContext } from './support/business-test-context';
import { createBusiness, getBusiness } from './support/business-fixtures';

describe(`PATCH ${BUSINESS_ENDPOINTS.UPDATE_CUSTOMER_NOTIFICATIONS}`, () => {
  const ctx = setupBusinessTestContext();
  let businessId: string;

  beforeAll(async () => {
    const business = await createBusiness(ctx);
    businessId = business.id;
  });

  it('updates customer notifications and persists them for real', async () => {
    await request(ctx.app.getHttpServer())
      .patch(
        endpointFor(
          BUSINESS_ENDPOINTS.UPDATE_CUSTOMER_NOTIFICATIONS,
          businessId,
        ),
      )
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin')))
      .send({
        notifyBookingConfirmation: false,
        notifyBookingChanges: true,
        notifyBookingCancellations: true,
        bookingRemindersTime: {
          active: true,
          type: 'sms',
          unit: 'hours',
          value: 6,
        },
      })
      .expect(200);

    const body = await getBusiness(ctx, businessId);
    const notifications = body.data.customerNotifications as {
      notifyBookingConfirmation: boolean;
    };
    expect(notifications.notifyBookingConfirmation).toBe(false);
  });
});
