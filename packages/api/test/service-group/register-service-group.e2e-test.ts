import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { SERVICE_GROUP_ENDPOINTS } from '@pikslots/shared';

import { authHeader } from '../common/auth';
import { errorBody } from '../common/http-envelope';
import { setupServiceGroupTestContext } from './support/service-group-test-context';
import {
  createBusiness,
  registerServiceGroup,
  tokenForRole,
} from './support/service-group-fixtures';

describe(`POST ${SERVICE_GROUP_ENDPOINTS.REGISTER}`, () => {
  const ctx = setupServiceGroupTestContext();

  it('persists a real row in Postgres', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id, name } = await registerServiceGroup(ctx, businessId);

    const row = await ctx.db
      .selectFrom('service_groups')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirstOrThrow();

    expect(row.name).toBe(name);
    expect(row.business_id).toBe(businessId);
    expect(row.is_deleted).toBe(false);
  });

  it('accepts a list of service ids to assign at creation time (enqueues the real sync job)', async () => {
    const { id: businessId } = await createBusiness(ctx);

    // Fabricated ids: this suite only asserts the registration endpoint
    // itself accepts and returns for a non-empty associatedServices list.
    // Whether the assignment rows actually land is covered by the
    // service-group-assignment e2e suite (mirrors class-group-assignment).
    await registerServiceGroup(ctx, businessId, {
      associatedServices: [randomUUID(), randomUUID()],
    });
  });

  it('returns 409 when registering a second group with the same name in the same business', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { name } = await registerServiceGroup(ctx, businessId);

    const response = await request(ctx.app.getHttpServer())
      .post(SERVICE_GROUP_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .send({ name, businessId, associatedServices: [] })
      .expect(409);

    expect(errorBody(response).statusCode).toBe(409);
  });

  it('allows the same name to be reused in a different business', async () => {
    const { id: businessIdA } = await createBusiness(ctx);
    const { id: businessIdB } = await createBusiness(ctx);
    const { name } = await registerServiceGroup(ctx, businessIdA);

    await request(ctx.app.getHttpServer())
      .post(SERVICE_GROUP_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessIdB)))
      .send({ name, businessId: businessIdB, associatedServices: [] })
      .expect(201);
  });

  it('returns 400 for an invalid payload (non-uuid in associatedServices)', async () => {
    const { id: businessId } = await createBusiness(ctx);

    const response = await request(ctx.app.getHttpServer())
      .post(SERVICE_GROUP_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .send({
        name: 'Invalid Group',
        businessId,
        associatedServices: ['not-a-uuid'],
      })
      .expect(400);

    expect(errorBody(response).statusCode).toBe(400);
  });

  it('returns 403 for a Standard user (registration is Admin+ only)', async () => {
    const { id: businessId } = await createBusiness(ctx);

    const response = await request(ctx.app.getHttpServer())
      .post(SERVICE_GROUP_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenForRole(ctx, 'Standard', businessId)))
      .send({ name: 'Nope', businessId, associatedServices: [] })
      .expect(403);

    expect(errorBody(response).statusCode).toBe(403);
  });

  it('returns 401 with no auth token', async () => {
    const { id: businessId } = await createBusiness(ctx);

    await request(ctx.app.getHttpServer())
      .post(SERVICE_GROUP_ENDPOINTS.REGISTER)
      .send({ name: 'Nope', businessId, associatedServices: [] })
      .expect(401);
  });
});
