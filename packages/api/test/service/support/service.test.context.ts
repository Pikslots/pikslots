import { S3Client } from '@aws-sdk/client-s3';
import { INestApplication } from '@nestjs/common';
import { Kysely } from 'kysely';
import { PikSlotsDatabase } from 'src/shared/database/schema';
import { JwtLoginService } from 'src/shared/security/jwt/jwt.login.service';
import { SessionCacheService } from 'src/shared/cache/session/session.cache.service';
import { App } from 'supertest/types';
import {
  closeRealInfraTestApp,
  createRealInfraTestApp,
} from '../../common/real-infra-test-app';
import {
  createTestS3Client,
  deleteS3Object,
} from '../../common/s3-test-client';

export interface ServiceTestContext {
  app: INestApplication<App>;
  db: Kysely<PikSlotsDatabase>;
  jwtLoginService: JwtLoginService;
  sessionCacheService: SessionCacheService;
  s3Client: S3Client;
  s3Bucket: string;
  // every user/business/service/s3 key created by test must be pushed here so afterall we can delete it for real
  createdBusinessIds: string[];
  createdUserIds: string[];
  createdS3Keys: string[];
  createdServiceIds: string[];
}

export function setupServiceTestContext(): ServiceTestContext {
  jest.setTimeout(30000);

  const ctx: ServiceTestContext = {
    createdBusinessIds: [],
    createdUserIds: [],
    createdS3Keys: [],
    createdServiceIds: [],
  } as unknown as ServiceTestContext;

  beforeAll(async () => {
    const infra = await createRealInfraTestApp();
    ctx.app = infra.app;
    ctx.db = infra.db;
    ctx.jwtLoginService = infra.jwtLoginService;
    ctx.sessionCacheService = infra.sessionCacheService;

    const { client, bucket } = createTestS3Client(infra.configService);
    ctx.s3Client = client;
    ctx.s3Bucket = bucket;
  });

  afterAll(async () => {
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

    if (ctx.createdServiceIds.length > 0) {
      await ctx.db
        .deleteFrom('services')
        .where('id', 'in', ctx.createdServiceIds)
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

  return ctx;
}
