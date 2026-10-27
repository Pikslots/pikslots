import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { SERVICE_ENDPOINTS } from '@pikslots/shared';
import { setupServiceTestContext } from './support/service.test.context';
import { createBusiness, createService } from './support/service.fixtures';
import { authHeader, tokenFor } from '../common/auth';
import { successBody } from '../common/http-envelope';

describe(`DELETE ${SERVICE_ENDPOINTS.DELETE}`, () => {
  const ctx = setupServiceTestContext();

  it('deletes a service for real', async () => {
    const businessId = await createBusiness(ctx);
    const serviceId = await createService(ctx, { businessId });

    const url = SERVICE_ENDPOINTS.DELETE.replace(':serviceId', serviceId);

    const response = await request(ctx.app.getHttpServer())
      .delete(url)
      .set(
        authHeader(
          await tokenFor(ctx.sessionCacheService, 'Business Owner', businessId),
        ),
      )
      .expect(200);

    expect(successBody(response).data).toEqual({ message: 'success' });

    const row = await ctx.db
      .selectFrom('services')
      .select('id')
      .where('id', '=', serviceId)
      .executeTakeFirst();
    expect(row).toBeUndefined();
  });

  it('returns 404 for an unknown service id', async () => {
    const businessId = await createBusiness(ctx);

    const url = SERVICE_ENDPOINTS.DELETE.replace(':serviceId', randomUUID());

    await request(ctx.app.getHttpServer())
      .delete(url)
      .set(
        authHeader(
          await tokenFor(ctx.sessionCacheService, 'Business Owner', businessId),
        ),
      )
      .expect(404);
  });

  it('returns 401 when no Authorization header is sent', async () => {
    const businessId = await createBusiness(ctx);
    const serviceId = await createService(ctx, { businessId });

    const url = SERVICE_ENDPOINTS.DELETE.replace(':serviceId', serviceId);

    await request(ctx.app.getHttpServer()).delete(url).expect(401);
  });

  it('returns 403 for a role outside the allowed list', async () => {
    const businessId = await createBusiness(ctx);
    const serviceId = await createService(ctx, { businessId });

    const url = SERVICE_ENDPOINTS.DELETE.replace(':serviceId', serviceId);

    await request(ctx.app.getHttpServer())
      .delete(url)
      .set(
        authHeader(
          await tokenFor(ctx.sessionCacheService, 'Enhanced', businessId),
        ),
      )
      .expect(403);
  });
});
