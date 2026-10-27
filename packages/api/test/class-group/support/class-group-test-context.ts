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

export interface ClassGroupTestContext {
  app: INestApplication<App>;
  db: Kysely<PikSlotsDatabase>;
  jwtLoginService: JwtLoginService;
  sessionCacheService: SessionCacheService;
  sentEmails: jest.Mock;
  /** Structural-compatibility-only fields, same reasoning as Class/Timeoff's context -- see those files. */
  s3Client: S3Client;
  s3Bucket: string;
  createdS3Keys: string[];
  /**
   * class_groups.business_id has ON DELETE CASCADE (see the
   * class_group_table migration), so deleting the owning business already
   * takes every group created under it with it. Tracked explicitly anyway,
   * belt-and-suspenders, same as Class/Customer.
   */
  createdClassGroupIds: string[];
  createdBusinessIds: string[];
  createdUserIds: string[];
}

export function setupClassGroupTestContext(): ClassGroupTestContext {
  jest.setTimeout(30000);

  const ctx: ClassGroupTestContext = {
    createdClassGroupIds: [],
    createdBusinessIds: [],
    createdUserIds: [],
    createdS3Keys: [],
  } as unknown as ClassGroupTestContext;

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

    if (ctx.createdClassGroupIds.length > 0) {
      await ctx.db
        .deleteFrom('class_groups')
        .where('id', 'in', ctx.createdClassGroupIds)
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
