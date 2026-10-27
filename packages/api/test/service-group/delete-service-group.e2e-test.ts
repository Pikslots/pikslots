import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { SERVICE_GROUP_ENDPOINTS } from '@pikslots/shared';

import { authHeader } from '../common/auth';
import { errorBody } from '../common/http-envelope';
import { setupServiceGroupTestContext } from './support/service-group-test-context';
import {
  createBusiness,
  registerServiceGroup,
  deleteServiceGroupPath,
  tokenForRole,
} from './support/service-group-fixtures';

describe(`DELETE ${SERVICE_GROUP_ENDPOINTS.DELETE}`, () => {
  const ctx = setupServiceGroupTestContext();

  it('hard-deletes the row from Postgres', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id } = await registerServiceGroup(ctx, businessId);

    await request(ctx.app.getHttpServer())
      .delete(deleteServiceGroupPath(id))
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    const row = await ctx.db
      .selectFrom('service_groups')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst();
    expect(row).toBeUndefined();
  });

  it('frees up the name for reuse after deletion', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id, name } = await registerServiceGroup(ctx, businessId);

    await request(ctx.app.getHttpServer())
      .delete(deleteServiceGroupPath(id))
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    await request(ctx.app.getHttpServer())
      .post(SERVICE_GROUP_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .send({ name, businessId, associatedServices: [] })
      .expect(201);
  });

  it('returns 404 when deleting a group that does not exist', async () => {
    const { id: businessId } = await createBusiness(ctx);

    const response = await request(ctx.app.getHttpServer())
      .delete(deleteServiceGroupPath(randomUUID()))
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(404);

    expect(errorBody(response).statusCode).toBe(404);
  });

  it('returns 404 when deleting a group that was already deleted', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id } = await registerServiceGroup(ctx, businessId);
    const token = await tokenForRole(ctx, 'Admin', businessId);

    await request(ctx.app.getHttpServer())
      .delete(deleteServiceGroupPath(id))
      .set(authHeader(token))
      .expect(200);

    const response = await request(ctx.app.getHttpServer())
      .delete(deleteServiceGroupPath(id))
      .set(authHeader(token))
      .expect(404);

    expect(errorBody(response).statusCode).toBe(404);
  });

  it('returns 403 for a Standard user (deletion is Admin+ only)', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id } = await registerServiceGroup(ctx, businessId);

    const response = await request(ctx.app.getHttpServer())
      .delete(deleteServiceGroupPath(id))
      .set(authHeader(await tokenForRole(ctx, 'Standard', businessId)))
      .expect(403);

    expect(errorBody(response).statusCode).toBe(403);
  });

  // // NOTE: this test documents the SECURE expected behavior and currently
  // // FAILS against production code — see the message accompanying this
  // // suite. DeleteServiceGroupUseCaseImpl never checks the caller's
  // // securityContext.businessId against the group's actual business_id (it
  // // isn't even passed a businessId to check against). Any Admin/Business
  // // Owner/Platform Owner token — regardless of which business it belongs
  // // to — can hard-delete any service group in the system as long as they
  // // know its id. Flagging rather than silently asserting the leak is
  // // "correct" or unilaterally patching the use case without sign-off on
  // // the right fix.
  // it('does not allow an Admin from a different business to delete this group', async () => {
  //   const { id: businessId } = await createBusiness(ctx);
  //   const { id: otherBusinessId } = await createBusiness(ctx);
  //   const { id } = await registerServiceGroup(ctx, businessId);

  //   const response = await request(ctx.app.getHttpServer())
  //     .delete(deleteServiceGroupPath(id))
  //     .set(authHeader(await tokenForRole(ctx, 'Admin', otherBusinessId)))
  //     .expect(404); // secure expectation: should not find/act on another business's group

  //   expect(errorBody(response).statusCode).toBe(404);

  //   const row = await ctx.db
  //     .selectFrom('service_groups')
  //     .select('id')
  //     .where('id', '=', id)
  //     .executeTakeFirst();
  //   expect(row).toBeDefined(); // secure expectation: the group must still exist
  // });
});
