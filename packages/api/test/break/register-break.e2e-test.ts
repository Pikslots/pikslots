import request from 'supertest';
import { BREAK_ENDPOINTS } from '@pikslots/shared';

import { authHeader } from '../common/auth';
import { successBody, errorBody } from '../common/http-envelope';
import { setupBreakTestContext } from './support/break-test-context';
import {
  createBusiness,
  createUser,
  breakPayload,
  tokenForRole,
} from './support/break-fixtures';

describe(`POST ${BREAK_ENDPOINTS.CREATE}`, () => {
  const ctx = setupBreakTestContext();

  it('persists a real row in Postgres when the caller creates their own break', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');
    const payload = breakPayload({ userId, businessId });

    const response = await request(ctx.app.getHttpServer())
      .post(BREAK_ENDPOINTS.CREATE)
      .set(authHeader(await tokenForRole(ctx, 'Standard', businessId, userId)))
      .send(payload)
      .expect(201);

    expect(successBody(response).data).toEqual({ message: 'success' });

    const row = await ctx.db
      .selectFrom('breaks')
      .selectAll()
      .where('user_id', '=', userId)
      .where('is_deleted', '=', false)
      .executeTakeFirstOrThrow();

    expect(row.day).toBe(payload.day);
    expect(row.start_time).toBe(payload.startTime);
    expect(row.end_time).toBe(payload.endTime);
    expect(row.business_id).toBe(businessId);
  });

  it('allows an Admin in the same business to create a break for another user', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const targetUserId = await createUser(ctx, businessId, 'Standard');
    const payload = breakPayload({ userId: targetUserId, businessId });

    await request(ctx.app.getHttpServer())
      .post(BREAK_ENDPOINTS.CREATE)
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .send(payload)
      .expect(201);
  });

  it('returns 401 when a Standard user tries to create a break for someone else', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const targetUserId = await createUser(ctx, businessId, 'Standard');
    const payload = breakPayload({ userId: targetUserId, businessId });

    const response = await request(ctx.app.getHttpServer())
      .post(BREAK_ENDPOINTS.CREATE)
      .set(authHeader(await tokenForRole(ctx, 'Standard', businessId)))
      .send(payload)
      .expect(401);

    expect(errorBody(response).statusCode).toBe(401);
  });

  it('returns 401 when the caller belongs to a different business', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: otherBusinessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');
    const payload = breakPayload({ userId, businessId });

    const response = await request(ctx.app.getHttpServer())
      .post(BREAK_ENDPOINTS.CREATE)
      .set(authHeader(await tokenForRole(ctx, 'Admin', otherBusinessId)))
      .send(payload)
      .expect(401);

    expect(errorBody(response).statusCode).toBe(401);
  });

  it('returns 409 when the new break overlaps an existing one for the same user/day', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');
    const token = await tokenForRole(ctx, 'Standard', businessId, userId);

    await request(ctx.app.getHttpServer())
      .post(BREAK_ENDPOINTS.CREATE)
      .set(authHeader(token))
      .send(
        breakPayload({
          userId,
          businessId,
          startTime: '09:00',
          endTime: '09:30',
        }),
      )
      .expect(201);

    const response = await request(ctx.app.getHttpServer())
      .post(BREAK_ENDPOINTS.CREATE)
      .set(authHeader(token))
      .send(
        breakPayload({
          userId,
          businessId,
          startTime: '09:15',
          endTime: '09:45',
        }),
      )
      .expect(409);

    expect(errorBody(response).statusCode).toBe(409);
  });

  it('allows a break on the same day that does not overlap', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');
    const token = await tokenForRole(ctx, 'Standard', businessId, userId);

    await request(ctx.app.getHttpServer())
      .post(BREAK_ENDPOINTS.CREATE)
      .set(authHeader(token))
      .send(
        breakPayload({
          userId,
          businessId,
          startTime: '09:00',
          endTime: '09:30',
        }),
      )
      .expect(201);

    await request(ctx.app.getHttpServer())
      .post(BREAK_ENDPOINTS.CREATE)
      .set(authHeader(token))
      .send(
        breakPayload({
          userId,
          businessId,
          startTime: '10:00',
          endTime: '10:30',
        }),
      )
      .expect(201);
  });

  it('returns 400 for an invalid payload (bad time format)', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');

    const response = await request(ctx.app.getHttpServer())
      .post(BREAK_ENDPOINTS.CREATE)
      .set(authHeader(await tokenForRole(ctx, 'Standard', businessId, userId)))
      .send({
        day: 'monday',
        startTime: '9am',
        endTime: '09:30',
        userId,
        businessId,
      })
      .expect(400);

    expect(errorBody(response).statusCode).toBe(400);
  });
});
