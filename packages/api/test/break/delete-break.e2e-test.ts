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
  deletePath,
  tokenForRole,
} from './support/break-fixtures';

describe(`DELETE ${BREAK_ENDPOINTS.DELETE}`, () => {
  const ctx = setupBreakTestContext();

  it('soft-deletes a real row in Postgres for its owner', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');
    const token = await tokenForRole(ctx, 'Standard', businessId, userId);
    const created = await createBreak(
      ctx,
      breakPayload({ userId, businessId }),
      token,
    );

    const response = await request(ctx.app.getHttpServer())
      .delete(deletePath(created.id))
      .set(authHeader(token))
      .expect(200);

    expect(successBody(response).data).toEqual({ message: 'success' });

    const row = await ctx.db
      .selectFrom('breaks')
      .selectAll()
      .where('id', '=', created.id)
      .executeTakeFirstOrThrow();
    expect(row.is_deleted).toBe(true);
    expect(row.deleted_at).not.toBeNull();
  });

  it('frees up the time slot for a new break after deletion', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');
    const token = await tokenForRole(ctx, 'Standard', businessId, userId);
    const created = await createBreak(
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

    await request(ctx.app.getHttpServer())
      .delete(deletePath(created.id))
      .set(authHeader(token))
      .expect(200);

    await request(ctx.app.getHttpServer())
      .post(BREAK_ENDPOINTS.CREATE)
      .set(authHeader(token))
      .send(
        breakPayload({
          userId,
          businessId,
          day: 'monday',
          startTime: '09:00',
          endTime: '09:30',
        }),
      )
      .expect(201);
  });

  it("allows an Admin in the same business to delete another user's break", async () => {
    const { id: businessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');
    const created = await createBreak(
      ctx,
      breakPayload({ userId, businessId }),
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );

    await request(ctx.app.getHttpServer())
      .delete(deletePath(created.id))
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);
  });

  it("returns 401 when a different Standard user tries to delete someone else's break", async () => {
    const { id: businessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');
    const otherUserId = await createUser(ctx, businessId, 'Standard');
    const created = await createBreak(
      ctx,
      breakPayload({ userId, businessId }),
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );

    const response = await request(ctx.app.getHttpServer())
      .delete(deletePath(created.id))
      .set(
        authHeader(
          await tokenForRole(ctx, 'Standard', businessId, otherUserId),
        ),
      )
      .expect(401);

    expect(errorBody(response).statusCode).toBe(401);
  });

  it('returns 404 when deleting a break that does not exist', async () => {
    const { id: businessId } = await createBusiness(ctx);

    const response = await request(ctx.app.getHttpServer())
      .delete(deletePath(randomUUID()))
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(404);

    expect(errorBody(response).statusCode).toBe(404);
  });

  it('returns 404 when deleting a break that was already deleted', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');
    const token = await tokenForRole(ctx, 'Standard', businessId, userId);
    const created = await createBreak(
      ctx,
      breakPayload({ userId, businessId }),
      token,
    );

    await request(ctx.app.getHttpServer())
      .delete(deletePath(created.id))
      .set(authHeader(token))
      .expect(200);

    const response = await request(ctx.app.getHttpServer())
      .delete(deletePath(created.id))
      .set(authHeader(token))
      .expect(404);

    expect(errorBody(response).statusCode).toBe(404);
  });
});
