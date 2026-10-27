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
  findByIdPath,
  tokenForRole,
} from './support/break-fixtures';

describe(`GET ${BREAK_ENDPOINTS.FIND_BY_ID}`, () => {
  const ctx = setupBreakTestContext();

  it('returns the full break record for its owner', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');
    const token = await tokenForRole(ctx, 'Standard', businessId, userId);
    const created = await createBreak(
      ctx,
      breakPayload({ userId, businessId }),
      token,
    );

    const response = await request(ctx.app.getHttpServer())
      .get(findByIdPath(created.id))
      .set(authHeader(token))
      .expect(200);

    const body = successBody<Record<string, unknown>>(response).data;
    expect(body).toMatchObject({
      id: created.id,
      day: created.day,
      startTime: created.startTime,
      endTime: created.endTime,
      userId,
      businessId,
      isDeleted: false,
    });
  });

  it('allows a Business Owner in the same business to view a break belonging to another user', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const ownerToken = await tokenForRole(ctx, 'Business Owner', businessId);
    const userId = await createUser(ctx, businessId, 'Standard');
    const created = await createBreak(
      ctx,
      breakPayload({ userId, businessId }),
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );

    await request(ctx.app.getHttpServer())
      .get(findByIdPath(created.id))
      .set(authHeader(ownerToken))
      .expect(200);
  });

  it("returns 401 when a different Standard user tries to view someone else's break", async () => {
    const { id: businessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');
    const otherUserId = await createUser(ctx, businessId, 'Standard');
    const created = await createBreak(
      ctx,
      breakPayload({ userId, businessId }),
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );

    const response = await request(ctx.app.getHttpServer())
      .get(findByIdPath(created.id))
      .set(authHeader(await tokenForRole(ctx, 'Standard', businessId, otherUserId)))
      .expect(401);

    expect(errorBody(response).statusCode).toBe(401);
  });

  it('returns 404 for a break that does not exist', async () => {
    const { id: businessId } = await createBusiness(ctx);

    const response = await request(ctx.app.getHttpServer())
      .get(findByIdPath(randomUUID()))
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(404);

    expect(errorBody(response).statusCode).toBe(404);
  });
});
