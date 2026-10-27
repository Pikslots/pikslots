import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { SERVICE_ENDPOINTS } from '@pikslots/shared';
import { setupServiceTestContext } from './support/service.test.context';
import {
  createBusiness,
  createService,
  findServiceById,
} from './support/service.fixtures';
import { authHeader, tokenFor } from '../common/auth';
import { successBody } from '../common/http-envelope';
import { unique } from '../common/unique-id';
import { putRealObject, s3ObjectExists } from '../common/s3-test-client';

describe(`PATCH ${SERVICE_ENDPOINTS.UPDATE_SERVICE_AVATAR}`, () => {
  const ctx = setupServiceTestContext();

  it('updates the avatar, persists it, and deletes the previous object from S3 for real', async () => {
    const businessId = await createBusiness(ctx);
    const oldKey = `e2e/service/${unique('avatar')}/old.png`;
    const newKey = `e2e/service/${unique('avatar')}/new.png`;

    await putRealObject(
      { client: ctx.s3Client, bucket: ctx.s3Bucket },
      oldKey,
      'old-avatar',
    );
    await putRealObject(
      { client: ctx.s3Client, bucket: ctx.s3Bucket },
      newKey,
      'new-avatar',
    );
    ctx.createdS3Keys.push(oldKey, newKey);

    const serviceId = await createService(ctx, {
      businessId,
      serviceAvatar: oldKey,
    });

    const url = SERVICE_ENDPOINTS.UPDATE_SERVICE_AVATAR.replace(
      ':serviceId',
      serviceId,
    );
    const response = await request(ctx.app.getHttpServer())
      .patch(url)
      .set(
        authHeader(
          await tokenFor(ctx.sessionCacheService, 'Business Owner', businessId),
        ),
      )
      .send({ avatarKey: newKey })
      .expect(200);

    expect(successBody(response).data).toEqual({ message: 'success' });

    const row = await findServiceById(ctx, serviceId);
    expect(row.service_avatar).toBe(newKey);

    expect(
      await s3ObjectExists(
        { client: ctx.s3Client, bucket: ctx.s3Bucket },
        oldKey,
      ),
    ).toBe(false);
    expect(
      await s3ObjectExists(
        { client: ctx.s3Client, bucket: ctx.s3Bucket },
        newKey,
      ),
    ).toBe(true);
  });

  it('returns 404 for an unknown service id', async () => {
    const businessId = await createBusiness(ctx);

    const url = SERVICE_ENDPOINTS.UPDATE_SERVICE_AVATAR.replace(
      ':serviceId',
      randomUUID(),
    );
    await request(ctx.app.getHttpServer())
      .patch(url)
      .set(
        authHeader(
          await tokenFor(ctx.sessionCacheService, 'Business Owner', businessId),
        ),
      )
      .send({ avatarKey: 'e2e/service/unknown/avatar.png' })
      .expect(404);
  });

  it('returns 401 when no Authorization header is sent', async () => {
    const businessId = await createBusiness(ctx);
    const serviceId = await createService(ctx, { businessId });

    const url = SERVICE_ENDPOINTS.UPDATE_SERVICE_AVATAR.replace(
      ':serviceId',
      serviceId,
    );

    await request(ctx.app.getHttpServer())
      .patch(url)
      .send({ avatarKey: 'e2e/service/no-auth/avatar.png' })
      .expect(401);
  });

  it('returns 403 for a role outside the allowed list', async () => {
    const businessId = await createBusiness(ctx);
    const serviceId = await createService(ctx, { businessId });

    const url = SERVICE_ENDPOINTS.UPDATE_SERVICE_AVATAR.replace(
      ':serviceId',
      serviceId,
    );

    await request(ctx.app.getHttpServer())
      .patch(url)
      .set(
        authHeader(
          await tokenFor(ctx.sessionCacheService, 'Enhanced', businessId),
        ),
      )
      .send({ avatarKey: 'e2e/service/no-access/avatar.png' })
      .expect(403);
  });

  it('returns 401 for a Business Owner updating a service outside their own business', async () => {
    const ownBusinessId = await createBusiness(ctx);
    const otherBusinessId = await createBusiness(ctx);
    const serviceId = await createService(ctx, { businessId: ownBusinessId });

    const url = SERVICE_ENDPOINTS.UPDATE_SERVICE_AVATAR.replace(
      ':serviceId',
      serviceId,
    );

    await request(ctx.app.getHttpServer())
      .patch(url)
      .set(
        authHeader(
          await tokenFor(
            ctx.sessionCacheService,
            'Business Owner',
            otherBusinessId,
          ),
        ),
      )
      .send({ avatarKey: 'e2e/service/other-business/avatar.png' })
      .expect(401);
  });
});
