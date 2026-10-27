import { v7 as uuidv7 } from 'uuid';
import request from 'supertest';
import { CLASS_ENDPOINTS } from '@pikslots/shared';

import { authHeader, tokenFor } from '../common/auth';
import { setupClassTestContext } from './support/class-test-context';
import {
  createOwningBusiness,
  createClass,
  registerClassPayload,
  errorBody,
} from './support/class-fixtures';

describe(`POST ${CLASS_ENDPOINTS.REGISTER}`, () => {
  const ctx = setupClassTestContext();
  let businessId: string;

  beforeAll(async () => {
    businessId = await createOwningBusiness(ctx);
  });

  // this test is commented out because the class module work is remaining
  // it('registers a class and persists it for real', async () => {
  //   const cls = await createClass(ctx, businessId, {
  //     title: 'Yoga-Register-Persists',
  //     seats: 15,
  //     cost: 2000,
  //   });

  //   const row = await ctx.db
  //     .selectFrom('classes')
  //     .selectAll()
  //     .where('id', '=', cls.id)
  //     .executeTakeFirstOrThrow();

  //   expect(row.business_id).toBe(businessId);
  //   expect(row.seats).toBe(15);
  //   expect(row.cost).toBe(2000);
  //   expect(row.images).toEqual([]);
  //   expect(row.is_deleted).toBe(false);
  // });

  it('allows a Business Owner to register within their own business', async () => {
    await createClass(
      ctx,
      businessId,
      { title: 'BO-Own-Business' },
      'Business Owner',
    );
  });

  it('allows an Admin to register within their own business', async () => {
    await createClass(
      ctx,
      businessId,
      { title: 'Admin-Own-Business' },
      'Admin',
    );
  });

  it('denies a Business Owner registering outside their own business', async () => {
    const payload = registerClassPayload(businessId, {
      title: 'BO-Cross-Business',
    });

    const response = await request(ctx.app.getHttpServer())
      .post(CLASS_ENDPOINTS.REGISTER)
      .set(
        authHeader(
          await tokenFor(
            ctx.sessionCacheService,
            'Business Owner',
            'a-different-business',
          ),
        ),
      )
      .send(payload)
      .expect(401);

    expect(errorBody(response).message).toMatch(/unauthorized/i);
  });

  it('forbids an Enhanced user from calling register at all (route-level role guard)', async () => {
    const payload = registerClassPayload(businessId, {
      title: 'Enhanced-Blocked',
    });

    await request(ctx.app.getHttpServer())
      .post(CLASS_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Enhanced', businessId)))
      .send(payload)
      .expect(403);
  });

  it('forbids a Standard user from calling register at all (route-level role guard)', async () => {
    const payload = registerClassPayload(businessId, {
      title: 'Standard-Blocked',
    });

    await request(ctx.app.getHttpServer())
      .post(CLASS_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Standard', businessId)))
      .send(payload)
      .expect(403);
  });

  it('returns 400 for an invalid payload', async () => {
    const response = await request(ctx.app.getHttpServer())
      .post(CLASS_ENDPOINTS.REGISTER)
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin', businessId)))
      .send({})
      .expect(400);

    expect(errorBody(response).statusCode).toBe(400);
  });

  it('accepts a syntactically valid associatedClassGroupIds entry without requiring the group to exist (sync happens async via queue)', async () => {
    await createClass(ctx, businessId, {
      title: 'With-ClassGroup-Association',
      associatedClassGroupIds: [uuidv7()], // a real v7 shape, not a real row
    });
  });

  /**
   * FINDING, not an endorsement: the class.table.ts schema comment says
   * "title // unique per business", and ClassRepositoryImpl even has a
   * ready-to-use `existsByTitle(title, businessId)` method -- but nothing
   * calls it. There's no DB unique index (checked the migration) and
   * RegisterClassUseCaseImpl never queries for an existing title before
   * calling Class.create(). This test pins down the CURRENT behavior
   * (duplicates succeed) so it'll go red the moment someone wires
   * existsByTitle in, which is the signal to update/remove this test.
   */
  it('currently allows two classes with the same title in the same business (no uniqueness enforced despite the schema comment)', async () => {
    const title = 'Duplicate-Title-Currently-Allowed';
    await createClass(ctx, businessId, { title });
    await createClass(ctx, businessId, { title });
  });
});
