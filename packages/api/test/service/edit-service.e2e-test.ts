import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { SERVICE_ENDPOINTS } from '@pikslots/shared';
import { setupServiceTestContext } from './support/service.test.context';
import {
  createBusiness,
  createService,
  editServicePayload,
  findServiceById,
} from './support/service.fixtures';
import { authHeader, tokenFor } from '../common/auth';
import { successBody, errorBody } from '../common/http-envelope';

describe(`PATCH ${SERVICE_ENDPOINTS.UPDATE}`, () => {
  const ctx = setupServiceTestContext();

  it('updates a service and persists the changes for real', async () => {
    const businessId = await createBusiness(ctx);
    const serviceId = await createService(ctx, { businessId });

    const payload = await editServicePayload(ctx, businessId, {
      title: 'Updated Service Title',
      cost: 750,
      durationInMins: 55,
    });

    const url = SERVICE_ENDPOINTS.UPDATE.replace(':serviceId', serviceId);

    const response = await request(ctx.app.getHttpServer())
      .patch(url)
      .set(
        authHeader(await tokenFor(ctx.sessionCacheService, 'Business Owner', businessId)),
      )
      .send(payload)
      .expect(200);

    expect(successBody(response).data).toEqual({ message: 'success' });

    const row = await findServiceById(ctx, serviceId);
    expect(row.title).toBe(payload.title);
    expect(row.description).toBe(payload.description);
    expect(row.cost).toBe(payload.cost);
    expect(row.duration_in_mins).toBe(payload.durationInMins);
    expect(row.buffer_time_in_mins).toBe(payload.bufferTimeInMins);
    expect(row.is_hidden_from_booking_page).toBe(
      payload.isHiddenFromBookingPage,
    );
    expect(row.color_code).toBe(payload.colorCode);
  });

  it('returns 404 for an unknown service id', async () => {
    const businessId = await createBusiness(ctx);

    const url = SERVICE_ENDPOINTS.UPDATE.replace(':serviceId', randomUUID());

    await request(ctx.app.getHttpServer())
      .patch(url)
      .set(
        authHeader(await tokenFor(ctx.sessionCacheService, 'Business Owner', businessId)),
      )
      .send(await editServicePayload(ctx, businessId))
      .expect(404);
  });

  it('returns 401 when no Authorization header is sent', async () => {
    const businessId = await createBusiness(ctx);
    const serviceId = await createService(ctx, { businessId });

    const url = SERVICE_ENDPOINTS.REGISTER.replace(':serviceId', serviceId);

    await request(ctx.app.getHttpServer())
      .patch(url)
      .send(await editServicePayload(ctx, businessId))
      .expect(401);
  });

  it('returns 403 for a role outside the allowed list', async () => {
    const businessId = await createBusiness(ctx);
    const serviceId = await createService(ctx, { businessId });

    const url = SERVICE_ENDPOINTS.UPDATE.replace(':serviceId', serviceId);

    await request(ctx.app.getHttpServer())
      .patch(url)
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Enhanced', businessId)))
      .send(await editServicePayload(ctx, businessId))
      .expect(403);
  });

  it('returns 401 for a Business Owner editing a service outside their own business', async () => {
    const ownBusinessId = await createBusiness(ctx);
    const otherBusinessId = await createBusiness(ctx);
    const serviceId = await createService(ctx, { businessId: ownBusinessId });

    const url = SERVICE_ENDPOINTS.UPDATE.replace(':serviceId', serviceId);

    await request(ctx.app.getHttpServer())
      .patch(url)
      .set(
        authHeader(
          await tokenFor(ctx.sessionCacheService, 'Business Owner', otherBusinessId),
        ),
      )
      .send(await editServicePayload(ctx, ownBusinessId))
      .expect(401);
  });

  it('returns 400 when the edit would remove every assigned team member', async () => {
    const businessId = await createBusiness(ctx);
    const serviceId = await createService(ctx, { businessId });

    const url = SERVICE_ENDPOINTS.UPDATE.replace(':serviceId', serviceId);
    const payload = await editServicePayload(ctx, businessId, {
      associatedUsers: [],
    });

    const response = await request(ctx.app.getHttpServer())
      .patch(url)
      .set(
        authHeader(await tokenFor(ctx.sessionCacheService, 'Business Owner', businessId)),
      )
      .send(payload)
      .expect(400);

    expect(errorBody(response).statusCode).toBe(400);
    expect(errorBody(response).message).toContain('associatedUsers');

    const row = await findServiceById(ctx, serviceId);
    expect(row.title).not.toBe(payload.title);
  });

  it('returns 400 for an invalid payload', async () => {
    const businessId = await createBusiness(ctx);
    const serviceId = await createService(ctx, { businessId });

    const url = SERVICE_ENDPOINTS.UPDATE_SERVICE_AVATAR.replace(
      ':serviceId',
      serviceId,
    );

    const response = await request(ctx.app.getHttpServer())
      .patch(url)
      .set(
        authHeader(await tokenFor(ctx.sessionCacheService, 'Business Owner', businessId)),
      )
      .send({ title: 'missing required fields' })
      .expect(400);

    expect(errorBody(response).statusCode).toBe(400);
  });
});
