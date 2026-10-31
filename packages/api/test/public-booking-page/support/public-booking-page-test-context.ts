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

export interface PublicBookingPageTestContext {
  app: INestApplication<App>;
  db: Kysely<PikSlotsDatabase>;
  jwtLoginService: JwtLoginService;
  sessionCacheService: SessionCacheService;
  sentEmails: jest.Mock;
  /**
   * Everything this suite creates — services, service_groups,
   * service_group_assignments, service_user_assignments, users — cascades
   * off businesses.id, so tracking the businesses is enough for cleanup.
   */
  createdBusinessIds: string[];
  createdUserIds: string[];
}

/**
 * Startup/teardown for the Public Booking Page module's e2e suite. Boots
 * the real app (real Postgres + real Redis-backed BullMQ worker + real
 * S3/RustFS), since group membership shown on the public page is only ever
 * populated as a side effect of the real SyncServiceServiceGroupsEvent /
 * SyncServiceToUsersEvent queue processors.
 */
export function setupPublicBookingPageTestContext(): PublicBookingPageTestContext {
  jest.setTimeout(30000);

  const ctx: PublicBookingPageTestContext = {
    createdBusinessIds: [],
    createdUserIds: [],
  } as unknown as PublicBookingPageTestContext;

  beforeAll(async () => {
    const infra = await createRealInfraTestApp();
    ctx.app = infra.app;
    ctx.db = infra.db;
    ctx.jwtLoginService = infra.jwtLoginService;
    ctx.sessionCacheService = infra.sessionCacheService;
    ctx.sentEmails = infra.sentEmails;
  });

  afterAll(async () => {
    // Grace period for any in-flight sync jobs, mirroring the other
    // BullMQ-backed suites (class-group-assignment, service-group).
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

    await closeRealInfraTestApp({ app: ctx.app, db: ctx.db });
  });

  beforeEach(() => {
    ctx.sentEmails.mockClear();
  });

  return ctx;
}
