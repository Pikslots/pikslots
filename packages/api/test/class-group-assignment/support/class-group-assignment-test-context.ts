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

export interface ClassGroupAssignmentTestContext {
  app: INestApplication<App>;
  db: Kysely<PikSlotsDatabase>;
  jwtLoginService: JwtLoginService;
  sessionCacheService: SessionCacheService;
  sentEmails: jest.Mock;
  /**
   * Only businesses/users need explicit tracking — classes, class_groups,
   * and class_group_assignments all cascade-delete off businesses.id, so
   * deleting the tracked businesses is enough to clean up everything this
   * suite creates.
   */
  createdBusinessIds: string[];
  createdUserIds: string[];
}

/**
 * Startup/teardown for the Class Group Assignment module's e2e suite. Boots
 * the real app (real Postgres + real Redis-backed BullMQ worker), since the
 * assignments under test are only ever created as a side effect of the real
 * SyncClassClassGroupsEvent / SyncClassGroupClassesEvent queue processors —
 * there's no direct "create assignment" endpoint to hit.
 */
export function setupClassGroupAssignmentTestContext(): ClassGroupAssignmentTestContext {
  jest.setTimeout(30000);

  const ctx: ClassGroupAssignmentTestContext = {
    createdBusinessIds: [],
    createdUserIds: [],
  } as unknown as ClassGroupAssignmentTestContext;

  beforeAll(async () => {
    const infra = await createRealInfraTestApp();
    ctx.app = infra.app;
    ctx.db = infra.db;
    ctx.jwtLoginService = infra.jwtLoginService;
    ctx.sessionCacheService = infra.sessionCacheService;
    ctx.sentEmails = infra.sentEmails;
  });

  afterAll(async () => {
    // Mirrors the grace period in setupBusinessTestContext: registering a
    // class/class-group enqueues a real sync job that the real worker
    // processes asynchronously. Closing the app immediately after a test
    // resolves can race that in-flight job.
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
