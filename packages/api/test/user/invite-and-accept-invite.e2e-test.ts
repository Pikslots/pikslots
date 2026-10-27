import { USER_ENDPOINTS } from '@pikslots/shared';

import { successBody, errorBody } from '../common/http-envelope';
import { setupUserTestContext } from './support/user-test-context';
import {
  createBusiness,
  createStaffUser,
  tokenForRole,
  inviteUserPayload,
  inviteUser,
  extractInviteToken,
  requestInviteOtp,
  extractOtp,
  acceptInvite,
  inviteAndAcceptRealUser,
  login,
} from './support/user-fixtures';

describe(`POST ${USER_ENDPOINTS.INVITE} -> ${USER_ENDPOINTS.REQUEST_INVITE_OTP} -> ${USER_ENDPOINTS.ACCEPT_INVITE}`, () => {
  const ctx = setupUserTestContext();

  it('runs the full real flow: invite -> request-otp -> accept-invite -> login', async () => {
    const { id: businessId, ownerId } = await createBusiness(ctx);

    const credentials = await inviteAndAcceptRealUser(
      ctx,
      businessId,
      'E2E Business',
      await tokenForRole(ctx, 'Business Owner', businessId, ownerId),
    );

    const loginResponse = await login(
      ctx,
      credentials.username,
      credentials.password,
    );

    expect(loginResponse.status).toBe(200);
    expect(successBody<{ message: string }>(loginResponse).data.message).toBe(
      'success',
    );
  });

  it('returns 409 when inviting an email that already exists', async () => {
    const { id: businessId, ownerId } = await createBusiness(ctx);
    const { email } = await createStaffUser(ctx, businessId, 'Standard');

    const response = await inviteUser(
      ctx,
      inviteUserPayload({ email, businessId, businessName: 'E2E Business' }),
      await tokenForRole(ctx, 'Business Owner', businessId, ownerId),
    );

    expect(response.status).toBe(409);
    expect(errorBody(response).statusCode).toBe(409);
  });

  it('returns 409 when inviting a username that already exists', async () => {
    const { id: businessId, ownerId } = await createBusiness(ctx);
    const { username } = await createStaffUser(ctx, businessId, 'Standard');

    const response = await inviteUser(
      ctx,
      inviteUserPayload({
        username,
        businessId,
        businessName: 'E2E Business',
      }),
      await tokenForRole(ctx, 'Business Owner', businessId, ownerId),
    );

    expect(response.status).toBe(409);
    expect(errorBody(response).statusCode).toBe(409);
  });

  it('returns 422 when the OTP is wrong', async () => {
    const { id: businessId, ownerId } = await createBusiness(ctx);
    const payload = inviteUserPayload({
      businessId,
      businessName: 'E2E Business',
    });
    await inviteUser(
      ctx,
      payload,
      await tokenForRole(ctx, 'Business Owner', businessId, ownerId),
    ).then((res) => expect(res.status).toBe(201));
    const token = extractInviteToken(ctx, payload.email);
    await requestInviteOtp(ctx, token).then((res) =>
      expect(res.status).toBe(200),
    );

    const response = await acceptInvite(ctx, {
      token,
      otp: '000000',
      newPassword: 'SomePassword123!',
    });

    expect(response.status).toBe(422);
  });

  it('returns 409 from request-otp when the invite was already accepted', async () => {
    const { id: businessId, ownerId } = await createBusiness(ctx);
    const payload = inviteUserPayload({
      businessId,
      businessName: 'E2E Business',
    });
    await inviteUser(
      ctx,
      payload,
      await tokenForRole(ctx, 'Business Owner', businessId, ownerId),
    ).then((res) => expect(res.status).toBe(201));
    const token = extractInviteToken(ctx, payload.email);
    await requestInviteOtp(ctx, token).then((res) =>
      expect(res.status).toBe(200),
    );
    const otp = extractOtp(ctx, payload.email);
    await acceptInvite(ctx, {
      token,
      otp,
      newPassword: 'FirstPassword123!',
    }).then((res) => expect(res.status).toBe(200));

    // The invite JWT is still structurally valid (not expired), but the
    // user's status is now 'active', not 'invited' -- request-otp itself
    // rejects re-requesting an OTP for an invite that's already been used,
    // before a second accept-invite attempt is even possible.
    const response = await requestInviteOtp(ctx, token);

    expect(response.status).toBe(409);
  });

  it('returns 401 from request-otp for a garbage/invalid invite token', async () => {
    const response = await requestInviteOtp(ctx, 'not-a-real-jwt');

    expect(response.status).toBe(401);
  });

  describe('role matrix (User.canInviteRole)', () => {
    it('lets a Platform Owner invite a Business Owner', async () => {
      const response = await inviteUser(
        ctx,
        inviteUserPayload({ role: 'Business Owner' }),
        await tokenForRole(ctx, 'Platform Owner'),
      );

      expect(response.status).toBe(201);
    });

    it('blocks a Business Owner from inviting a Platform Owner', async () => {
      const { id: businessId, ownerId } = await createBusiness(ctx);

      const response = await inviteUser(
        ctx,
        inviteUserPayload({
          role: 'Platform Owner',
          businessId,
          businessName: 'E2E Business',
        }),
        await tokenForRole(ctx, 'Business Owner', businessId, ownerId),
      );

      expect(response.status).toBe(403);
    });

    it('blocks an Admin from inviting a Business Owner', async () => {
      const { id: businessId } = await createBusiness(ctx);
      const admin = await createStaffUser(ctx, businessId, 'Admin');

      const response = await inviteUser(
        ctx,
        inviteUserPayload({
          role: 'Business Owner',
          businessId,
          businessName: 'E2E Business',
        }),
        await tokenForRole(ctx, 'Admin', businessId, admin.id),
      );

      expect(response.status).toBe(403);
    });

    it('lets an Admin invite a Standard user', async () => {
      const { id: businessId } = await createBusiness(ctx);
      const admin = await createStaffUser(ctx, businessId, 'Admin');

      const response = await inviteUser(
        ctx,
        inviteUserPayload({
          role: 'Standard',
          businessId,
          businessName: 'E2E Business',
        }),
        await tokenForRole(ctx, 'Admin', businessId, admin.id),
      );

      expect(response.status).toBe(201);
    });

    it('blocks a Standard user from inviting anyone', async () => {
      const { id: businessId } = await createBusiness(ctx);
      const standard = await createStaffUser(ctx, businessId, 'Standard');

      const response = await inviteUser(
        ctx,
        inviteUserPayload({
          role: 'Standard',
          businessId,
          businessName: 'E2E Business',
        }),
        await tokenForRole(ctx, 'Standard', businessId, standard.id),
      );

      expect(response.status).toBe(403);
    });
  });

  describe('note: @Roles() on the invite endpoint is currently dead code', () => {
    // UserController.inviteUser carries a @Roles('Platform Owner', 'Business
    // Owner', 'Admin') decorator but -- unlike every other role-gated route
    // in this codebase -- has no matching @UseGuards(RolesGuard) above it.
    // @Roles() is pure metadata; without RolesGuard reading it, it does
    // nothing. Enforcement here is therefore ENTIRELY delegated to
    // InviteUserUsecaseImpl's own domain check (User.canInviteRole), not
    // the declared role list.
    //
    // The role matrix tests above pass either way, since
    // User.canInviteRole happens to reject Enhanced/Standard/No Access same
    // as the (non-functional) declared @Roles list would have. This isn't
    // asserting a behavioral bug -- it's flagging that the safety net here
    // is thinner than it looks: if User.canInviteRole is ever loosened
    // without someone also reviewing this controller, there's no outer
    // guard as a second line of defense the way there is on every other
    // @Roles()-annotated route in this codebase.
    it('is not itself a failing test — see the comment above', () => {
      expect(true).toBe(true);
    });
  });
});
