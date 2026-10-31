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

export interface BusinessTestContext {
  app: INestApplication<App>;
  db: Kysely<PikSlotsDatabase>;
  jwtLoginService: JwtLoginService;
  sessionCacheService: SessionCacheService;
  s3Client: S3Client;
  s3Bucket: string;
  sentEmails: jest.Mock;
  /** Every business/user/S3 key created by a test must be pushed here so afterAll can delete it for real. */
  createdBusinessIds: string[];
  createdUserIds: string[];
  createdS3Keys: string[];
}

/**
 * The startup/teardown for the Business module's e2e suite: boots the real
 * app (via the generic common bootstrap), adds the Business-specific
 * handles (S3 client/bucket) and cleanup tracking, and registers the
 * beforeAll/afterAll/beforeEach hooks for whichever describe block calls it.
 *
 * Each *.e2e-test.ts file calls this once at the top of its own describe
 * block — the app is booted fresh per file (Jest isolates files), but every
 * business/user/S3 object created is deleted again before the file's app
 * closes, so files never leak real state into each other or into dev.
 */
export function setupBusinessTestContext(): BusinessTestContext {
  jest.setTimeout(30000);

  const ctx: BusinessTestContext = {
    createdBusinessIds: [],
    createdUserIds: [],
    createdS3Keys: [],
  } as unknown as BusinessTestContext;

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
    // Every createBusiness() call enqueues a real registration-invite job
    // that the real worker processes asynchronously; after sending the
    // (mocked) email it still enqueues a trailing user.assign.to.business
    // job. Closing the app right after a test resolves can race that
    // trailing enqueue, failing it with "Connection is closed". A short
    // grace period lets any in-flight processing settle first.
    await new Promise((resolve) => setTimeout(resolve, 300));

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
