import request from 'supertest';
import { SESSION_ENDPOINTS } from '@pikslots/shared';

import { successBody } from '../common/http-envelope';
import { setupUserTestContext } from './support/user-test-context';
import {
  createBusiness,
  createStaffUser,
  login,
  extractSessionCookie,
} from './support/user-fixtures';

describe(`GET ${SESSION_ENDPOINTS.ME}`, () => {
  const ctx = setupUserTestContext();

  it("returns the caller's own session, resolved from the jid cookie", async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: userId, username } = await createStaffUser(
      ctx,
      businessId,
      'Admin',
      { password: 'CorrectHorse123!' },
    );
    const loginResponse = await login(ctx, username, 'CorrectHorse123!');
    const sessionCookie = extractSessionCookie(loginResponse);

    const response = await request(ctx.app.getHttpServer())
      .get(SESSION_ENDPOINTS.ME)
      .set('Cookie', sessionCookie);

    expect(response.status).toBe(200);
    const session = successBody<{
      id: string;
      userId: string;
      role: string;
      businessId: string | null;
    }>(response).data;
    expect(session.userId).toBe(userId);
    expect(session.role).toBe('Admin');
    expect(session.businessId).toBe(businessId);
  });

  it('returns 401 when no session cookie is sent', async () => {
    const response = await request(ctx.app.getHttpServer()).get(
      SESSION_ENDPOINTS.ME,
    );

    expect(response.status).toBe(401);
  });
});
