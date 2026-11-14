import request from 'supertest';
import { SESSION_ENDPOINTS, USER_ENDPOINTS } from '@pikslots/shared';

import { successBody } from '../common/http-envelope';
import { setupUserTestContext } from './support/user-test-context';
import {
  createBusiness,
  createStaffUser,
  extractSessionCookie,
  login,
} from './support/user-fixtures';

describe(`PATCH ${USER_ENDPOINTS.SWITCH_BUSINESS}`, () => {
  const ctx = setupUserTestContext();

  it('persists the selected business on the Platform Owner and active session', async () => {
    const firstBusiness = await createBusiness(ctx);
    const secondBusiness = await createBusiness(ctx);
    const { id: userId, username } = await createStaffUser(
      ctx,
      firstBusiness.id,
      'Platform Owner',
      { password: 'CorrectHorse123!' },
    );
    const loginResponse = await login(ctx, username, 'CorrectHorse123!');
    const sessionCookie = extractSessionCookie(loginResponse);

    const response = await request(ctx.app.getHttpServer())
      .patch(USER_ENDPOINTS.SWITCH_BUSINESS)
      .set('Cookie', sessionCookie)
      .send({ businessId: secondBusiness.id });

    expect(response.status).toBe(200);
    expect(
      successBody<{ message: string; businessId: string }>(response).data,
    ).toEqual({
      message: 'success',
      businessId: secondBusiness.id,
    });

    const userRow = await ctx.db
      .selectFrom('users')
      .select('business_id')
      .where('id', '=', userId)
      .executeTakeFirstOrThrow();
    expect(userRow.business_id).toBe(secondBusiness.id);

    const sessionResponse = await request(ctx.app.getHttpServer())
      .get(SESSION_ENDPOINTS.ME)
      .set('Cookie', sessionCookie);

    expect(sessionResponse.status).toBe(200);
    expect(
      successBody<{ businessId: string | null }>(sessionResponse).data
        .businessId,
    ).toBe(secondBusiness.id);
  });

  it('rejects callers that are not Platform Owners', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { username } = await createStaffUser(ctx, businessId, 'Admin', {
      password: 'CorrectHorse123!',
    });
    const loginResponse = await login(ctx, username, 'CorrectHorse123!');
    const sessionCookie = extractSessionCookie(loginResponse);

    const response = await request(ctx.app.getHttpServer())
      .patch(USER_ENDPOINTS.SWITCH_BUSINESS)
      .set('Cookie', sessionCookie)
      .send({ businessId });

    expect(response.status).toBe(403);
  });
});
