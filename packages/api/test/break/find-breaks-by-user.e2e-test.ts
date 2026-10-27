import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { BREAK_ENDPOINTS } from '@pikslots/shared';

import { authHeader } from '../common/auth';
import { successBody, errorBody } from '../common/http-envelope';
import { setupBreakTestContext } from './support/break-test-context';
import {
  createBusiness,
  createUser,
  createBreak,
  breakPayload,
  findAllByUserPath,
  tokenForRole,
} from './support/break-fixtures';

describe(`GET ${BREAK_ENDPOINTS.FIND_ALL_BY_USER}`, () => {
  const ctx = setupBreakTestContext();

  it("returns all active breaks for the caller's own user id", async () => {
    const { id: businessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');
    const token = await tokenForRole(ctx, 'Standard', businessId, userId);

    await createBreak(
      ctx,
      breakPayload({
        userId,
        businessId,
        day: 'monday',
        startTime: '09:00',
        endTime: '09:30',
      }),
      token,
    );
    await createBreak(
      ctx,
      breakPayload({
        userId,
        businessId,
        day: 'tuesday',
        startTime: '13:00',
        endTime: '13:30',
      }),
      token,
    );

    const response = await request(ctx.app.getHttpServer())
      .get(findAllByUserPath(userId, businessId))
      .set(authHeader(token))
      .expect(200);

    expect(successBody(response).data).toHaveLength(2);
  });

  it('returns an empty array for a user with no breaks', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');

    const response = await request(ctx.app.getHttpServer())
      .get(findAllByUserPath(userId, businessId))
      .set(authHeader(await tokenForRole(ctx, 'Standard', businessId, userId)))
      .expect(200);

    expect(successBody(response).data).toEqual([]);
  });

  it("allows an Admin in the same business to view another user's breaks", async () => {
    const { id: businessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');
    await createBreak(
      ctx,
      breakPayload({ userId, businessId }),
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );

    const response = await request(ctx.app.getHttpServer())
      .get(findAllByUserPath(userId, businessId))
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    expect(successBody(response).data).toHaveLength(1);
  });

  it("returns 401 when a different Standard user tries to view someone else's breaks", async () => {
    const { id: businessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');
    const otherUserId = await createUser(ctx, businessId, 'Standard');

    const response = await request(ctx.app.getHttpServer())
      .get(findAllByUserPath(userId, businessId))
      .set(authHeader(await tokenForRole(ctx, 'Standard', businessId, otherUserId)))
      .expect(401);

    expect(errorBody(response).statusCode).toBe(401);
  });

  it('returns 401 when the caller belongs to a different business', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: otherBusinessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');

    const response = await request(ctx.app.getHttpServer())
      .get(findAllByUserPath(userId, businessId))
      .set(
        authHeader(await tokenForRole(ctx, 'Admin', otherBusinessId, randomUUID())),
      )
      .expect(401);

    expect(errorBody(response).statusCode).toBe(401);
  });
});
