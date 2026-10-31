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

export interface TimeoffTestContext {
  app: INestApplication<App>;
  db: Kysely<PikSlotsDatabase>;
  jwtLoginService: JwtLoginService;
  sessionCacheService: SessionCacheService;
  sentEmails: jest.Mock;
  /**
   * s3Client/s3Bucket/createdS3Keys exist purely so this context is
   * structurally assignable to BusinessTestContext -- createOwningBusiness
   * reuses the real createBusiness() from the Business suite's fixtures,
   * and that function's parameter type requires these fields even though
   * a plain business registration never touches S3. Nothing in the
   * Timeoff suite itself populates createdS3Keys.
   */
  s3Client: S3Client;
  s3Bucket: string;
  createdS3Keys: string[];
  /**
   * Unlike Customer (customers.business_id has ON DELETE CASCADE), the
   * timeoffs table's `user_id` and `business_id` FKs were created with no
   * onDelete clause at all (see the timeoff_table migration) -- the default
   * is RESTRICT. Deleting a business or user while a timeoff row still
   * points at it would throw a live FK-violation in afterAll. So timeoffs
   * MUST be deleted first, explicitly, before businesses/users.
   */
  createdTimeoffIds: string[];
  createdBusinessIds: string[];
  createdUserIds: string[];
}

export function setupTimeoffTestContext(): TimeoffTestContext {
  jest.setTimeout(30000);

  const ctx: TimeoffTestContext = {
    createdTimeoffIds: [],
    createdBusinessIds: [],
    createdUserIds: [],
    createdS3Keys: [],
  } as unknown as TimeoffTestContext;

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
    // Same async settle-time cushion as the Business/Customer suites.
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (ctx.createdTimeoffIds.length > 0) {
      // Delete FIRST: timeoffs.user_id / business_id are RESTRICT, not
      // CASCADE, so businesses/users below would fail to delete otherwise.
      await ctx.db
        .deleteFrom('timeoffs')
        .where('id', 'in', ctx.createdTimeoffIds)
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
