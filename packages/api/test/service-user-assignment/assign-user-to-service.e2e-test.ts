import { SERVICE_USER_ASSIGNMENT_ENDPOINTS } from '@pikslots/shared';

import { successBody, errorBody } from '../common/http-envelope';
import { setupServiceUserAssignmentTestContext } from './support/service-user-assignment-test-context';
import {
  createBusiness,
  createStaffUser,
  registerService,
  assignUserToService,
  createAssignment,
  removeUserFromService,
  tokenForRole,
} from './support/service-user-assignment-fixtures';

describe(`POST ${SERVICE_USER_ASSIGNMENT_ENDPOINTS.ASSIGN_USER}`, () => {
  const ctx = setupServiceUserAssignmentTestContext();

  it('creates a real row in Postgres and echoes it back', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceId } = await registerService(ctx, businessId);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');

    const response = await assignUserToService(
      ctx,
      { serviceId, userId, businessId },
      await tokenForRole(ctx, 'Admin', businessId),
    );

    expect(response.status).toBe(201);
    const data = successBody<Record<string, unknown>>(response).data;
    expect(data.serviceId).toBe(serviceId);
    expect(data.userId).toBe(userId);
    expect(data.businessId).toBe(businessId);
    expect(data.id).toBeTruthy();

    const row = await ctx.db
      .selectFrom('service_user_assignments')
      .selectAll()
      .where('id', '=', data.id as string)
      .executeTakeFirstOrThrow();
    expect(row.service_id).toBe(serviceId);
    expect(row.user_id).toBe(userId);
    expect(row.is_deleted).toBe(false);
  });

  it('returns 409 when the user is already actively assigned to the service', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceId } = await registerService(ctx, businessId);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const token = await tokenForRole(ctx, 'Admin', businessId);

    await createAssignment(ctx, { serviceId, userId, businessId }, token);

    const response = await assignUserToService(
      ctx,
      { serviceId, userId, businessId },
      token,
    );

    expect(response.status).toBe(409);
    expect(errorBody(response).statusCode).toBe(409);
  });

  it('allows re-assigning a user after their previous assignment was removed', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceId } = await registerService(ctx, businessId);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const token = await tokenForRole(ctx, 'Admin', businessId);

    await createAssignment(ctx, { serviceId, userId, businessId }, token);
    await removeUserFromService(ctx, serviceId, userId, token).then((res) =>
      expect(res.status).toBe(200),
    );

    // The unique index on (service_id, user_id) is partial — WHERE
    // is_deleted = false — so re-assigning after a soft-deleted removal
    // should succeed rather than false-positive a 409.
    const response = await assignUserToService(
      ctx,
      { serviceId, userId, businessId },
      token,
    );

    expect(response.status).toBe(201);
  });

  it('returns 400 when serviceId is an empty string', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');

    const response = await assignUserToService(
      ctx,
      { serviceId: '', userId, businessId },
      await tokenForRole(ctx, 'Admin', businessId),
    );

    expect(response.status).toBe(400);
  });

  it('returns 403 for a Standard user (not in the assign-user role list)', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: serviceId } = await registerService(ctx, businessId);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');

    const response = await assignUserToService(
      ctx,
      { serviceId, userId, businessId },
      await tokenForRole(ctx, 'Standard', businessId),
    );

    expect(response.status).toBe(403);
  });

  describe('known bug: no tenant isolation on write', () => {
    // AssignUserToServiceUseCaseImpl never touches SecurityContext and never
    // checks that `command.businessId` (or the service's/user's real
    // business) matches the CALLER's own business — the controller only
    // enforces that the caller holds an allowed ROLE (Platform Owner /
    // Business Owner / Admin) via RolesGuard, not that they belong to the
    // business they're operating on. AssignUserToServiceDto.businessId is
    // also only @IsString()/@MinLength(1) -- not even validated as a real
    // uuid, let alone cross-checked.
    //
    // These tests document the actual (undesirable) current behavior —
    // real cross-tenant writes succeed — rather than asserting a fix.
    it('lets an Admin from business A assign a business B user to a business B service', async () => {
      const { id: businessA } = await createBusiness(ctx);
      const { id: businessB } = await createBusiness(ctx);
      const { id: serviceIdInB } = await registerService(ctx, businessB);
      const { id: userIdInB } = await createStaffUser(
        ctx,
        businessB,
        'Standard',
      );

      const response = await assignUserToService(
        ctx,
        { serviceId: serviceIdInB, userId: userIdInB, businessId: businessB },
        await tokenForRole(ctx, 'Admin', businessA), // caller belongs to A, not B
      );

      // Documents the gap: succeeds despite the caller having no
      // relationship to business B at all.
      expect(response.status).toBe(201);
    });

    it("creates an internally-inconsistent row when businessId does not match the service/user's real business", async () => {
      const { id: businessA } = await createBusiness(ctx);
      const { id: businessB } = await createBusiness(ctx);
      const { id: serviceIdInA } = await registerService(ctx, businessA);
      const { id: userIdInA } = await createStaffUser(
        ctx,
        businessA,
        'Standard',
      );

      // businessId in the payload (businessB) matches neither the
      // service's nor the user's real business_id (both businessA) -- the
      // FK constraint on service_user_assignments.business_id only checks
      // that businessB is SOME real business, not that it's the right one.
      const response = await assignUserToService(
        ctx,
        {
          serviceId: serviceIdInA,
          userId: userIdInA,
          businessId: businessB,
        },
        await tokenForRole(ctx, 'Admin', businessA),
      );

      expect(response.status).toBe(201);
      const data = successBody<{ id: string }>(response).data;

      const row = await ctx.db
        .selectFrom('service_user_assignments')
        .selectAll()
        .where('id', '=', data.id)
        .executeTakeFirstOrThrow();
      // Documents the inconsistency: this row's business_id agrees with
      // neither its own service's nor its own user's actual business.
      expect(row.business_id).toBe(businessB);
    });
  });
});
