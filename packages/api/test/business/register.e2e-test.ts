import request from 'supertest';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { successBody, errorBody } from '../common/http-envelope';
import { authHeader, tokenFor } from '../common/auth';
import { setupBusinessTestContext } from './support/business-test-context';
import {
  createBusiness,
  ownerSession,
  registerPayload,
} from './support/business-fixtures';

describe(`POST ${BUSINESS_ENDPOINTS.REGISTER}`, () => {
  const ctx = setupBusinessTestContext();

  it('persists a real row in Postgres owned by the calling user', async () => {
    const payload = registerPayload();
    const { ownerId, headers } = await ownerSession(ctx);

    const response = await request(ctx.app.getHttpServer())
      .post(BUSINESS_ENDPOINTS.REGISTER)
      .set(headers)
      .send(payload)
      .expect(201);

    expect(successBody(response).data).toEqual({ message: 'success' });

    const row = await ctx.db
      .selectFrom('businesses')
      .selectAll()
      .where('slug', '=', payload.slug)
      .executeTakeFirstOrThrow();
    ctx.createdBusinessIds.push(row.id);

    expect(row.owner_id).toBe(ownerId);
    expect(row.created_by).toBe(ownerId);
    expect(row.name).toBe(payload.name);
    expect(row.status).toBe('pending_setup');

    // No invite is sent anymore
    expect(ctx.sentEmails).not.toHaveBeenCalled();
  });

  it('returns 409 when the slug is already taken', async () => {
    const existing = await createBusiness(ctx);
    const { headers } = await ownerSession(ctx);

    const response = await request(ctx.app.getHttpServer())
      .post(BUSINESS_ENDPOINTS.REGISTER)
      .set(headers)
      .send(registerPayload({ slug: existing.slug }))
      .expect(409);

    expect(errorBody(response).statusCode).toBe(409);
  });

  it('returns 400 for an invalid payload', async () => {
    const { headers } = await ownerSession(ctx);

    const response = await request(ctx.app.getHttpServer())
      .post(BUSINESS_ENDPOINTS.REGISTER)
      .set(headers)
      .send({})
      .expect(400);

    expect(errorBody(response).statusCode).toBe(400);
    expect(typeof errorBody(response).message).toBe('string');
  });

  it('returns 401 without a session', async () => {
    const response = await request(ctx.app.getHttpServer())
      .post(BUSINESS_ENDPOINTS.REGISTER)
      .send(registerPayload())
      .expect(401);

    expect(errorBody(response).statusCode).toBe(401);
  });

  it.each(['Business Owner', 'Admin', 'Enhanced', 'Standard'] as const)(
    'returns 403 for a %s',
    async (role) => {
      const response = await request(ctx.app.getHttpServer())
        .post(BUSINESS_ENDPOINTS.REGISTER)
        .set(authHeader(await tokenFor(ctx.sessionCacheService, role)))
        .send(registerPayload())
        .expect(403);

      expect(errorBody(response).statusCode).toBe(403);
    },
  );
});
