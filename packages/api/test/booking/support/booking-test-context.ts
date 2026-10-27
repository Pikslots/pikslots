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
  destroyTestS3Client,
} from '../../common/s3-test-client';

export interface BookingTestContext {
  app: INestApplication<App>;
  db: Kysely<PikSlotsDatabase>;
  jwtLoginService: JwtLoginService;
  sessionCacheService: SessionCacheService;
  s3Client: S3Client;
  s3Bucket: string;
  sentEmails: jest.Mock;
  /**
   * Every business/user created by a test must be pushed here so afterAll
   * can delete it for real. Bookings, customers, and services are NOT
   * cleaned up separately: bookings.business_id, customers.business_id, and
   * services.business_id all have ON DELETE CASCADE (see their respective
   * migrations), so deleting the owning business in afterAll takes every
   * booking/customer/service created under it with it.
   *
   * IMPORTANT: this cascade is exactly why businesses must be deleted
   * BEFORE users below -- bookings.user_id is a RESTRICT (not CASCADE) fk
   * to users.id (see the booking_table migration), so a user row can't be
   * deleted while a booking still references it. Deleting the business
   * first cascades away the booking row, freeing the user row up for
   * deletion afterward.
   */
  createdBusinessIds: string[];
  createdUserIds: string[];
  createdS3Keys: string[];
  /**
   * Declared purely so this context is structurally assignable to
   * CustomerTestContext/ServiceTestContext -- createCustomer() and
   * createService() (reused as-is from the Customer/Service suites' own
   * fixtures) require these fields on their parameter type even though
   * neither is ever pushed to here: both FKs cascade from businesses (see
   * above), so nothing in the Booking suite itself needs to track them.
   */
  createdCustomerIds: string[];
  createdServiceIds: string[];
}

/**
 * The startup/teardown for the Booking module's e2e suite: boots the real
 * app (via the generic common bootstrap), adds the S3 handles (reused only
 * because createBusiness()/createCustomer() from the Business/Customer
 * suites' own fixtures require them structurally), and registers the
 * beforeAll/afterAll/beforeEach hooks for whichever describe block calls it.
 */
export function setupBookingTestContext(): BookingTestContext {
  jest.setTimeout(30000);

  const ctx: BookingTestContext = {
    createdBusinessIds: [],
    createdUserIds: [],
    createdS3Keys: [],
    createdCustomerIds: [],
    createdServiceIds: [],
  } as unknown as BookingTestContext;

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
    // Same async settle-time cushion as the Business/Customer/Timeoff
    // suites: registering the owning business enqueues a real
    // registration-invite job that keeps processing asynchronously after
    // the test resolves.
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Deletes businesses FIRST -- cascades away bookings/customers/services
    // created under them -- so users (RESTRICT'd against bookings.user_id)
    // can be deleted safely afterward. See the note on createdBusinessIds.
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

    // S3Client keeps an internal keep-alive HTTP agent open until this is
    // called explicitly — otherwise it's exactly the kind of leaked handle
    // behind Jest's "did not exit one second after the test run has
    // completed" warning. See the note on destroyTestS3Client.
    destroyTestS3Client({ client: ctx.s3Client, bucket: ctx.s3Bucket });

    await closeRealInfraTestApp({ app: ctx.app, db: ctx.db });
  });

  beforeEach(() => {
    ctx.sentEmails.mockClear();
  });

  return ctx;
}
