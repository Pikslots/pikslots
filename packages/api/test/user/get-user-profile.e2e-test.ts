import request from 'supertest';
import { USER_ENDPOINTS } from '@pikslots/shared';

import { successBody } from '../common/http-envelope';
import { setupUserTestContext } from './support/user-test-context';
import {
  createBusiness,
  createStaffUser,
  getUserProfile,
  tokenForRole,
} from './support/user-fixtures';

describe(`GET ${USER_ENDPOINTS.ME}`, () => {
  const ctx = setupUserTestContext();

  it("returns the caller's own full profile, derived purely from their JWT", async () => {
    const { id: businessId } = await createBusiness(ctx);
    const {
      id: userId,
      username,
      email,
    } = await createStaffUser(ctx, businessId, 'Admin');

    const response = await getUserProfile(
      ctx,
      await tokenForRole(ctx, 'Admin', businessId, userId),
    );

    expect(response.status).toBe(200);
    const data = successBody<Record<string, unknown>>(response).data;
    expect(data.id).toBe(userId);
    expect(data.username).toBe(username);
    expect(data.email).toBe(email);
    expect(data.role).toBe('Admin');
    expect(data.businessId).toBe(businessId);
    expect(data).toHaveProperty('userWorkingHours');
    expect(data).not.toHaveProperty('password');
  });

  it('returns 401 when no auth token is provided', async () => {
    await request(ctx.app.getHttpServer()).get(USER_ENDPOINTS.ME).expect(401);
  });
});
