import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { SERVICE_GROUP_ENDPOINTS } from '@pikslots/shared';

import { authHeader } from '../common/auth';
import { errorBody } from '../common/http-envelope';
import { setupServiceGroupTestContext } from './support/service-group-test-context';
import {
  createBusiness,
  registerServiceGroup,
  editServiceGroupPath,
  tokenForRole,
} from './support/service-group-fixtures';

describe(`PATCH ${SERVICE_GROUP_ENDPOINTS.EDIT}`, () => {
  const ctx = setupServiceGroupTestContext();

  it('renames the group in Postgres', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id } = await registerServiceGroup(ctx, businessId);
    const newName = `Renamed ${randomUUID().slice(0, 8)}`;

    await request(ctx.app.getHttpServer())
      .patch(editServiceGroupPath(id))
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .send({ name: newName, businessId, serviceIds: [] })
      .expect(200);

    const row = await ctx.db
      .selectFrom('service_groups')
      .select('name')
      .where('id', '=', id)
      .executeTakeFirstOrThrow();
    expect(row.name).toBe(newName);
  });

  it('is a no-op on the name when the payload name matches the current name', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id, name } = await registerServiceGroup(ctx, businessId);

    await request(ctx.app.getHttpServer())
      .patch(editServiceGroupPath(id))
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .send({ name, businessId, serviceIds: [] })
      .expect(200);
  });

  it('returns 409 when renaming to a name already used by another group in the same business', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: groupAId } = await registerServiceGroup(ctx, businessId);
    const { name: groupBName } = await registerServiceGroup(ctx, businessId);

    const response = await request(ctx.app.getHttpServer())
      .patch(editServiceGroupPath(groupAId))
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .send({ name: groupBName, businessId, serviceIds: [] })
      .expect(409);

    expect(errorBody(response).statusCode).toBe(409);
  });

  it('returns 404 when editing a group that does not exist', async () => {
    const { id: businessId } = await createBusiness(ctx);

    const response = await request(ctx.app.getHttpServer())
      .patch(editServiceGroupPath(randomUUID()))
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .send({ name: 'Whatever', businessId, serviceIds: [] })
      .expect(404);

    expect(errorBody(response).statusCode).toBe(404);
  });

  it('returns 403 for a Standard user (editing is Admin+ only)', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id, name } = await registerServiceGroup(ctx, businessId);

    const response = await request(ctx.app.getHttpServer())
      .patch(editServiceGroupPath(id))
      .set(authHeader(await tokenForRole(ctx, 'Standard', businessId)))
      .send({ name, businessId, serviceIds: [] })
      .expect(403);

    expect(errorBody(response).statusCode).toBe(403);
  });

  it('returns 400 for an invalid payload (non-uuid in serviceIds)', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id, name } = await registerServiceGroup(ctx, businessId);

    const response = await request(ctx.app.getHttpServer())
      .patch(editServiceGroupPath(id))
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .send({ name, businessId, serviceIds: ['not-a-uuid'] })
      .expect(400);

    expect(errorBody(response).statusCode).toBe(400);
  });
});
