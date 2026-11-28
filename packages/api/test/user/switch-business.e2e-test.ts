import request from 'supertest';
import { SESSION_ENDPOINTS, USER_ENDPOINTS } from '@pikslots/shared';

import { successBody } from '../common/http-envelope';
import { setupUserTestContext } from './support/user-test-context';
import {
  createBusiness,
  createStaffUser,
  login,
  extractSessionCookie,
} from './support/user-fixtures';

const PASSWORD = 'CorrectHorse123!';

describe(`POST ${USER_ENDPOINTS.SWITCH_BUSINESS}`, () => {
  const ctx = setupUserTestContext();

  const getMe = (cookie: string) =>
    request(ctx.app.getHttpServer())
      .get(SESSION_ENDPOINTS.ME)
      .set('Cookie', cookie);

  const switchBusiness = (cookie: string, businessId: string) =>
    request(ctx.app.getHttpServer())
      .post(USER_ENDPOINTS.SWITCH_BUSINESS)
      .set('Cookie', cookie)
      .send({ businessId });

  it('revokes every session of the platform owner and issues a new one for the new business', async () => {
    const { id: firstBusinessId } = await createBusiness(ctx);
    const { id: secondBusinessId } = await createBusiness(ctx);
    const { id: userId, username } = await createStaffUser(
      ctx,
      firstBusinessId,
      'Platform Owner',
      { password: PASSWORD },
    );

    const cookieA = extractSessionCookie(await login(ctx, username, PASSWORD));
    const cookieB = extractSessionCookie(await login(ctx, username, PASSWORD));

    const response = await switchBusiness(cookieA, secondBusinessId);

    expect(response.status).toBe(200);
    const session = successBody<{
      id: string;
      userId: string;
      businessId: string | null;
    }>(response).data;
    expect(session.userId).toBe(userId);
    expect(session.businessId).toBe(secondBusinessId);

    const cookieC = extractSessionCookie(response);
    expect(cookieC).toBe(`jid=${session.id}`);
    expect(cookieC).not.toBe(cookieA);
    expect(cookieC).not.toBe(cookieB);

    expect((await getMe(cookieA)).status).toBe(401);
    expect((await getMe(cookieB)).status).toBe(401);

    const me = await getMe(cookieC);
    expect(me.status).toBe(200);
    expect(successBody<{ businessId: string }>(me).data.businessId).toBe(
      secondBusinessId,
    );
  });

  it('remembers the switched business on the next login', async () => {
    const { id: firstBusinessId } = await createBusiness(ctx);
    const { id: secondBusinessId } = await createBusiness(ctx);
    const { username } = await createStaffUser(
      ctx,
      firstBusinessId,
      'Platform Owner',
      { password: PASSWORD },
    );

    const cookie = extractSessionCookie(await login(ctx, username, PASSWORD));
    await switchBusiness(cookie, secondBusinessId);

    const nextLogin = extractSessionCookie(
      await login(ctx, username, PASSWORD),
    );
    const me = await getMe(nextLogin);
    expect(successBody<{ businessId: string }>(me).data.businessId).toBe(
      secondBusinessId,
    );
  });

  it('returns 404 for an unknown business and keeps the current session', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { username } = await createStaffUser(
      ctx,
      businessId,
      'Platform Owner',
      { password: PASSWORD },
    );
    const cookie = extractSessionCookie(await login(ctx, username, PASSWORD));

    const response = await switchBusiness(
      cookie,
      '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6fff',
    );

    expect(response.status).toBe(404);
    expect((await getMe(cookie)).status).toBe(200);
  });

  it('forbids roles other than the platform owner', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: otherBusinessId } = await createBusiness(ctx);
    const { username } = await createStaffUser(ctx, businessId, 'Admin', {
      password: PASSWORD,
    });
    const cookie = extractSessionCookie(await login(ctx, username, PASSWORD));

    const response = await switchBusiness(cookie, otherBusinessId);

    expect(response.status).toBe(403);
    expect((await getMe(cookie)).status).toBe(200);
  });
});
