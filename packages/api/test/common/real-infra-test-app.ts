// Must be the first import in this file. @nestjs/config only assigns a
// process.env key if it isn't already set, and ConfigModule.forRoot() runs
// as an eager side effect the moment its file is require()'d (it's a plain
// call inside the @Module() decorator's argument) — so whichever of
// PikslotsConfigModule (dev .env) or this module (.test.env) gets imported
// first wins process.env for every shared key. Importing PikslotsAppModule
// below pulls in PikslotsConfigModule transitively, so this must come first.
import { E2eTestConfigModule } from '../config/env.config.testing.module';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { App } from 'supertest/types';
import { Kysely } from 'kysely';
import cookieParser from 'cookie-parser';

import { PikslotsAppModule } from '../../src/pikslots.app.module';
import { PikslotsConfigModule } from '../../src/shared/config/pikslots.config.module';
import { PIKSLOTS_DB } from '../../src/shared/database/pikslots.database.module';
import type { PikSlotsDatabase } from '../../src/shared/database/schema';
import { JwtLoginService } from '../../src/shared/security/jwt/jwt.login.service';
import { SessionCacheService } from '../../src/shared/cache/session/session.cache.service';
import { PikslotEmailService } from '../../src/shared/email/pikslot.email.service';
import { validationExceptionFactory } from '../../src/shared/pipes/validation.exception.factory';
import type { Env } from '../../src/shared/config/env';

export interface RealInfraTestApp {
  app: INestApplication<App>;
  db: Kysely<PikSlotsDatabase>;
  configService: ConfigService<Env, true>;
  jwtLoginService: JwtLoginService;
  sessionCacheService: SessionCacheService;
  /** Mocked PikslotEmailService.sendEmail — the real BullMQ worker still runs, but nothing hits SMTP/Mailpit. */
  sentEmails: jest.Mock;
}

/**
 * Boots the real, full PikslotsAppModule against real infra (Postgres via
 * Kysely, Redis-backed BullMQ with a real worker, S3/RustFS), reading config
 * from .test.env instead of dev's .env. The only thing mocked is the final
 * email send, so registration jobs still process for real without touching
 * SMTP/Mailpit.
 *
 * This is generic across any module's e2e suite — it knows nothing about
 * Business specifically.
 */
export async function createRealInfraTestApp(): Promise<RealInfraTestApp> {
  const sentEmails: jest.Mock = jest.fn().mockResolvedValue({
    ok: true,
    value: undefined,
  });

  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [PikslotsAppModule],
  })
    .overrideModule(PikslotsConfigModule)
    .useModule(E2eTestConfigModule)
    .overrideProvider(PikslotEmailService)
    .useValue({ sendEmail: sentEmails })
    .compile();

  const app: INestApplication<App> = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ exceptionFactory: validationExceptionFactory }),
  );
  // Mirrors main.ts's bootstrap() — this test harness builds the app via
  // Test.createTestingModule() + createNestApplication() directly rather
  // than going through main.ts, so main.ts's own app.use(cookieParser())
  // call is never reached here. Without it, req.cookies is always
  // undefined, and User module endpoints that read a cookie directly
  // (refreshUserSession's req.cookies?.jid) would 401 unconditionally
  // regardless of what the client actually sent.
  app.use(cookieParser());
  await app.init();

  return {
    app,
    db: app.get<Kysely<PikSlotsDatabase>>(PIKSLOTS_DB),
    configService: app.get<ConfigService<Env, true>>(ConfigService),
    jwtLoginService: app.get(JwtLoginService),
    sessionCacheService: app.get(SessionCacheService),
    sentEmails,
  };
}

/** Closes the real pg pool before closing the app, so Jest doesn't hang on an open handle. */
export async function closeRealInfraTestApp({
  app,
  db,
}: Pick<RealInfraTestApp, 'app' | 'db'>): Promise<void> {
  await db.destroy();
  await app.close();
}
