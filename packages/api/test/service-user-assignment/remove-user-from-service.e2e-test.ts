import { SERVICE_USER_ASSIGNMENT_ENDPOINTS } from '@pikslots/shared';

import { errorBody } from '../common/http-envelope';
import { setupServiceUserAssignmentTestContext } from './support/service-user-assignment-test-context';
import {
  createBusiness,
  createStaffUser,
  registerService,
  createAssignment,
  removeUserFromService,
  tokenForRole,
} from './support/service-user-assignment-fixtures';

describe(`DELETE ${SERVICE_USER_ASSIGNMENT_ENDPOINTS.REMOVE_USER}`, () => {
  const ctx = setupServiceUserAssignmentTestContext();

  it('soft-deletes a real row in Postgres', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceId } = await registerService(ctx, businessId);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const token = await tokenForRole(ctx, 'Admin', businessId);
    const assignment = await createAssignment(
      ctx,
      { serviceId, userId, businessId },
      token,
    );

    const response = await removeUserFromService(ctx, serviceId, userId, token);

    expect(response.status).toBe(200);

    const row = await ctx.db
      .selectFrom('service_user_assignments')
      .selectAll()
      .where('id', '=', assignment.id)
      .executeTakeFirstOrThrow();
    expect(row.is_deleted).toBe(true);
    expect(row.deleted_at).not.toBeNull();
  });

  it('returns 404 when no assignment exists for the given service/user pair', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceId } = await registerService(ctx, businessId);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');

    const response = await removeUserFromService(
      ctx,
      serviceId,
      userId,
      await tokenForRole(ctx, 'Admin', businessId),
    );

    expect(response.status).toBe(404);
    expect(errorBody(response).statusCode).toBe(404);
  });

  it('returns 404 when the assignment was already removed', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceId } = await registerService(ctx, businessId);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const token = await tokenForRole(ctx, 'Admin', businessId);

    await createAssignment(ctx, { serviceId, userId, businessId }, token);
    await removeUserFromService(ctx, serviceId, userId, token).then((res) =>
      expect(res.status).toBe(200),
    );

    const response = await removeUserFromService(ctx, serviceId, userId, token);

    expect(response.status).toBe(404);
    expect(errorBody(response).statusCode).toBe(404);
  });

  it('returns 403 for a Standard user (not in the remove-user role list)', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceId } = await registerService(ctx, businessId);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    await createAssignment(
      ctx,
      { serviceId, userId, businessId },
      await tokenForRole(ctx, 'Admin', businessId),
    );

    const response = await removeUserFromService(
      ctx,
      serviceId,
      userId,
      await tokenForRole(ctx, 'Standard', businessId),
    );

    expect(response.status).toBe(403);
  });

  describe('known bug: no tenant isolation on write', () => {
    // Mirrors assign-user-to-service.e2e-test.ts's "known bug" block:
    // RemoveUserFromServiceUseCaseImpl never touches SecurityContext and
    // never checks the caller's own business against the assignment's
    // business_id -- it looks the assignment up purely by
    // (serviceId, userId) and, if found, soft-deletes it.
    it('lets an Admin from business A remove a business B assignment', async () => {
      const { id: businessB } = await createBusiness(ctx);
      const { id: businessA } = await createBusiness(ctx);
      const { id: serviceIdInB } = await registerService(ctx, businessB);
      const { id: userIdInB } = await createStaffUser(
        ctx,
        businessB,
        'Standard',
      );
      await createAssignment(
        ctx,
        { serviceId: serviceIdInB, userId: userIdInB, businessId: businessB },
        await tokenForRole(ctx, 'Admin', businessB),
      );

      const response = await removeUserFromService(
        ctx,
        serviceIdInB,
        userIdInB,
        await tokenForRole(ctx, 'Admin', businessA),
      );

      expect(response.status).toBe(200);
    });
  });
});
