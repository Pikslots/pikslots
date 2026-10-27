import request from 'supertest';
import {
  SERVICE_ENDPOINTS,
  type RegisterServiceResponse,
} from '@pikslots/shared';
import { setupServiceTestContext } from './support/service.test.context';
import { createBusiness, registerPayload } from './support/service.fixtures';
import { authHeader, tokenFor } from '../common/auth';
import { successBody, errorBody } from '../common/http-envelope';

describe(`POST ${SERVICE_ENDPOINTS.REGISTER}`, () => {
  const ctx = setupServiceTestContext();

  it('persists a real service row for the business', async () => {
    const businessId = await createBusiness(ctx);
    const payload = await registerPayload(ctx, { businessId });

    const response = await request(ctx.app.getHttpServer())
      .post(SERVICE_ENDPOINTS.REGISTER)
      .set(
        authHeader(await tokenFor(ctx.sessionCacheService, 'Business Owner', businessId)),
      )
      .send(payload)
      .expect(201);

    expect(successBody<RegisterServiceResponse>(response).data).toEqual({
      message: 'success',
    });

    const row = await ctx.db
      .selectFrom('services')
      .selectAll()
      .where('business_id', '=', businessId)
      .where('title', '=', payload.title)
      .executeTakeFirstOrThrow();
    ctx.createdServiceIds.push(row.id);

    expect(row.business_id).toBe(businessId);
    expect(row.title).toBe(payload.title);
    expect(row.description).toBe(payload.description);
    expect(row.duration_in_mins).toBe(payload.durationInMins);
    expect(row.buffer_time_in_mins).toBe(payload.bufferTimeInMins);
    expect(row.cost).toBe(payload.cost);
    expect(row.is_hidden_from_booking_page).toBe(
      payload.isHiddenFromBookingPage,
    );
    expect(row.color_code).toBe(payload.colorCode);
    expect(row.is_deleted).toBe(false);
  });

  it('allows a Platform Owner to register a service for any business', async () => {
    const businessId = await createBusiness(ctx);
    const payload = await registerPayload(ctx, { businessId });

    await request(ctx.app.getHttpServer())
      .post(SERVICE_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Platform Owner')))
      .send(payload)
      .expect(201);
  });

  it('returns 400 when no team member is assigned', async () => {
    const businessId = await createBusiness(ctx);
    const payload = await registerPayload(ctx, {
      businessId,
      associatedUsers: [],
    });

    const response = await request(ctx.app.getHttpServer())
      .post(SERVICE_ENDPOINTS.REGISTER)
      .set(
        authHeader(await tokenFor(ctx.sessionCacheService, 'Business Owner', businessId)),
      )
      .send(payload)
      .expect(400);

    expect(errorBody(response).statusCode).toBe(400);
    expect(errorBody(response).message).toContain('associatedUsers');

    const row = await ctx.db
      .selectFrom('services')
      .select('id')
      .where('business_id', '=', businessId)
      .where('title', '=', payload.title)
      .executeTakeFirst();

    expect(row).toBeUndefined();
  });

  it('returns 400 for an invalid payload', async () => {
    const businessId = await createBusiness(ctx);

    const response = await request(ctx.app.getHttpServer())
      .post(SERVICE_ENDPOINTS.REGISTER)
      .set(
        authHeader(await tokenFor(ctx.sessionCacheService, 'Business Owner', businessId)),
      )
      .send({})
      .expect(400);

    expect(errorBody(response).statusCode).toBe(400);
    expect(typeof errorBody(response).message).toBe('string');
  });

  it('returns 401 when no Authorization header is sent', async () => {
    const businessId = await createBusiness(ctx);
    const payload = await registerPayload(ctx, { businessId });

    await request(ctx.app.getHttpServer())
      .post(SERVICE_ENDPOINTS.REGISTER)
      .send(payload)
      .expect(401);
  });

  it('returns 403 for a role outside the allowed list', async () => {
    const businessId = await createBusiness(ctx);
    const payload = await registerPayload(ctx, { businessId });

    await request(ctx.app.getHttpServer())
      .post(SERVICE_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Enhanced', businessId)))
      .send(payload)
      .expect(403);
  });

  it('returns 401 for a Business Owner registering a service outside their own business', async () => {
    const ownBusinessId = await createBusiness(ctx);
    const otherBusinessId = await createBusiness(ctx);
    const payload = await registerPayload(ctx, { businessId: ownBusinessId });

    await request(ctx.app.getHttpServer())
      .post(SERVICE_ENDPOINTS.REGISTER)
      .set(
        authHeader(
          await tokenFor(ctx.sessionCacheService, 'Business Owner', otherBusinessId),
        ),
      )
      .send(payload)
      .expect(401);
  });
});
