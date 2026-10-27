import request from 'supertest';
import { CLASS_GROUP_ASSIGNMENT_ENDPOINTS } from '@pikslots/shared';

import { endpointForParams } from '../common/endpoint-path';
import { authHeader } from '../common/auth';
import { successBody } from '../common/http-envelope';
import { setupClassGroupAssignmentTestContext } from './support/class-group-assignment-test-context';
import {
  createBusiness,
  registerClass,
  registerClassGroup,
  editClass,
  waitForActiveAssignmentCountByGroup,
  tokenForRole,
} from './support/class-group-assignment-fixtures';

describe(`GET ${CLASS_GROUP_ASSIGNMENT_ENDPOINTS.FIND_BY_GROUP}`, () => {
  const ctx = setupClassGroupAssignmentTestContext();

  it('returns the class assigned to a group at class-creation time, once the real worker processes it', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: classGroupId } = await registerClassGroup(ctx, businessId);
    const { id: classId, title } = await registerClass(ctx, businessId, {
      associatedClassGroupIds: [classGroupId],
    });

    // Real Redis -> real BullMQ worker -> real SyncClassClassGroupsEventImpl,
    // asynchronously.
    await waitForActiveAssignmentCountByGroup(ctx, classGroupId, 1);

    const response = await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(CLASS_GROUP_ASSIGNMENT_ENDPOINTS.FIND_BY_GROUP, {
          classGroupId,
        }),
      )
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual([{ id: classId, name: title }]);
  });

  it('returns an empty array for a group with no class assignments', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: classGroupId } = await registerClassGroup(ctx, businessId);

    const response = await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(CLASS_GROUP_ASSIGNMENT_ENDPOINTS.FIND_BY_GROUP, {
          classGroupId,
        }),
      )
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual([]);
  });

  it('returns multiple classes when a group has more than one assigned', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: classGroupId } = await registerClassGroup(ctx, businessId);
    const classA = await registerClass(ctx, businessId, {
      associatedClassGroupIds: [classGroupId],
    });
    const classB = await registerClass(ctx, businessId, {
      associatedClassGroupIds: [classGroupId],
    });

    await waitForActiveAssignmentCountByGroup(ctx, classGroupId, 2);

    const response = await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(CLASS_GROUP_ASSIGNMENT_ENDPOINTS.FIND_BY_GROUP, {
          classGroupId,
        }),
      )
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual(
      expect.arrayContaining([
        { id: classA.id, name: classA.title },
        { id: classB.id, name: classB.title },
      ]),
    );
    expect(successBody(response).data).toHaveLength(2);
  });

  it('stops returning a class once it is removed via edit on the class', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: classGroupId } = await registerClassGroup(ctx, businessId);
    const { id: classId, title } = await registerClass(ctx, businessId, {
      associatedClassGroupIds: [classGroupId],
    });

    await waitForActiveAssignmentCountByGroup(ctx, classGroupId, 1);

    // Editing the class with an empty associatedClassGroupIds list drops the
    // assignment — the edit use case always re-fires the sync event so
    // removals process, unlike register which only fires when non-empty.
    await editClass(ctx, classId, businessId, {
      title,
      associatedClassGroupIds: [],
    });

    await waitForActiveAssignmentCountByGroup(ctx, classGroupId, 0);

    const response = await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(CLASS_GROUP_ASSIGNMENT_ENDPOINTS.FIND_BY_GROUP, {
          classGroupId,
        }),
      )
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual([]);
  });

  it('returns 401 when no auth token is provided', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: classGroupId } = await registerClassGroup(ctx, businessId);

    await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(CLASS_GROUP_ASSIGNMENT_ENDPOINTS.FIND_BY_GROUP, {
          classGroupId,
        }),
      )
      .expect(401);
  });
});
