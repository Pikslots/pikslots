import { randomUUID } from 'node:crypto';
import { USER_ENDPOINTS } from '@pikslots/shared';

import { setupUserTestContext } from './support/user-test-context';
import {
  createBusiness,
  createStaffUser,
  updateWorkingHours,
  tokenForRole,
  DEFAULT_WORKING_HOURS,
} from './support/user-fixtures';

const NEW_HOURS = {
  ...DEFAULT_WORKING_HOURS,
  monday: { enabled: true, openTime: '08:00', closeTime: '16:00' },
};

describe(`PATCH ${USER_ENDPOINTS.UPDATE_WORKING_HOURS}`, () => {
  const ctx = setupUserTestContext();

  it('lets a Standard user update their own working hours', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');

    const response = await updateWorkingHours(
      ctx,
      userId,
      NEW_HOURS,
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );

    expect(response.status).toBe(200);

    const row = await ctx.db
      .selectFrom('users')
      .select('user_working_hours')
      .where('id', '=', userId)
      .executeTakeFirstOrThrow();
    expect(row.user_working_hours).toEqual(NEW_HOURS);
  });

  it("lets an Admin update another user's working hours within their own business", async () => {
    const { id: businessId } = await createBusiness(ctx);
    const admin = await createStaffUser(ctx, businessId, 'Admin');
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');

    const response = await updateWorkingHours(
      ctx,
      userId,
      NEW_HOURS,
      await tokenForRole(ctx, 'Admin', businessId, admin.id),
    );

    expect(response.status).toBe(200);
  });

  it("returns 403 when a Standard user tries to update someone else's working hours", async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const otherStandard = await createStaffUser(ctx, businessId, 'Standard');

    const response = await updateWorkingHours(
      ctx,
      userId,
      NEW_HOURS,
      await tokenForRole(ctx, 'Standard', businessId, otherStandard.id),
    );

    expect(response.status).toBe(403);
  });

  it('returns 403 when the caller is from a different business, even as an Admin', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: otherBusinessId } = await createBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');

    const response = await updateWorkingHours(
      ctx,
      userId,
      NEW_HOURS,
      await tokenForRole(ctx, 'Admin', otherBusinessId, randomUUID()),
    );

    expect(response.status).toBe(403);
  });

  it('returns 404 for a user that does not exist', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const admin = await createStaffUser(ctx, businessId, 'Admin');

    const response = await updateWorkingHours(
      ctx,
      randomUUID(),
      NEW_HOURS,
      await tokenForRole(ctx, 'Admin', businessId, admin.id),
    );

    expect(response.status).toBe(404);
  });

  describe('note: this endpoint has no RolesGuard at all — only the domain check', () => {
    // UserController.updateWorkingHours has neither @UseGuards(RolesGuard)
    // nor @Roles(...) -- unlike UPDATE_AVATAR (same shape of endpoint: a
    // :userId param, self-or-elevated semantics) which has both. The ONLY
    // gate here is UpdateUserWorkingHoursUseCaseImpl's own domain check
    // (User.canUpdateWorkingHours(callerRole, isSelf, isPartOfSameBusiness)).
    //
    // The tests above show that gate does work correctly end-to-end (a
    // stranger from another business, or a Standard user targeting someone
    // else, both correctly get 403) -- so this isn't a live vulnerability.
    // But it means this route has a single point of failure for
    // authorization where its sibling UPDATE_AVATAR has two (RolesGuard +
    // domain check), which is worth aligning for consistency/defense in
    // depth even though nothing here currently fails.
    it('is not itself a failing test — see the comment above', () => {
      expect(true).toBe(true);
    });
  });
});
