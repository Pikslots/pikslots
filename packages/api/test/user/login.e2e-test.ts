import { USER_ENDPOINTS } from '@pikslots/shared';

import { successBody, errorBody } from '../common/http-envelope';
import { setupUserTestContext } from './support/user-test-context';
import {
  createBusiness,
  createStaffUser,
  setUserStatus,
  login,
} from './support/user-fixtures';

describe(`POST ${USER_ENDPOINTS.LOGIN}`, () => {
  const ctx = setupUserTestContext();

  it('logs in with a valid username and password, setting a session cookie', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { username } = await createStaffUser(ctx, businessId, 'Admin', {
      password: 'CorrectHorse123!',
    });

    const response = await login(ctx, username, 'CorrectHorse123!');

    expect(response.status).toBe(200);
    expect(successBody<{ message: string }>(response).data.message).toBe(
      'success',
    );

    const setCookie = response.headers['set-cookie'] as unknown as string[];
    expect(setCookie.some((c) => c.startsWith('jid='))).toBe(true);
    expect(setCookie.some((c) => c.includes('HttpOnly'))).toBe(true);
  });

  it('logs in with a valid email in place of username', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { email } = await createStaffUser(ctx, businessId, 'Admin', {
      password: 'CorrectHorse123!',
    });

    const response = await login(ctx, email, 'CorrectHorse123!');

    expect(response.status).toBe(200);
  });

  it('returns 401 for the wrong password', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { username } = await createStaffUser(ctx, businessId, 'Admin', {
      password: 'CorrectHorse123!',
    });

    const response = await login(ctx, username, 'WrongPassword123!');

    expect(response.status).toBe(401);
    expect(errorBody(response).statusCode).toBe(401);
  });

  it('returns 401 for an unknown username', async () => {
    const response = await login(ctx, 'no-such-user-e2e', 'WhateverPass123!');

    expect(response.status).toBe(401);
    expect(errorBody(response).statusCode).toBe(401);
  });

  it("returns 403 for a 'No Access' role user, even with the correct password", async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { username } = await createStaffUser(ctx, businessId, 'No Access', {
      password: 'CorrectHorse123!',
    });

    const response = await login(ctx, username, 'CorrectHorse123!');

    expect(response.status).toBe(403);
  });

  it('returns 403 for an inactive user', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: userId, username } = await createStaffUser(
      ctx,
      businessId,
      'Standard',
      { password: 'CorrectHorse123!' },
    );
    await setUserStatus(ctx, userId, 'inactive');

    const response = await login(ctx, username, 'CorrectHorse123!');

    expect(response.status).toBe(403);
  });

  it('returns 403 for a suspended user', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: userId, username } = await createStaffUser(
      ctx,
      businessId,
      'Standard',
      { password: 'CorrectHorse123!' },
    );
    await setUserStatus(ctx, userId, 'suspended', 'Payment overdue');

    const response = await login(ctx, username, 'CorrectHorse123!');

    expect(response.status).toBe(403);
  });

  it('returns 400 when the password is shorter than the minimum length', async () => {
    const response = await login(ctx, 'someone', 'short');

    expect(response.status).toBe(400);
  });
});
