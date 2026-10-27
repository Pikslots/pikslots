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
  editClassGroup,
  waitForActiveAssignmentCountByClass,
  tokenForRole,
} from './support/class-group-assignment-fixtures';

describe(`GET ${CLASS_GROUP_ASSIGNMENT_ENDPOINTS.FIND_GROUPS_BY_CLASS}`, () => {
  const ctx = setupClassGroupAssignmentTestContext();

  it('returns the group assigned to a class at group-creation time, once the real worker processes it', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: classId } = await registerClass(ctx, businessId);
    const { id: classGroupId, name } = await registerClassGroup(
      ctx,
      businessId,
      {
        associatedClasses: [classId],
      },
    );

    // Real Redis -> real BullMQ worker -> real SyncClassGroupClassesEventImpl,
    // asynchronously.
    await waitForActiveAssignmentCountByClass(ctx, classId, 1);

    const response = await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(
          CLASS_GROUP_ASSIGNMENT_ENDPOINTS.FIND_GROUPS_BY_CLASS,
          { classId },
        ),
      )
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual([{ id: classGroupId, name }]);
  });

  it('returns an empty array for a class with no group assignments', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: classId } = await registerClass(ctx, businessId);

    const response = await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(
          CLASS_GROUP_ASSIGNMENT_ENDPOINTS.FIND_GROUPS_BY_CLASS,
          { classId },
        ),
      )
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual([]);
  });

  it('returns multiple groups when a class belongs to more than one', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: classId } = await registerClass(ctx, businessId);
    const groupA = await registerClassGroup(ctx, businessId, {
      associatedClasses: [classId],
    });
    const groupB = await registerClassGroup(ctx, businessId, {
      associatedClasses: [classId],
    });

    await waitForActiveAssignmentCountByClass(ctx, classId, 2);

    const response = await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(
          CLASS_GROUP_ASSIGNMENT_ENDPOINTS.FIND_GROUPS_BY_CLASS,
          { classId },
        ),
      )
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual(
      expect.arrayContaining([
        { id: groupA.id, name: groupA.name },
        { id: groupB.id, name: groupB.name },
      ]),
    );
    expect(successBody(response).data).toHaveLength(2);
  });

  it('stops returning a group once it is removed via edit on the group', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: classId } = await registerClass(ctx, businessId);
    const { id: classGroupId, name } = await registerClassGroup(
      ctx,
      businessId,
      {
        associatedClasses: [classId],
      },
    );

    await waitForActiveAssignmentCountByClass(ctx, classId, 1);

    // Editing the group with an empty classIds list drops the assignment —
    // the edit use case always re-fires the sync event so removals process.
    await editClassGroup(ctx, classGroupId, businessId, {
      name,
      classIds: [],
    });

    await waitForActiveAssignmentCountByClass(ctx, classId, 0);

    const response = await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(
          CLASS_GROUP_ASSIGNMENT_ENDPOINTS.FIND_GROUPS_BY_CLASS,
          { classId },
        ),
      )
      .set(authHeader(await tokenForRole(ctx, 'Admin', businessId)))
      .expect(200);

    expect(successBody(response).data).toEqual([]);
  });

  it('returns 401 when no auth token is provided', async () => {
    const { id: businessId } = await createBusiness(ctx);
    const { id: classId } = await registerClass(ctx, businessId);

    await request(ctx.app.getHttpServer())
      .get(
        endpointForParams(
          CLASS_GROUP_ASSIGNMENT_ENDPOINTS.FIND_GROUPS_BY_CLASS,
          { classId },
        ),
      )
      .expect(401);
  });
});
