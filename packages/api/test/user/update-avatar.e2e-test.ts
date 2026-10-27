import { randomUUID } from 'node:crypto';
import { USER_ENDPOINTS } from '@pikslots/shared';

import { unique } from '../common/unique-id';
import { setupUserTestContext } from './support/user-test-context';
import {
  createBusiness,
  createStaffUser,
  updateUserAvatar,
  tokenForRole,
} from './support/user-fixtures';

describe(`PATCH ${USER_ENDPOINTS.UPDATE_AVATAR}`, () => {
  const ctx = setupUserTestContext();

  it('lets a Standard user update their own avatar, storing the raw S3 key', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const avatarKey = `${unique('e2e-biz')}/users/${userId}/avatar/photo.png`;

    const response = await updateUserAvatar(
      ctx,
      userId,
      avatarKey,
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );

    expect(response.status).toBe(200);

    const row = await ctx.db
      .selectFrom('users')
      .select('avatar_url')
      .where('id', '=', userId)
      .executeTakeFirstOrThrow();
    expect(row.avatar_url).toBe(avatarKey);
  });

  it('replaces a previously-set avatar key without erroring (old key delete is best-effort)', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const token = await tokenForRole(ctx, 'Standard', businessId, userId);
    const firstKey = `${unique('e2e-biz')}/users/${userId}/avatar/first.png`;
    const secondKey = `${unique('e2e-biz')}/users/${userId}/avatar/second.png`;

    await updateUserAvatar(ctx, userId, firstKey, token).then((res) =>
      expect(res.status).toBe(200),
    );

    const response = await updateUserAvatar(ctx, userId, secondKey, token);

    expect(response.status).toBe(200);
    const row = await ctx.db
      .selectFrom('users')
      .select('avatar_url')
      .where('id', '=', userId)
      .executeTakeFirstOrThrow();
    expect(row.avatar_url).toBe(secondKey);
  });

  it("lets an Admin update another user's avatar within their own business", async () => {
    const { id: businessId } = await createBusiness(ctx);
    const admin = await createStaffUser(ctx, businessId, 'Admin');
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const avatarKey = `${unique('e2e-biz')}/users/${userId}/avatar/photo.png`;

    const response = await updateUserAvatar(
      ctx,
      userId,
      avatarKey,
      await tokenForRole(ctx, 'Admin', businessId, admin.id),
    );

    expect(response.status).toBe(200);
  });

  it("returns 401 when a Standard user tries to update someone else's avatar", async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const otherStandard = await createStaffUser(ctx, businessId, 'Standard');
    const avatarKey = `${unique('e2e-biz')}/users/${userId}/avatar/photo.png`;

    const response = await updateUserAvatar(
      ctx,
      userId,
      avatarKey,
      await tokenForRole(ctx, 'Standard', businessId, otherStandard.id),
    );

    expect(response.status).toBe(401);
  });

  it('returns 404 for a user that does not exist', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const admin = await createStaffUser(ctx, businessId, 'Admin');

    const response = await updateUserAvatar(
      ctx,
      randomUUID(),
      'some/key.png',
      await tokenForRole(ctx, 'Admin', businessId, admin.id),
    );

    expect(response.status).toBe(404);
  });

  it('returns 400 when avatarKey is an empty string', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');

    const response = await updateUserAvatar(
      ctx,
      userId,
      '',
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );

    expect(response.status).toBe(400);
  });
});
