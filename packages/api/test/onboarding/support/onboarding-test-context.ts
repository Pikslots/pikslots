import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import type { Kysely } from 'kysely';

import type { PikSlotsDatabase } from '../../../src/shared/database/schema';
import type { JwtLoginService } from '../../../src/shared/security/jwt/jwt.login.service';
import type { SessionCacheService } from '../../../src/shared/cache/session/session.cache.service';
import {
  createRealInfraTestApp,
  closeRealInfraTestApp,
} from '../../common/real-infra-test-app';

export interface OnboardingTestContext {
  app: INestApplication<App>;
  db: Kysely<PikSlotsDatabase>;
  jwtLoginService: JwtLoginService;
  sessionCacheService: SessionCacheService;
  sentEmails: jest.Mock;
  /** Every user/business created by onboarding must be pushed here so afterAll can delete it for real. */
  createdUserIds: string[];
  createdBusinessIds: string[];
}

/**
 * Startup/teardown for the Onboarding module's e2e suite: boots the real app
 * against real infra (Postgres via Kysely, Redis-backed BullMQ) and registers
 * the beforeAll/afterAll hooks for whichever describe block calls it.
 *
 * Onboarding writes 2 users + 1 business, so cleanup deletes the business
 * first (businesses.owner_id FKs users.id) and then the users.
 */
export function setupOnboardingTestContext(): OnboardingTestContext {
  jest.setTimeout(30000);

  const ctx: OnboardingTestContext = {
    createdUserIds: [],
    createdBusinessIds: [],
  } as unknown as OnboardingTestContext;

  beforeAll(async () => {
    const infra = await createRealInfraTestApp();
    ctx.app = infra.app;
    ctx.db = infra.db;
    ctx.jwtLoginService = infra.jwtLoginService;
    ctx.sessionCacheService = infra.sessionCacheService;
    ctx.sentEmails = infra.sentEmails;
  });

  afterAll(async () => {
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

    await closeRealInfraTestApp({ app: ctx.app, db: ctx.db });
  });

  return ctx;
}
