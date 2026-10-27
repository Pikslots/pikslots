import request from 'supertest';
import { SERVICE_GROUP_ENDPOINTS } from '@pikslots/shared';

import { authHeader } from '../common/auth';
import { successBody } from '../common/http-envelope';
import { setupServiceGroupTestContext } from './support/service-group-test-context';
import {
  createBusiness,
  registerServiceGroup,
  deleteServiceGroupPath,
  findAllByBusinessPath,
  tokenForRole,
} from './support/service-group-fixtures';

describe(`GET ${SERVICE_GROUP_ENDPOINTS.FIND_ALL_BY_BUSINESS}`, () => {
  const ctx = setupServiceGroupTestContext();

  it('returns all active groups for a business', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const groupA = await registerServiceGroup(ctx, businessId);
    const groupB = await registerServiceGroup(ctx, businessId);

    const response = await request(ctx.app.getHttpServer())
      .get(findAllByBusinessPath(businessId))
      .set(authHeader(await tokenForRole(ctx, 'Standard', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual(
      expect.arrayContaining([
        { id: groupA.id, name: groupA.name, businessId },
        { id: groupB.id, name: groupB.name, businessId },
      ]),
    );
    expect(successBody(response).data).toHaveLength(2);
  });

  it('returns an empty array for a business with no groups', async () => {
    const { id: businessId } = await createBusiness(ctx);

    const response = await request(ctx.app.getHttpServer())
      .get(findAllByBusinessPath(businessId))
      .set(authHeader(await tokenForRole(ctx, 'Standard', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual([]);
  });

  it('excludes a group after it has been deleted', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id } = await registerServiceGroup(ctx, businessId);

    await request(ctx.app.getHttpServer())
      .delete(deleteServiceGroupPath(id))
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    const response = await request(ctx.app.getHttpServer())
      .get(findAllByBusinessPath(businessId))
      .set(authHeader(await tokenForRole(ctx, 'Standard', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual([]);
  });

  it('returns 401 with no auth token', async () => {
    const { id: businessId } = await createBusiness(ctx);

    await request(ctx.app.getHttpServer())
      .get(findAllByBusinessPath(businessId))
      .expect(401);
  });

  it("returns groups for any business regardless of the caller's own businessId", async () => {
    // NOTE: documents current behavior, not necessarily desired behavior —
    // see the message accompanying this suite. This endpoint is missing
    // @UseGuards(RolesGuard) entirely (every other handler in this
    // controller has it), and the use case never checks the caller's
    // business against the requested businessId path param. In practice
    // this doesn't grant extra *roles* (all 5 defined roles are already
    // allowed), but it does mean read access to another business's group
    // list isn't actually gated on anything but a valid JWT.
    const { id: businessId } = await createBusiness(ctx);
    const { id: otherBusinessId } = await createBusiness(ctx);
    await registerServiceGroup(ctx, businessId);

    await request(ctx.app.getHttpServer())
      .get(findAllByBusinessPath(businessId))
      .set(authHeader(await tokenForRole(ctx, 'Standard', otherBusinessId)))
      .expect(200);
  });
});
