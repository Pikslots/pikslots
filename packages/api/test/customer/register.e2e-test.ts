import request from 'supertest';
import { CUSTOMER_ENDPOINTS } from '@pikslots/shared';

import { authHeader, tokenFor } from '../common/auth';
import { setupCustomerTestContext } from './support/customer-test-context';
import {
  createOwningBusiness,
  registerCustomerPayload,
  errorBody,
} from './support/customer-fixtures';

describe(`POST ${CUSTOMER_ENDPOINTS.REGISTER}`, () => {
  const ctx = setupCustomerTestContext();
  let businessId: string;

  beforeAll(async () => {
    businessId = await createOwningBusiness(ctx);
  });

  it('registers a customer and persists it for real', async () => {
    const payload = registerCustomerPayload(businessId, {
      firstName: 'Priya',
      lastName: 'Shah',
      email: 'priya.shah.register@example.com',
    });

    await request(ctx.app.getHttpServer())
      .post(CUSTOMER_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)))
      .send(payload)
      .expect(201);

    const row = await ctx.db
      .selectFrom('customers')
      .selectAll()
      .where('business_id', '=', businessId)
      .where('email', '=', payload.email)
      .executeTakeFirstOrThrow();

    expect(row.first_name).toBe('Priya');
    expect(row.last_name).toBe('Shah');
    expect(row.is_deleted).toBe(false);
  });

  it('allows a Platform Owner to register for a business other than their own', async () => {
    const payload = registerCustomerPayload(businessId, {
      email: 'platform-owner-registered@example.com',
    });

    await request(ctx.app.getHttpServer())
      .post(CUSTOMER_ENDPOINTS.REGISTER)
      .set(
        authHeader(
          await tokenFor(
            ctx.sessionCacheService,
            'Platform Owner',
            'some-other-business',
          ),
        ),
      )
      .send(payload)
      .expect(201);
  });

  it('denies a Business Owner registering a customer outside their own business', async () => {
    const payload = registerCustomerPayload(businessId, {
      email: 'cross-business-attempt@example.com',
    });

    const response = await request(ctx.app.getHttpServer())
      .post(CUSTOMER_ENDPOINTS.REGISTER)
      .set(
        authHeader(
          await tokenFor(
            ctx.sessionCacheService,
            'Business Owner',
            'a-different-business',
          ),
        ),
      )
      .send(payload)
      .expect(401);

    expect(errorBody(response).message).toMatch(/unauthorized/i);
  });

  it('rejects a second active customer with the same email in the same business', async () => {
    const email = 'duplicate-in-same-business@example.com';
    const payload = registerCustomerPayload(businessId, { email });

    await request(ctx.app.getHttpServer())
      .post(CUSTOMER_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)))
      .send(payload)
      .expect(201);

    const response = await request(ctx.app.getHttpServer())
      .post(CUSTOMER_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)))
      .send(registerCustomerPayload(businessId, { email }))
      .expect(409);

    expect(errorBody(response).message).toMatch(/already exists/i);
  });

  it('returns 400 for an invalid payload', async () => {
    const response = await request(ctx.app.getHttpServer())
      .post(CUSTOMER_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)))
      .send({})
      .expect(400);

    expect(errorBody(response).statusCode).toBe(400);
    expect(typeof errorBody(response).message).toBe('string');
  });

  it('allows the same email to be reused across two different businesses', async () => {
    const otherBusinessId = await createOwningBusiness(ctx);
    const email = 'shared-across-businesses@example.com';

    await request(ctx.app.getHttpServer())
      .post(CUSTOMER_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)))
      .send(registerCustomerPayload(businessId, { email }))
      .expect(201);

    await request(ctx.app.getHttpServer())
      .post(CUSTOMER_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', otherBusinessId)))
      .send(registerCustomerPayload(otherBusinessId, { email }))
      .expect(201);
  });
});
