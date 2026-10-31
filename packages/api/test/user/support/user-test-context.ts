import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import type { Kysely } from 'kysely';

import type { PikSlotsDatabase } from '../../../src/shared/database/schema';
import type { JwtLoginService } from '../../../src/shared/security/jwt/jwt.login.service';
import type { SessionCacheService } from '../../../src/shared/cache/session/session.cache.service';
import { PasswordHashingService } from '../../../src/shared/security/hashing/password.hashing.service';
import {
  createRealInfraTestApp,
  closeRealInfraTestApp,
} from '../../common/real-infra-test-app';

export interface UserTestContext {
  app: INestApplication<App>;
  db: Kysely<PikSlotsDatabase>;
  jwtLoginService: JwtLoginService;
  sessionCacheService: SessionCacheService;
  passwordHashingService: PasswordHashingService;
  sentEmails: jest.Mock;
  /**
   * Only businesses/users need explicit tracking. Users created directly by
   * this suite's fixtures (rather than via the real invite flow) aren't
   * attached to a tracked business in every case, so both arrays are
   * cleaned up independently rather than relying on cascade alone.
   */
  createdBusinessIds: string[];
  createdUserIds: string[];
}

/**
 * Startup/teardown for the User module's e2e suite. Boots the real app
 * (real Postgres, real Redis-backed OTP cache, real BullMQ) with the
 * email send mocked (see real-infra-test-app.ts's sentEmails) — this
 * suite reads captured email `context` payloads directly to pull real
 * invite tokens and OTP codes out of the invite/accept-invite flow rather
 * than reaching into Redis or JWT internals itself.
 */
export function setupUserTestContext(): UserTestContext {
  jest.setTimeout(45000);

  const ctx: UserTestContext = {
    createdBusinessIds: [],
    createdUserIds: [],
  } as unknown as UserTestContext;

  beforeAll(async () => {
    const infra = await createRealInfraTestApp();
    ctx.app = infra.app;
    ctx.db = infra.db;
    ctx.jwtLoginService = infra.jwtLoginService;
    ctx.sessionCacheService = infra.sessionCacheService;
    ctx.sentEmails = infra.sentEmails;
    ctx.passwordHashingService = ctx.app.get(PasswordHashingService);
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (ctx.createdBusinessIds.length > 0) {
      // timeoffs.business_id has NO ON DELETE CASCADE (unlike bookings and
      // breaks, which do — see the timeoff_table migration vs
      // break_table/booking_table). This suite's free-slots/available-dates
      // fixtures (insertTimeoff) insert real timeoff rows directly, so they
      // must be cleared explicitly before businesses, or the business
      // delete below fails with a live fk violation
      // ("timeoffs_business_id_fkey").
      await ctx.db
        .deleteFrom('timeoffs')
        .where('business_id', 'in', ctx.createdBusinessIds)
        .execute();

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
