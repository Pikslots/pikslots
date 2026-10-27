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

export interface ServiceGroupAssignmentTestContext {
  app: INestApplication<App>;
  db: Kysely<PikSlotsDatabase>;
  jwtLoginService: JwtLoginService;
  sessionCacheService: SessionCacheService;
  sentEmails: jest.Mock;
  /**
   * Only businesses/users need explicit tracking — services, service_groups,
   * and service_group_assignments all cascade-delete off businesses.id (see
   * the service_group_assignment migration: service_id, service_group_id,
   * AND business_id are all ON DELETE CASCADE), so deleting the tracked
   * businesses is enough to clean up everything this suite creates.
   */
  createdBusinessIds: string[];
  createdUserIds: string[];
}

/**
 * Startup/teardown for the Service Group Assignment module's e2e suite.
 * Boots the real app (real Postgres + real Redis-backed BullMQ worker),
 * since the assignments under test are only ever created as a side effect
 * of the real SyncServiceServiceGroupsEvent / SyncServiceGroupServicesEvent
 * queue processors — there's no direct "create assignment" endpoint to hit.
 *
 * Mirrors setupClassGroupAssignmentTestContext (test/class-group-assignment)
 * — same module shape, same event-sourced assignment mechanism.
 */
export function setupServiceGroupAssignmentTestContext(): ServiceGroupAssignmentTestContext {
  jest.setTimeout(30000);

  const ctx: ServiceGroupAssignmentTestContext = {
    createdBusinessIds: [],
    createdUserIds: [],
  } as unknown as ServiceGroupAssignmentTestContext;

  beforeAll(async () => {
    const infra = await createRealInfraTestApp();
    ctx.app = infra.app;
    ctx.db = infra.db;
    ctx.jwtLoginService = infra.jwtLoginService;
    ctx.sessionCacheService = infra.sessionCacheService;
    ctx.sentEmails = infra.sentEmails;
  });

  afterAll(async () => {
    // Mirrors the grace period in setupBusinessTestContext /
    // setupClassGroupAssignmentTestContext: registering a service/service
    // group enqueues a real sync job that the real worker processes
    // asynchronously. Closing the app immediately after a test resolves
    // can race that in-flight job.
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
