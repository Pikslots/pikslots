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

export interface ServiceGroupTestContext {
  app: INestApplication<App>;
  db: Kysely<PikSlotsDatabase>;
  jwtLoginService: JwtLoginService;
  sessionCacheService: SessionCacheService;
  sentEmails: jest.Mock;
  /** service_groups cascade-delete off businesses.id, so tracking businesses is enough for cleanup. */
  createdBusinessIds: string[];
  createdUserIds: string[];
}

/**
 * Startup/teardown for the Service Group module's e2e suite: boots the real
 * app against real Postgres (and real Redis-backed BullMQ, since register
 * and edit both enqueue a real SyncServiceGroupServicesEvent job).
 */
export function setupServiceGroupTestContext(): ServiceGroupTestContext {
  jest.setTimeout(30000);

  const ctx: ServiceGroupTestContext = {
    createdBusinessIds: [],
    createdUserIds: [],
  } as unknown as ServiceGroupTestContext;

  beforeAll(async () => {
    const infra = await createRealInfraTestApp();
    ctx.app = infra.app;
    ctx.db = infra.db;
    ctx.jwtLoginService = infra.jwtLoginService;
    ctx.sessionCacheService = infra.sessionCacheService;
    ctx.sentEmails = infra.sentEmails;
  });

  afterAll(async () => {
    // Registering/editing a service group enqueues a real sync job the real
    // worker processes asynchronously; give it a moment before tearing down.
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
