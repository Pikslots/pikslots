import request from 'supertest';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { endpointFor } from '../common/endpoint-path';
import { authHeader, tokenFor } from '../common/auth';
import { putRealObject, s3ObjectExists } from '../common/s3-test-client';
import { waitFor } from '../common/wait-for';
import { setupBusinessTestContext } from './support/business-test-context';
import { createBusiness, getBusiness } from './support/business-fixtures';

describe(`PATCH ${BUSINESS_ENDPOINTS.UPDATE_GALLERY_PHOTOS}`, () => {
  const ctx = setupBusinessTestContext();

  it('deletes gallery photos that were removed, from the real S3 bucket', async () => {
    const business = await createBusiness(ctx);
    const s3 = { client: ctx.s3Client, bucket: ctx.s3Bucket };
    const keptKey = `e2e/${business.id}/gallery-kept.txt`;
    const removedKey = `e2e/${business.id}/gallery-removed.txt`;

    await putRealObject(s3, keptKey, 'kept photo bytes');
    ctx.createdS3Keys.push(keptKey);
    await putRealObject(s3, removedKey, 'removed photo bytes');
    ctx.createdS3Keys.push(removedKey);

    await request(ctx.app.getHttpServer())
      .patch(endpointFor(BUSINESS_ENDPOINTS.UPDATE_GALLERY_PHOTOS, business.id))
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin')))
      .send({ galleryPhotosKeys: [keptKey, removedKey] })
      .expect(200);

    await request(ctx.app.getHttpServer())
      .patch(endpointFor(BUSINESS_ENDPOINTS.UPDATE_GALLERY_PHOTOS, business.id))
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin')))
      .send({ galleryPhotosKeys: [keptKey] })
      .expect(200);

    // deleteFile calls run via Promise.allSettled — poll briefly for them to land.
    await waitFor(async () => !(await s3ObjectExists(s3, removedKey)));

    expect(await s3ObjectExists(s3, removedKey)).toBe(false);
    expect(await s3ObjectExists(s3, keptKey)).toBe(true);

    const body = await getBusiness(ctx, business.id);
    const gallery = body.data.brandAppearanceDetails as {
      gallaryPhotosUrls: string[];
    };
    // The GET response maps stored keys through the real S3 service into
    // presigned download URLs, so the raw key shows up as a URL segment.
    expect(gallery.gallaryPhotosUrls).toHaveLength(1);
    expect(gallery.gallaryPhotosUrls[0]).toContain(keptKey);
  });
});
