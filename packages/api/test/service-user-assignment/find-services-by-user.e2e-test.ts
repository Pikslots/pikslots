import request from 'supertest';
import { SERVICE_USER_ASSIGNMENT_ENDPOINTS } from '@pikslots/shared';

import { successBody } from '../common/http-envelope';
import { endpointForParams } from '../common/endpoint-path';
import { setupServiceUserAssignmentTestContext } from './support/service-user-assignment-test-context';
import {
  createBusiness,
  createStaffUser,
  registerService,
  createAssignment,
  removeUserFromService,
  findServicesByUser,
  waitForActiveAssignmentCountByUser,
  tokenForRole,
} from './support/service-user-assignment-fixtures';

describe(`GET ${SERVICE_USER_ASSIGNMENT_ENDPOINTS.FIND_SERVICES_BY_USER}`, () => {
  const ctx = setupServiceUserAssignmentTestContext();

  it('returns a service assigned via the direct assign endpoint', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const {
      id: serviceId,
      title,
      durationInMins,
      bufferTimeInMins,
      cost,
      colorCode,
    } = await registerService(ctx, businessId);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const token = await tokenForRole(ctx, 'Admin', businessId);
    await createAssignment(ctx, { serviceId, userId, businessId }, token);

    const response = await findServicesByUser(ctx, userId, token);

    expect(response.status).toBe(200);
    expect(successBody(response).data).toEqual([
      {
        id: serviceId,
        title,
        durationInMins,
        bufferTimeInMins,
        cost,
        colorCode,
      },
    ]);
  });

  it('returns a service assigned via registering it with associatedUsers, once the real worker processes it', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const {
      id: serviceId,
      title,
      durationInMins,
      bufferTimeInMins,
      cost,
      colorCode,
    } = await registerService(ctx, businessId, {
      associatedUsers: [userId],
    });

    await waitForActiveAssignmentCountByUser(ctx, userId, 1);

    const response = await findServicesByUser(
      ctx,
      userId,
      await tokenForRole(ctx, 'Admin', businessId),
    );

    expect(response.status).toBe(200);
    expect(successBody(response).data).toEqual([
      {
        id: serviceId,
        title,
        durationInMins,
        bufferTimeInMins,
        cost,
        colorCode,
      },
    ]);
  });

  it('returns an empty array for a user with no assigned services', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');

    const response = await findServicesByUser(
      ctx,
      userId,
      await tokenForRole(ctx, 'Admin', businessId),
    );

    expect(response.status).toBe(200);
    expect(successBody(response).data).toEqual([]);
  });

  it('returns multiple services when a user is assigned to more than one', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const serviceA = await registerService(ctx, businessId);
    const serviceB = await registerService(ctx, businessId);
    const token = await tokenForRole(ctx, 'Admin', businessId);
    await createAssignment(
      ctx,
      { serviceId: serviceA.id, userId, businessId },
      token,
    );
    await createAssignment(
      ctx,
      { serviceId: serviceB.id, userId, businessId },
      token,
    );

    const response = await findServicesByUser(ctx, userId, token);

    expect(response.status).toBe(200);
    expect(successBody(response).data).toEqual(
      expect.arrayContaining([
        {
          id: serviceA.id,
          title: serviceA.title,
          durationInMins: serviceA.durationInMins,
          bufferTimeInMins: serviceA.bufferTimeInMins,
          cost: serviceA.cost,
          colorCode: serviceA.colorCode,
        },
        {
          id: serviceB.id,
          title: serviceB.title,
          durationInMins: serviceB.durationInMins,
          bufferTimeInMins: serviceB.bufferTimeInMins,
          cost: serviceB.cost,
          colorCode: serviceB.colorCode,
        },
      ]),
    );
    expect(successBody(response).data).toHaveLength(2);
  });

  it('stops returning a service once the user is removed via the direct remove endpoint', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceId } = await registerService(ctx, businessId);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const token = await tokenForRole(ctx, 'Admin', businessId);
    await createAssignment(ctx, { serviceId, userId, businessId }, token);

    await removeUserFromService(ctx, serviceId, userId, token).then((res) =>
      expect(res.status).toBe(200),
    );

    const response = await findServicesByUser(ctx, userId, token);

    expect(response.status).toBe(200);
    expect(successBody(response).data).toEqual([]);
  });

  it('returns 401 when no auth token is provided', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');

    await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(
          SERVICE_USER_ASSIGNMENT_ENDPOINTS.FIND_SERVICES_BY_USER,
          { userId },
        ),
      )
      .expect(401);
  });

  describe('known bug: no tenant isolation on lookup', () => {
    // Mirrors find-users-by-service.e2e-test.ts's read-leak bug:
    // FindServicesByUserUseCaseImpl never touches SecurityContext, and
    // ServiceUserAssignmentRepositoryImpl.findServicesByUser never filters
    // by business_id -- it joins purely on sua.user_id, scoped only by
    // sua.is_deleted.
    it("leaks another business's assigned service when given their userId", async () => {
      const { id: businessA } = await createBusiness(ctx);
      const { id: businessB } = await createBusiness(ctx);
      const { id: userIdInB } = await createStaffUser(
        ctx,
        businessB,
        'Standard',
      );
      const {
        id: serviceIdInB,
        title,
        durationInMins,
        bufferTimeInMins,
        cost,
        colorCode,
      } = await registerService(ctx, businessB, {
        associatedUsers: [userIdInB],
      });
      await waitForActiveAssignmentCountByUser(ctx, userIdInB, 1);

      // Caller is an Admin of business A, asking about a user who belongs
      // to business B.
      const response = await findServicesByUser(
        ctx,
        userIdInB,
        await tokenForRole(ctx, 'Admin', businessA),
      );

      expect(response.status).toBe(200);
      // Documents the leak: business A's Admin sees business B's service.
      expect(successBody(response).data).toEqual([
        {
          id: serviceIdInB,
          title,
          durationInMins,
          bufferTimeInMins,
          cost,
          colorCode,
        },
      ]);
    });
  });
});
