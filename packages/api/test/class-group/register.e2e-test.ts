import request from 'supertest';
import { CLASS_GROUP_ENDPOINTS } from '@pikslots/shared';

import { authHeader, tokenFor } from '../common/auth';
import { setupClassGroupTestContext } from './support/class-group-test-context';
import {
  createOwningBusiness,
  createClassGroup,
  registerClassGroupPayload,
  errorBody,
} from './support/class-group-fixtures';

describe(`POST ${CLASS_GROUP_ENDPOINTS.REGISTER}`, () => {
  const ctx = setupClassGroupTestContext();
  let businessId: string;

  beforeAll(async () => {
    businessId = await createOwningBusiness(ctx);
  });

  it('registers a class group and persists it for real', async () => {
    const group = await createClassGroup(ctx, businessId, {
      name: 'Morning-Classes-Register',
    });

    const row = await ctx.db
      .selectFrom('class_groups')
      .selectAll()
      .where('id', '=', group.id)
      .executeTakeFirstOrThrow();
    expect(row.business_id).toBe(businessId);
    expect(row.is_deleted).toBe(false);
  });

  it('allows a Business Owner to register within their own business', async () => {
    await createClassGroup(
      ctx,
      businessId,
      { name: 'BO-Own-Business-Group' },
      'Business Owner',
    );
  });

  it('rejects a second group with the same name in the same business (real DB unique index)', async () => {
    const name = 'Duplicate-Group-Name';
    await createClassGroup(ctx, businessId, { name });

    const payload = registerClassGroupPayload(businessId, { name });
    const response = await request(ctx.app.getHttpServer())
      .post(CLASS_GROUP_ENDPOINTS.REGISTER)
      .set(
        authHeader(
          await tokenFor(ctx.sessionCacheService, 'Admin', businessId),
        ),
      )
      .send(payload)
      .expect(409);

    expect(errorBody(response).message).toMatch(/already exists/i);
  });

  it('allows the same name to be reused across two different businesses', async () => {
    const otherBusinessId = await createOwningBusiness(ctx);
    const name = 'Shared-Name-Across-Businesses';

    await createClassGroup(ctx, businessId, { name });
    await createClassGroup(ctx, otherBusinessId, { name });
  });

  it('forbids an Enhanced user from calling register at all (route-level role guard)', async () => {
    const payload = registerClassGroupPayload(businessId, {
      name: 'Enhanced-Blocked',
    });
    await request(ctx.app.getHttpServer())
      .post(CLASS_GROUP_ENDPOINTS.REGISTER)
      .set(
        authHeader(
          await tokenFor(ctx.sessionCacheService, 'Enhanced', businessId),
        ),
      )
      .send(payload)
      .expect(403);
  });

  it('returns 400 for an invalid payload', async () => {
    const response = await request(ctx.app.getHttpServer())
      .post(CLASS_GROUP_ENDPOINTS.REGISTER)
      .set(
        authHeader(
          await tokenFor(ctx.sessionCacheService, 'Admin', businessId),
        ),
      )
      .send({})
      .expect(400);

    expect(errorBody(response).statusCode).toBe(400);
  });

  /**
   * FINDING: RegisterClassGroupDto validates businessId as `@IsString()
   * @MinLength(1)` only -- not @IsUUID like every other module's businessId
   * field (Class, Timeoff, Customer all use @IsUUID('7')). A garbage,
   * non-UUID string sails through DTO validation, reaches the use case
   * (which only checks name uniqueness -- true either way for a garbage
   * business id), and only fails once Postgres rejects the malformed uuid
   * at insert time. That surfaces as a generic infrastructure error (500),
   * not a clean 400 -- a real validation gap, not a crash worth panicking
   * over, but worth tightening to @IsUUID('7') for a cleaner error surface.
   */
  it('[FLAGGED] returns 500 (not a clean 400) for a non-UUID businessId, since RegisterClassGroupDto never validates its shape', async () => {
    const payload = registerClassGroupPayload('not-a-real-uuid', {
      name: 'Garbage-BusinessId-Attempt',
    });

    const response = await request(ctx.app.getHttpServer())
      .post(CLASS_GROUP_ENDPOINTS.REGISTER)
      .set(
        authHeader(
          await tokenFor(ctx.sessionCacheService, 'Admin', businessId),
        ),
      )
      .send(payload)
      .expect(500);

    expect(errorBody(response).statusCode).toBe(500);
  });

  /**
   * FLAGGED, not an endorsement: RegisterClassGroupUseCaseImpl never
   * injects SecurityContext and performs NO authorization check at all --
   * no role/business match, nothing. The @Roles guard on this route only
   * gates by role type (any of Platform Owner/Business Owner/Admin), never
   * by which business the caller's token claims. So today, a Business
   * Owner or Admin token from ANY business can create a class group under
   * ANY OTHER business just by putting that business's real id in the
   * body -- a real cross-tenant WRITE, not just a read leak (compare to
   * Class's FIND_ALL_BY_BUSINESS gap, which was read-only).
   *
   * This is the same shape of gap on all four ClassGroup endpoints
   * (register/edit/delete/findAll) -- see the sibling test files. Flagging
   * this to the team is a priority ahead of shipping this module publicly.
   */
  it('[FLAGGED] currently allows a Business Owner to register a class group under a business that is not theirs', async () => {
    const targetBusinessId = await createOwningBusiness(ctx);

    await createClassGroup(
      ctx,
      targetBusinessId,
      { name: 'Cross-Tenant-Write-Today' },
      'Business Owner',
      businessId, // caller's token business != targetBusinessId being written to
    );
  });
});
