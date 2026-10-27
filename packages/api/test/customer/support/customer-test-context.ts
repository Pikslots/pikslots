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

export interface CustomerTestContext {
  app: INestApplication<App>;
  db: Kysely<PikSlotsDatabase>;
  jwtLoginService: JwtLoginService;
  sessionCacheService: SessionCacheService;
  s3Client: S3Client;
  s3Bucket: string;
  sentEmails: jest.Mock;
  /**
   * Every business/user/S3 key created by a test must be pushed here so
   * afterAll can delete it for real. Customers themselves are NOT tracked
   * separately: customers.business_id has ON DELETE CASCADE (see the
   * customer_table migration), so deleting the owning business in afterAll
   * takes every customer created under it with it.
   */
  createdBusinessIds: string[];
  createdUserIds: string[];
  createdCustomerIds: string[];
  createdS3Keys: string[];
}

/**
 * The startup/teardown for the Customer module's e2e suite. Mirrors
 * setupBusinessTestContext exactly (same generic real-infra bootstrap, same
 * S3 handles), since customer fixtures register a real business first via
 * the Business suite's own fixtures — see customer-fixtures.ts.
 */
export function setupCustomerTestContext(): CustomerTestContext {
  jest.setTimeout(30000);

  const ctx: CustomerTestContext = {
    createdBusinessIds: [],
    createdUserIds: [],
    createdCustomerIds: [],
    createdS3Keys: [],
  } as unknown as CustomerTestContext;

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
    // Same race as the Business suite: registering the owning business
    // enqueues a real registration-invite job that keeps processing
    // asynchronously after the test resolves. Give it a moment to settle
    // before the pool/app close underneath it.
    await new Promise((resolve) => setTimeout(resolve, 300));

    // NOTE removing businesses deletes the customer and the users since using cascade
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
