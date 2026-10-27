import request from 'supertest';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { endpointFor } from '../common/endpoint-path';
import { authHeader, tokenFor } from '../common/auth';
import { setupBusinessTestContext } from './support/business-test-context';
import { createBusiness, getBusiness } from './support/business-fixtures';

describe(`PATCH ${BUSINESS_ENDPOINTS.UPDATE_CONTACT_DETAILS}`, () => {
  const ctx = setupBusinessTestContext();
  let businessId: string;

  beforeAll(async () => {
    const business = await createBusiness(ctx);
    businessId = business.id;
  });

  it('updates contact details and persists them for real', async () => {
    await request(ctx.app.getHttpServer())
      .patch(endpointFor(BUSINESS_ENDPOINTS.UPDATE_CONTACT_DETAILS, businessId))
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin')))
      .send({
        primaryEmail: 'contact@example.com',
        primaryPhone: { countryCode: '+1', number: '5551234567' },
        additionalEmails: ['second@example.com'],
        additionalPhones: [],
      })
      .expect(200);

    const body = await getBusiness(ctx, businessId);
    const contact = body.data.contactDetails as { primaryEmail: string };
    expect(contact.primaryEmail).toBe('contact@example.com');
  });
});
