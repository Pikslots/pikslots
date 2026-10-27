import request from 'supertest';
import { TIMEOFF_ENDPOINTS } from '@pikslots/shared';

import { authHeader, tokenFor } from '../common/auth';
import { setupTimeoffTestContext } from './support/timeoff-test-context';
import {
  createOwningBusiness,
  createStaffUser,
  registerTimeoffPayload,
  errorBody,
} from './support/timeoff-fixtures';

describe(`POST ${TIMEOFF_ENDPOINTS.REGISTER}`, () => {
  const ctx = setupTimeoffTestContext();
  let businessId: string;
  let standardUserId: string;
  let anotherUserId: string;

  beforeAll(async () => {
    businessId = await createOwningBusiness(ctx);
    standardUserId = (await createStaffUser(ctx, businessId, 'Standard')).id;
    anotherUserId = (await createStaffUser(ctx, businessId, 'Enhanced')).id;
  });

  it('registers a timeoff and persists it for real', async () => {
    const payload = registerTimeoffPayload(standardUserId, businessId, {
      title: 'Register-Persists',
    });

    await request(ctx.app.getHttpServer())
      .post(TIMEOFF_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)))
      .send(payload)
      .expect(201);

    const row = await ctx.db
      .selectFrom('timeoffs')
      .selectAll()
      .where('title', '=', payload.title)
      .where('user_id', '=', standardUserId)
      .executeTakeFirstOrThrow();
    ctx.createdTimeoffIds.push(row.id);

    expect(row.business_id).toBe(businessId);
    expect(row.all_day).toBe(false);
    expect(row.is_deleted).toBe(false);
  });

  it('allows a Business Owner to create a timeoff for someone else within their own business', async () => {
    const payload = registerTimeoffPayload(anotherUserId, businessId, {
      title: 'BO-For-Someone-Else',
    });

    await request(ctx.app.getHttpServer())
      .post(TIMEOFF_ENDPOINTS.REGISTER)
      .set(
        authHeader(await tokenFor(ctx.sessionCacheService, 'Business Owner', businessId)),
      )
      .send(payload)
      .expect(201);

    const row = await ctx.db
      .selectFrom('timeoffs')
      .select('id')
      .where('title', '=', payload.title)
      .where('user_id', '=', anotherUserId)
      .executeTakeFirstOrThrow();
    ctx.createdTimeoffIds.push(row.id);
  });

  it('denies a Business Owner creating a timeoff outside their own business', async () => {
    const payload = registerTimeoffPayload(anotherUserId, businessId, {
      title: 'BO-Cross-Business',
    });

    const response = await request(ctx.app.getHttpServer())
      .post(TIMEOFF_ENDPOINTS.REGISTER)
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

  it('allows a Standard user to create a timeoff for themselves', async () => {
    const payload = registerTimeoffPayload(standardUserId, businessId, {
      title: 'Standard-For-Self',
    });

    await request(ctx.app.getHttpServer())
      .post(TIMEOFF_ENDPOINTS.REGISTER)
      .set(
        authHeader(
          await tokenFor(ctx.sessionCacheService, 'Standard', businessId, standardUserId),
        ),
      )
      .send(payload)
      .expect(201);

    const row = await ctx.db
      .selectFrom('timeoffs')
      .select('id')
      .where('title', '=', payload.title)
      .where('user_id', '=', standardUserId)
      .executeTakeFirstOrThrow();
    ctx.createdTimeoffIds.push(row.id);
  });

  it('denies a Standard user creating a timeoff for someone else', async () => {
    const payload = registerTimeoffPayload(anotherUserId, businessId, {
      title: 'Standard-For-Someone-Else',
    });

    const response = await request(ctx.app.getHttpServer())
      .post(TIMEOFF_ENDPOINTS.REGISTER)
      .set(
        authHeader(
          await tokenFor(ctx.sessionCacheService, 'Standard', businessId, standardUserId),
        ),
      )
      .send(payload)
      .expect(401);

    expect(errorBody(response).message).toMatch(/unauthorized/i);
  });

  it('returns 400 for an invalid payload', async () => {
    const response = await request(ctx.app.getHttpServer())
      .post(TIMEOFF_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)))
      .send({})
      .expect(400);

    expect(errorBody(response).statusCode).toBe(400);
    expect(typeof errorBody(response).message).toBe('string');
  });

  it('returns 400 when userId is not a v7 uuid (RegisterTimeoffDto requires v7 specifically)', async () => {
    const payload = registerTimeoffPayload(standardUserId, businessId, {
      title: 'Bad-UserId-Version',
    });

    const response = await request(ctx.app.getHttpServer())
      .post(TIMEOFF_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)))
      .send({ ...payload, userId: '11111111-1111-4111-8111-111111111111' }) // v4, not v7
      .expect(400);

    expect(errorBody(response).message).toMatch(/uuid/i);
  });
});
