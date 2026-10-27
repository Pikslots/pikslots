import request from 'supertest';
import { SERVICE_GROUP_ASSIGNMENT_ENDPOINTS } from '@pikslots/shared';

import { endpointForParams } from '../common/endpoint-path';
import { authHeader } from '../common/auth';
import { successBody } from '../common/http-envelope';
import { setupServiceGroupAssignmentTestContext } from './support/service-group-assignment-test-context';
import {
  createBusiness,
  registerService,
  registerServiceGroup,
  editServiceGroup,
  waitForActiveAssignmentCountByService,
  tokenForRole,
} from './support/service-group-assignment-fixtures';

describe(`GET ${SERVICE_GROUP_ASSIGNMENT_ENDPOINTS.FIND_GROUPS_BY_SERVICE}`, () => {
  const ctx = setupServiceGroupAssignmentTestContext();

  it('returns the group assigned to a service at group-creation time, once the real worker processes it', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceId } = await registerService(ctx, businessId);
    const { id: serviceGroupId, name } = await registerServiceGroup(
      ctx,
      businessId,
      {
        associatedServices: [serviceId],
      },
    );

    // Real Redis -> real BullMQ worker -> real SyncServiceGroupServicesEventImpl,
    // asynchronously.
    await waitForActiveAssignmentCountByService(ctx, serviceId, 1);

    const response = await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(
          SERVICE_GROUP_ASSIGNMENT_ENDPOINTS.FIND_GROUPS_BY_SERVICE,
          { serviceId },
        ),
      )
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual([{ id: serviceGroupId, name }]);
  });

  it('returns an empty array for a service with no group assignments', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceId } = await registerService(ctx, businessId);

    const response = await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(
          SERVICE_GROUP_ASSIGNMENT_ENDPOINTS.FIND_GROUPS_BY_SERVICE,
          { serviceId },
        ),
      )
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual([]);
  });

  it('returns multiple groups when a service belongs to more than one', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceId } = await registerService(ctx, businessId);
    const groupA = await registerServiceGroup(ctx, businessId, {
      associatedServices: [serviceId],
    });
    const groupB = await registerServiceGroup(ctx, businessId, {
      associatedServices: [serviceId],
    });

    await waitForActiveAssignmentCountByService(ctx, serviceId, 2);

    const response = await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(
          SERVICE_GROUP_ASSIGNMENT_ENDPOINTS.FIND_GROUPS_BY_SERVICE,
          { serviceId },
        ),
      )
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual(
      expect.arrayContaining([
        { id: groupA.id, name: groupA.name },
        { id: groupB.id, name: groupB.name },
      ]),
    );
    expect(successBody(response).data).toHaveLength(2);
  });

  it('stops returning a group once it is removed via edit on the group', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceId } = await registerService(ctx, businessId);
    const { id: serviceGroupId, name } = await registerServiceGroup(
      ctx,
      businessId,
      {
        associatedServices: [serviceId],
      },
    );

    await waitForActiveAssignmentCountByService(ctx, serviceId, 1);

    // Editing the group with an empty serviceIds list drops the assignment —
    // the edit use case always re-fires the sync event so removals process.
    await editServiceGroup(ctx, serviceGroupId, businessId, {
      name,
      serviceIds: [],
    });

    await waitForActiveAssignmentCountByService(ctx, serviceId, 0);

    const response = await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(
          SERVICE_GROUP_ASSIGNMENT_ENDPOINTS.FIND_GROUPS_BY_SERVICE,
          { serviceId },
        ),
      )
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual([]);
  });

  it('returns 401 when no auth token is provided', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceId } = await registerService(ctx, businessId);

    await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(
          SERVICE_GROUP_ASSIGNMENT_ENDPOINTS.FIND_GROUPS_BY_SERVICE,
          { serviceId },
        ),
      )
      .expect(401);
  });

  describe('known bug: no tenant isolation on lookup', () => {
    // FindGroupsByServiceUseCaseImpl.execute(serviceId) never touches
    // SecurityContext, and ServiceGroupAssignmentRepositoryImpl.findGroupsByService
    // never filters by business_id (see the query in
    // service.group.assignment.repository.impl.ts — it joins
    // service_group_assignments -> service_groups purely on
    // sga.service_group_id, scoped only by sga.service_id and
    // sga.is_deleted). The controller's @Roles() check only confirms the
    // caller holds an allowed ROLE, not that the serviceId they're asking
    // about belongs to their own business.
    //
    // Net effect: any authenticated user, from ANY business, can pass a
    // service ID from a DIFFERENT business and read that business's group
    // names back. This test documents the actual (undesirable) current
    // behavior — a real cross-tenant read — rather than asserting the
    // fix, since "what SHOULD happen" (401? empty array?) is a product
    // decision for whoever prioritizes this.
    it('leaks another businesss group names when given their serviceId', async () => {
      const { id: businessA } = await createBusiness(ctx);
      const { id: businessB } = await createBusiness(ctx);
      const { id: serviceIdInB } = await registerService(ctx, businessB);
      const { name } = await registerServiceGroup(ctx, businessB, {
        associatedServices: [serviceIdInB],
      });
      await waitForActiveAssignmentCountByService(ctx, serviceIdInB, 1);

      // Caller is an Admin of business A, asking about a service that
      // belongs to business B.
      const response = await request(ctx.app.getHttpServer())
        .get(
          endpointForParams(
            SERVICE_GROUP_ASSIGNMENT_ENDPOINTS.FIND_GROUPS_BY_SERVICE,
            { serviceId: serviceIdInB },
          ),
        )
        .set(authHeader(await tokenForRole(ctx, 'Admin', businessA)))
        .expect(200);

      // Documents the leak: business A's Admin sees business B's group name.
      expect(successBody(response).data).toEqual(
        expect.arrayContaining([expect.objectContaining({ name })]),
      );
    });
  });
});
