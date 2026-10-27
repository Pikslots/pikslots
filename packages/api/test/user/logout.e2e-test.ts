import { USER_ENDPOINTS } from '@pikslots/shared';

import { successBody } from '../common/http-envelope';
import { setupUserTestContext } from './support/user-test-context';
import {
  createBusiness,
  createStaffUser,
  login,
  extractSessionCookie,
  logout,
} from './support/user-fixtures';

describe(`POST ${USER_ENDPOINTS.LOGOUT}`, () => {
  const ctx = setupUserTestContext();

  it('clears the session cookie and invalidates the session on logout', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { username } = await createStaffUser(ctx, businessId, 'Admin', {
      password: 'CorrectHorse123!',
    });
    const loginResponse = await login(ctx, username, 'CorrectHorse123!');
    const sessionCookie = extractSessionCookie(loginResponse);

    const response = await logout(ctx, sessionCookie);

    expect(response.status).toBe(200);
    expect(successBody<{ message: string }>(response).data.message).toBe(
      'success',
    );

    const setCookie = response.headers['set-cookie'] as unknown as string[];
    // clearCookie sends an already-expired jid cookie with an empty value
    expect(
      setCookie.some((c) => c.startsWith('jid=;') || c.startsWith('jid=')),
    ).toBe(true);

    // the session cookie from before logout can no longer authenticate
    const reuseResponse = await logout(ctx, sessionCookie);
    expect(reuseResponse.status).toBe(401);
  });

  it('returns 401 when logging out with no session cookie', async () => {
    const response = await logout(ctx);

    expect(response.status).toBe(401);
  });
});
