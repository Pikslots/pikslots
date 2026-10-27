import request from 'supertest';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { endpointFor } from '../common/endpoint-path';
import { authHeader, tokenFor } from '../common/auth';
import { setupBusinessTestContext } from './support/business-test-context';
import { createBusiness, getBusiness } from './support/business-fixtures';

describe(`PATCH ${BUSINESS_ENDPOINTS.UPDATE_TEAM_NOTIFICATIONS}`, () => {
  const ctx = setupBusinessTestContext();
  let businessId: string;

  beforeAll(async () => {
    const business = await createBusiness(ctx);
    businessId = business.id;
  });

  it('updates team notifications and persists them for real', async () => {
    await request(ctx.app.getHttpServer())
      .patch(
        endpointFor(BUSINESS_ENDPOINTS.UPDATE_TEAM_NOTIFICATIONS, businessId),
      )
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin')))
      .send({
        notifyBookingConfirmation: true,
        notifyBookingChanges: true,
        notifyBookingCancellations: true,
        bookingRemindersTime: {
          active: true,
          type: 'email',
          unit: 'hours',
          value: 12,
        },
        extraCCEmails: ['team-cc@example.com'],
      })
      .expect(200);

    const body = await getBusiness(ctx, businessId);
    const notifications = body.data.teamNotifications as {
      extraCCEmails: string[];
    };
    expect(notifications.extraCCEmails).toEqual(['team-cc@example.com']);
  });
});
