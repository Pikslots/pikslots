import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import type { Kysely } from 'kysely';
import type { S3Client } from '@aws-sdk/client-s3';

import type { PikSlotsDatabase } from '../../../src/shared/database/schema';
import type { JwtLoginService } from '../../../src/shared/security/jwt/jwt.login.service';
import type { SessionCacheService } from '../../../src/shared/cache/session/session.cache.service';
import {
  createRealInfraTestApp,
  closeRealInfraTestApp,
} from '../../common/real-infra-test-app';
import {
  createTestS3Client,
  deleteS3Object,
} from '../../common/s3-test-client';

export interface ClassTestContext {
  app: INestApplication<App>;
  db: Kysely<PikSlotsDatabase>;
  jwtLoginService: JwtLoginService;
  sessionCacheService: SessionCacheService;
  sentEmails: jest.Mock;
  /**
   * s3Client/s3Bucket/createdS3Keys exist purely so this context is
   * structurally assignable to BusinessTestContext -- createOwningBusiness
   * reuses the real createBusiness() from the Business suite's fixtures.
   * Class itself never touches S3 (imagesUrls are plain externally-hosted
   * URLs, validated with @IsUrl, not S3 keys).
   */
  s3Client: S3Client;
  s3Bucket: string;
  createdS3Keys: string[];
  /**
   * classes.business_id has ON DELETE CASCADE (see the class_table
   * migration), so deleting the owning business in afterAll already takes
   * every class created under it with it. createdClassIds is deleted
   * explicitly first anyway, belt-and-suspenders, same as Customer.
   */
  createdClassIds: string[];
  createdBusinessIds: string[];
  createdUserIds: string[];
}

/**
 * Startup/teardown for the Class module's e2e suite. One thing worth
 * knowing going in: RegisterClass/EditClass both enqueue a real BullMQ job
 * (SYNC_CLASS_CLASS_GROUPS) whenever associatedClassGroupIds is non-empty
 * on register, and UNCONDITIONALLY on edit (even with an empty array, "so
 * removals are processed" per the source comment). This suite keeps that
 * array empty in almost every test to stay focused on Class's own HTTP
 * surface rather than exercising the Class-Group-Assignment sync pipeline
 * (that belongs in its own future suite) -- but the settle delay below is
 * kept anyway, matching every other suite's pattern, in case a job is
 * in-flight when the test ends.
 */
export function setupClassTestContext(): ClassTestContext {
  jest.setTimeout(30000);

  const ctx: ClassTestContext = {
    createdClassIds: [],
    createdBusinessIds: [],
    createdUserIds: [],
    createdS3Keys: [],
  } as unknown as ClassTestContext;

  beforeAll(async () => {
    const infra = await createRealInfraTestApp();
    ctx.app = infra.app;
    ctx.db = infra.db;
    ctx.jwtLoginService = infra.jwtLoginService;
    ctx.sessionCacheService = infra.sessionCacheService;
    ctx.sentEmails = infra.sentEmails;

    const { client, bucket } = createTestS3Client(infra.configService);
    ctx.s3Client = client;
    ctx.s3Bucket = bucket;
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (ctx.createdClassIds.length > 0) {
      await ctx.db
        .deleteFrom('classes')
        .where('id', 'in', ctx.createdClassIds)
        .execute();
    }

    if (ctx.createdBusinessIds.length > 0) {
      await ctx.db
        .deleteFrom('businesses')
        .where('id', 'in', ctx.createdBusinessIds)
        .execute();
    }

    if (ctx.createdUserIds.length > 0) {
      await ctx.db
        .deleteFrom('users')
        .where('id', 'in', ctx.createdUserIds)
        .execute();
    }

    for (const key of ctx.createdS3Keys) {
      try {
        await deleteS3Object(
          { client: ctx.s3Client, bucket: ctx.s3Bucket },
          key,
        );
      } catch {
        // best-effort cleanup
      }
    }

    await closeRealInfraTestApp({ app: ctx.app, db: ctx.db });
  });

  beforeEach(() => {
    ctx.sentEmails.mockClear();
  });

  return ctx;
}
