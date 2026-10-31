import request from 'supertest';
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';

import { successBody } from '../common/http-envelope';
import { endpointFor } from '../common/endpoint-path';
import { authHeader, tokenFor } from '../common/auth';
import { putRealObject, s3ObjectExists } from '../common/s3-test-client';
import { setupBusinessTestContext } from './support/business-test-context';
import { createBusiness } from './support/business-fixtures';

describe(`PATCH ${BUSINESS_ENDPOINTS.UPDATE_BRAND_DETAILS_IMAGES}`, () => {
  const ctx = setupBusinessTestContext();

  it('deletes the previous images from the real S3 bucket and keeps the new ones', async () => {
    const business = await createBusiness(ctx);
    const s3 = { client: ctx.s3Client, bucket: ctx.s3Bucket };

    const oldBannerKey = `e2e/${business.id}/old-banner.txt`;
    const oldLogoKey = `e2e/${business.id}/old-logo.txt`;
    const newBannerKey = `e2e/${business.id}/new-banner.txt`;

    await putRealObject(s3, oldBannerKey, 'old banner bytes');
    ctx.createdS3Keys.push(oldBannerKey);
    await putRealObject(s3, oldLogoKey, 'old logo bytes');
    ctx.createdS3Keys.push(oldLogoKey);
    await putRealObject(s3, newBannerKey, 'new banner bytes');
    ctx.createdS3Keys.push(newBannerKey);

    // First call establishes the "old" images as the business's current ones.
    await request(ctx.app.getHttpServer())
      .patch(
        endpointFor(
          BUSINESS_ENDPOINTS.UPDATE_BRAND_DETAILS_IMAGES,
          business.id,
        ),
      )
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin')))
      .send({ bannerImageKey: oldBannerKey, brandLogoKey: oldLogoKey })
      .expect(200);

    expect(await s3ObjectExists(s3, oldBannerKey)).toBe(true);
    expect(await s3ObjectExists(s3, oldLogoKey)).toBe(true);

    // Second call replaces only the banner; the logo key is unchanged.
    const response = await request(ctx.app.getHttpServer())
      .patch(
        endpointFor(
          BUSINESS_ENDPOINTS.UPDATE_BRAND_DETAILS_IMAGES,
          business.id,
        ),
      )
      .set(authHeader(await tokenFor(ctx.sessionCacheService, 'Admin')))
      .send({ bannerImageKey: newBannerKey, brandLogoKey: oldLogoKey })
      .expect(200);

    expect(successBody(response).data).toEqual({
      message: 'success',
      oldBannerImageUrl: oldBannerKey,
      oldBrandLogoUrl: oldLogoKey,
    });

    expect(await s3ObjectExists(s3, oldBannerKey)).toBe(false); // really deleted
    expect(await s3ObjectExists(s3, newBannerKey)).toBe(true); // untouched
    expect(await s3ObjectExists(s3, oldLogoKey)).toBe(true); // unchanged, not deleted
  });
});
