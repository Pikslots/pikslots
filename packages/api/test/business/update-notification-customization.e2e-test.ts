import request from 'supertest';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { endpointFor } from '../common/endpoint-path';
import { authHeader, tokenFor } from '../common/auth';
import { setupBusinessTestContext } from './support/business-test-context';
import { createBusiness, getBusiness } from './support/business-fixtures';

describe(`PATCH ${BUSINESS_ENDPOINTS.UPDATE_NOTIFICATION_CUSTOMIZATION}`, () => {
  const ctx = setupBusinessTestContext();
  let businessId: string;

  beforeAll(async () => {
    const business = await createBusiness(ctx);
    businessId = business.id;
  });

  it('updates notification customization and persists it for real', async () => {
    await request(ctx.app.getHttpServer())
      .patch(
        endpointFor(
          BUSINESS_ENDPOINTS.UPDATE_NOTIFICATION_CUSTOMIZATION,
          businessId,
        ),
      )
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin')))
      .send({
        emailSenderName: 'E2E Sender',
        emailSignature: 'Thanks,\nE2E Team',
      })
      .expect(200);

    const body = await getBusiness(ctx, businessId);
    const customization = body.data.notificationCustomization as {
      emailSenderName: string;
    };
    expect(customization.emailSenderName).toBe('E2E Sender');
  });
});
