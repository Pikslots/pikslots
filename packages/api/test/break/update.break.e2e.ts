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
  updatePath,
  tokenForRole,
} from './support/break-fixtures';

describe(`PATCH ${BREAK_ENDPOINTS.UPDATE}`, () => {
  const ctx = setupBreakTestContext();

  it('updates a break to a completely different, non-overlapping time', async () => {
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

    const response = await request(ctx.app.getHttpServer())
      .patch(updatePath(created.id))
      .set(authHeader(token))
      .send({ day: 'monday', startTime: '14:00', endTime: '14:30' })
      .expect(200);

    expect(successBody(response).data).toEqual({ message: 'success' });

    const row = await ctx.db
      .selectFrom('breaks')
      .selectAll()
      .where('id', '=', created.id)
      .executeTakeFirstOrThrow();
    expect(row.start_time).toBe('14:00');
    expect(row.end_time).toBe('14:30');
  });

  // NOTE: this test currently fails against production code. See the
  // conversation notes below the file / message to Amir — hasConflict() is
  // never called with excludeBreakId in UpdateBreakUseCaseImpl, so any edit
  // whose new time range overlaps the break's *own pre-update* time range
  // is misdetected as a conflict against itself and rejected with 409, even
  // though there is no real conflicting break in the system.
  it('updates a break to a slightly adjusted time that still overlaps its own previous slot', async () => {
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
      .patch(updatePath(created.id))
      .set(authHeader(token))
      .send({ day: 'monday', startTime: '09:00', endTime: '09:45' })
      .expect(200);
  });

  it('returns 409 when updating into a slot that conflicts with a different break', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');
    const token = await tokenForRole(ctx, 'Standard', businessId, userId);
    const moving = await createBreak(
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
        day: 'monday',
        startTime: '14:00',
        endTime: '14:30',
      }),
      token,
    );

    const response = await request(ctx.app.getHttpServer())
      .patch(updatePath(moving.id))
      .set(authHeader(token))
      .send({ day: 'monday', startTime: '14:15', endTime: '14:45' })
      .expect(409);

    expect(errorBody(response).statusCode).toBe(409);
  });

  it("allows an Admin in the same business to update another user's break", async () => {
    const { id: businessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');
    const created = await createBreak(
      ctx,
      breakPayload({
        userId,
        businessId,
        day: 'monday',
        startTime: '09:00',
        endTime: '09:30',
      }),
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );

    await request(ctx.app.getHttpServer())
      .patch(updatePath(created.id))
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .send({ day: 'monday', startTime: '15:00', endTime: '15:30' })
      .expect(200);
  });

  it("returns 401 when a different Standard user tries to update someone else's break", async () => {
    const { id: businessId } = await createBusiness(ctx);
    const userId = await createUser(ctx, businessId, 'Standard');
    const otherUserId = await createUser(ctx, businessId, 'Standard');
    const created = await createBreak(
      ctx,
      breakPayload({
        userId,
        businessId,
        day: 'monday',
        startTime: '09:00',
        endTime: '09:30',
      }),
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );

    const response = await request(ctx.app.getHttpServer())
      .patch(updatePath(created.id))
      .set(authHeader(await tokenForRole(ctx, 'Standard', businessId, otherUserId)))
      .send({ day: 'monday', startTime: '15:00', endTime: '15:30' })
      .expect(401);

    expect(errorBody(response).statusCode).toBe(401);
  });

  it('returns 404 when updating a break that does not exist', async () => {
    const { id: businessId } = await createBusiness(ctx);

    const response = await request(ctx.app.getHttpServer())
      .patch(updatePath(randomUUID()))
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .send({ day: 'monday', startTime: '09:00', endTime: '09:30' })
      .expect(404);

    expect(errorBody(response).statusCode).toBe(404);
  });
});
