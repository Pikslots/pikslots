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

export interface ServiceUserAssignmentTestContext {
  app: INestApplication<App>;
  db: Kysely<PikSlotsDatabase>;
  jwtLoginService: JwtLoginService;
  sessionCacheService: SessionCacheService;
  sentEmails: jest.Mock;
  /**
   * Only businesses/users need explicit tracking — services and
   * service_user_assignments both cascade-delete off businesses.id (see the
   * service_user_assignment_table migration: service_id, user_id, AND
   * business_id are all ON DELETE CASCADE), so deleting the tracked
   * businesses is enough to clean up everything this suite creates.
   */
  createdBusinessIds: string[];
  createdUserIds: string[];
}

/**
 * Startup/teardown for the Service User Assignment module's e2e suite.
 * Boots the real app (real Postgres + real Redis-backed BullMQ worker) —
 * unlike Service Group Assignment, this module DOES have direct
 * assign/remove HTTP endpoints, but assignments can ALSO be created as a
 * side effect of the real SyncServiceToUsersEvent queue processor when a
 * service is registered/edited with `associatedUsers`. Both paths are
 * exercised across this suite's test files.
 *
 * Mirrors setupServiceGroupAssignmentTestContext / setupClassGroupAssignmentTestContext.
 */
export function setupServiceUserAssignmentTestContext(): ServiceUserAssignmentTestContext {
  jest.setTimeout(30000);

  const ctx: ServiceUserAssignmentTestContext = {
    createdBusinessIds: [],
    createdUserIds: [],
  } as unknown as ServiceUserAssignmentTestContext;

  beforeAll(async () => {
    const infra = await createRealInfraTestApp();
    ctx.app = infra.app;
    ctx.db = infra.db;
    ctx.jwtLoginService = infra.jwtLoginService;
    ctx.sessionCacheService = infra.sessionCacheService;
    ctx.sentEmails = infra.sentEmails;
  });

  afterAll(async () => {
    // Mirrors the grace period in the sibling assignment suites: registering
    // a service enqueues a real sync job the real worker processes
    // asynchronously. Closing the app immediately after a test resolves can
    // race that in-flight job.
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
