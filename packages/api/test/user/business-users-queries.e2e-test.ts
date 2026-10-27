import { USER_ENDPOINTS } from '@pikslots/shared';

import { successBody } from '../common/http-envelope';
import { setupUserTestContext } from './support/user-test-context';
import {
  createBusiness,
  createStaffUser,
  getBusinessUsers,
  getUsersByRole,
  getAllBusinessOwners,
  tokenForRole,
} from './support/user-fixtures';

describe('business/role user queries', () => {
  const ctx = setupUserTestContext();

  describe(`GET ${USER_ENDPOINTS.BUSINESS_USERS}`, () => {
    it("returns the business's own user roster", async () => {
      const { id: businessId, ownerId } = await createBusiness(ctx);
      const { id: adminId } = await createStaffUser(ctx, businessId, 'Admin');

      const response = await getBusinessUsers(
        ctx,
        businessId,
        await tokenForRole(ctx, 'Business Owner', businessId, ownerId),
      );

      expect(response.status).toBe(200);
      const data = successBody<Record<string, unknown>[]>(response).data;
      const ids = data.map((u) => u.id);
      expect(ids).toEqual(expect.arrayContaining([ownerId, adminId]));
    });

    it("returns only the caller's own entry for a Standard user", async () => {
      const { id: businessId } = await createBusiness(ctx);
      const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
      await createStaffUser(ctx, businessId, 'Standard'); // another user, should NOT show up

      const response = await getBusinessUsers(
        ctx,
        businessId,
        await tokenForRole(ctx, 'Standard', businessId, userId),
      );

      expect(response.status).toBe(200);
      const data = successBody<Record<string, unknown>[]>(response).data;
      expect(data).toEqual([expect.objectContaining({ id: userId })]);
    });

    describe('known bug: no tenant isolation for elevated roles', () => {
      // FindAllUsersInsideBusinessUseCaseImpl only special-cases 'Standard'
      // (self-filter). Every other role (Business Owner, Admin, Enhanced,
      // Platform Owner) gets back the FULL roster of whatever businessId is
      // in the URL, without any check that it's the caller's OWN business —
      // RolesGuard here only confirms the caller holds an allowed role, not
      // that businessId belongs to them.
      it("lets an Admin from business A read business B's full roster", async () => {
        const { id: businessA } = await createBusiness(ctx);
        const { id: businessB, ownerId: ownerOfB } = await createBusiness(ctx);
        const adminOfA = await createStaffUser(ctx, businessA, 'Admin');

        const response = await getBusinessUsers(
          ctx,
          businessB,
          await tokenForRole(ctx, 'Admin', businessA, adminOfA.id),
        );

        expect(response.status).toBe(200);
        const data = successBody<Record<string, unknown>[]>(response).data;
        // Documents the leak: business A's Admin sees business B's owner.
        expect(data).toEqual(
          expect.arrayContaining([expect.objectContaining({ id: ownerOfB })]),
        );
      });
    });
  });

  describe(`GET ${USER_ENDPOINTS.BY_ROLE}`, () => {
    it('lets a Platform Owner query any role', async () => {
      const { id: businessId } = await createBusiness(ctx);
      const { id: adminId } = await createStaffUser(ctx, businessId, 'Admin');

      const response = await getUsersByRole(
        ctx,
        'Admin',
        await tokenForRole(ctx, 'Platform Owner'),
      );

      expect(response.status).toBe(200);
      const data = successBody<Record<string, unknown>[]>(response).data;
      expect(data.map((u) => u.id)).toEqual(expect.arrayContaining([adminId]));
    });

    it('lets a Business Owner query Admins, but not other Business Owners', async () => {
      const { id: businessId, ownerId } = await createBusiness(ctx);
      const token = await tokenForRole(ctx, 'Business Owner', businessId, ownerId);

      const allowed = await getUsersByRole(ctx, 'Admin', token);
      expect(allowed.status).toBe(200);

      const forbidden = await getUsersByRole(ctx, 'Business Owner', token);
      expect(forbidden.status).toBe(403);
    });

    it('lets an Admin query Standard users, but not other Admins', async () => {
      const { id: businessId } = await createBusiness(ctx);
      const admin = await createStaffUser(ctx, businessId, 'Admin');
      const token = await tokenForRole(ctx, 'Admin', businessId, admin.id);

      const allowed = await getUsersByRole(ctx, 'Standard', token);
      expect(allowed.status).toBe(200);

      const forbidden = await getUsersByRole(ctx, 'Admin', token);
      expect(forbidden.status).toBe(403);
    });

    it('returns 403 for a Standard user (not in the by-role role list at the controller level)', async () => {
      const { id: businessId } = await createBusiness(ctx);
      const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');

      const response = await getUsersByRole(
        ctx,
        'Standard',
        await tokenForRole(ctx, 'Standard', businessId, userId),
      );

      expect(response.status).toBe(403);
    });

    describe('known bug: platform-wide leak for a business-scoped query', () => {
      // GetAllUsersByRoleUseCaseImpl's authorization (User.canQueryRole)
      // only checks ROLE HIERARCHY (e.g. "can a Business Owner query
      // Admins at all?"), never the caller's own business. And
      // UserRepositoryImpl.findAllByRole queries `WHERE role = $1` with NO
      // business_id filter whatsoever. So once a Business Owner or Admin
      // clears the role-hierarchy check, they get back EVERY user with
      // that role across the ENTIRE PLATFORM — not just their own
      // business. This is a materially worse version of the
      // BUSINESS_USERS leak above: it doesn't even require knowing another
      // business's id, and it returns full UserSummary rows (name, email,
      // phone) for every competing business's staff.
      it('lets a Business Owner see Admins belonging to OTHER businesses via BY_ROLE', async () => {
        const { id: businessA, ownerId } = await createBusiness(ctx);
        const { id: businessB } = await createBusiness(ctx);
        const adminOfB = await createStaffUser(ctx, businessB, 'Admin');

        const response = await getUsersByRole(
          ctx,
          'Admin',
          await tokenForRole(ctx, 'Business Owner', businessA, ownerId),
        );

        expect(response.status).toBe(200);
        const data = successBody<Record<string, unknown>[]>(response).data;
        // Documents the leak: business A's Owner, who only asked "show me
        // Admins", sees a completely unrelated business B's Admin too.
        expect(data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: adminOfB.id }),
          ]),
        );
      });
    });
  });

  describe(`GET ${USER_ENDPOINTS.BUSINESS_OWNERS}`, () => {
    it('lets a Platform Owner list every Business Owner on the platform', async () => {
      const { ownerId } = await createBusiness(ctx);

      const response = await getAllBusinessOwners(
        ctx,
        await tokenForRole(ctx, 'Platform Owner'),
      );

      expect(response.status).toBe(200);
      const data = successBody<Record<string, unknown>[]>(response).data;
      expect(data.map((u) => u.id)).toEqual(expect.arrayContaining([ownerId]));
    });

    it('returns 403 for a Business Owner (this endpoint is Platform Owner-only)', async () => {
      const { id: businessId, ownerId } = await createBusiness(ctx);

      const response = await getAllBusinessOwners(
        ctx,
        await tokenForRole(ctx, 'Business Owner', businessId, ownerId),
      );

      expect(response.status).toBe(403);
    });
  });
});
