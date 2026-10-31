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
  editService,
  waitForActiveAssignmentCountByGroup,
  tokenForRole,
} from './support/service-group-assignment-fixtures';

describe(`GET ${SERVICE_GROUP_ASSIGNMENT_ENDPOINTS.FIND_BY_GROUP}`, () => {
  const ctx = setupServiceGroupAssignmentTestContext();

  it('returns the service assigned to a group at service-creation time, once the real worker processes it', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceGroupId } = await registerServiceGroup(ctx, businessId);
    const { id: serviceId, title } = await registerService(ctx, businessId, {
      associatedServiceGroups: [serviceGroupId],
    });

    // Real Redis -> real BullMQ worker -> real SyncServiceServiceGroupsEventImpl,
    // asynchronously.
    await waitForActiveAssignmentCountByGroup(ctx, serviceGroupId, 1);

    const response = await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(SERVICE_GROUP_ASSIGNMENT_ENDPOINTS.FIND_BY_GROUP, {
          serviceGroupId,
        }),
      )
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual([
      { id: serviceId, name: title },
    ]);
  });

  it('returns an empty array for a group with no service assignments', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceGroupId } = await registerServiceGroup(ctx, businessId);

    const response = await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(SERVICE_GROUP_ASSIGNMENT_ENDPOINTS.FIND_BY_GROUP, {
          serviceGroupId,
        }),
      )
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual([]);
  });

  it('returns multiple services when a group has more than one assigned', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceGroupId } = await registerServiceGroup(ctx, businessId);
    const serviceA = await registerService(ctx, businessId, {
      associatedServiceGroups: [serviceGroupId],
    });
    const serviceB = await registerService(ctx, businessId, {
      associatedServiceGroups: [serviceGroupId],
    });

    await waitForActiveAssignmentCountByGroup(ctx, serviceGroupId, 2);

    const response = await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(SERVICE_GROUP_ASSIGNMENT_ENDPOINTS.FIND_BY_GROUP, {
          serviceGroupId,
        }),
      )
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual(
      expect.arrayContaining([
        { id: serviceA.id, name: serviceA.title },
        { id: serviceB.id, name: serviceB.title },
      ]),
    );
    expect(successBody(response).data).toHaveLength(2);
  });

  it('stops returning a service once it is removed via edit on the service', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceGroupId } = await registerServiceGroup(ctx, businessId);
    const { id: serviceId, title } = await registerService(ctx, businessId, {
      associatedServiceGroups: [serviceGroupId],
    });

    await waitForActiveAssignmentCountByGroup(ctx, serviceGroupId, 1);

    // Editing the service with an empty associatedServiceGroups list drops
    // the assignment — the edit use case always re-fires the sync event so
    // removals process, unlike register which only fires when non-empty.
    await editService(ctx, serviceId, businessId, {
      title,
      associatedServiceGroups: [],
    });

    await waitForActiveAssignmentCountByGroup(ctx, serviceGroupId, 0);

    const response = await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(SERVICE_GROUP_ASSIGNMENT_ENDPOINTS.FIND_BY_GROUP, {
          serviceGroupId,
        }),
      )
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual([]);
  });

  it('returns 401 when no auth token is provided', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceGroupId } = await registerServiceGroup(ctx, businessId);

    await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(SERVICE_GROUP_ASSIGNMENT_ENDPOINTS.FIND_BY_GROUP, {
          serviceGroupId,
        }),
      )
      .expect(401);
  });

  describe('known bug: no tenant isolation on lookup', () => {
    // Mirrors the FIND_GROUPS_BY_SERVICE bug documented in
    // find-groups-by-service.e2e-test.ts: FindServicesByGroupUseCaseImpl
    // never touches SecurityContext, and
    // ServiceGroupAssignmentRepositoryImpl.findServicesByGroup never
    // filters by business_id — it joins purely on
    // sga.service_group_id, scoped only by sga.is_deleted.
    //
    // Net effect: any authenticated user, from ANY business, can pass a
    // service group ID from a DIFFERENT business and read that business's
    // service names back.
    it("leaks another business's service names when given their serviceGroupId", async () => {
      const { id: businessA } = await createBusiness(ctx);
      const { id: businessB } = await createBusiness(ctx);
      const { id: serviceGroupIdInB } = await registerServiceGroup(
        ctx,
        businessB,
      );
      const svcB = await registerService(ctx, businessB, {
        associatedServiceGroups: [serviceGroupIdInB],
      });
      await waitForActiveAssignmentCountByGroup(ctx, serviceGroupIdInB, 1);

      // Caller is an Admin of business A, asking about a group that
      // belongs to business B.
      const response = await request(ctx.app.getHttpServer())
        .get(
          endpointForParams(SERVICE_GROUP_ASSIGNMENT_ENDPOINTS.FIND_BY_GROUP, {
            serviceGroupId: serviceGroupIdInB,
          }),
        )
        .set(authHeader(await tokenForRole(ctx, 'Admin', businessA)))
        .expect(200);

      // Documents the leak: business A's Admin sees business B's service.
      expect(successBody(response).data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: svcB.id, name: svcB.title }),
        ]),
      );
    });
  });
});
