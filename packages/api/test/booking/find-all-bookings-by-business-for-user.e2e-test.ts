import { randomUUID } from 'node:crypto';
import { BOOKING_ENDPOINTS } from '@pikslots/shared';

import { successBody, errorBody } from '../common/http-envelope';
import { setupBookingTestContext } from './support/booking-test-context';
import {
  createOwningBusiness,
  createStaffUser,
  createCustomerForBusiness,
  createServiceForBusiness,
  registerBookingPayload,
  createBooking,
  findAllBookingsByBusinessForUser,
  tokenForRole,
} from './support/booking-fixtures';

describe(`GET ${BOOKING_ENDPOINTS.FIND_ALL_BY_BUSINESS_FOR_USER}`, () => {
  const ctx = setupBookingTestContext();

  it("returns only the Standard user's own active bookings, excluding other users' bookings in the same business", async () => {
    const businessId = await createOwningBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const { id: otherUserId } = await createStaffUser(
      ctx,
      businessId,
      'Standard',
    );
    const customerId = await createCustomerForBusiness(ctx, businessId);
    const serviceId = await createServiceForBusiness(ctx, businessId);
    const token = await tokenForRole(ctx, 'Standard', businessId, userId);
    const otherToken = await tokenForRole(ctx, 'Standard', businessId, otherUserId);

    await createBooking(
      ctx,
      registerBookingPayload(businessId, serviceId, userId, customerId, {
        bookingStartTime: '2026-08-01T09:00:00.000Z',
        bookingEndTime: '2026-08-01T09:30:00.000Z',
      }),
      token,
    );
    await createBooking(
      ctx,
      registerBookingPayload(businessId, serviceId, otherUserId, customerId, {
        bookingStartTime: '2026-08-01T10:00:00.000Z',
        bookingEndTime: '2026-08-01T10:30:00.000Z',
      }),
      otherToken,
    );

    const response = await findAllBookingsByBusinessForUser(
      ctx,
      businessId,
      userId,
      token,
      {
        startDateTime: '2026-08-01',
        endDateTime: '2026-08-31',
        timezone: 'UTC',
      },
    );

    expect(response.status).toBe(200);
    const data = successBody<Record<string, unknown>[]>(response).data;
    expect(data).toHaveLength(1);
  });

  it('returns every business booking when called by a Business Owner', async () => {
    const businessId = await createOwningBusiness(ctx);
    const owner = await createStaffUser(ctx, businessId, 'Business Owner');
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const { id: otherUserId } = await createStaffUser(
      ctx,
      businessId,
      'Standard',
    );
    const customerId = await createCustomerForBusiness(ctx, businessId);
    const serviceId = await createServiceForBusiness(ctx, businessId);

    await createBooking(
      ctx,
      registerBookingPayload(businessId, serviceId, userId, customerId, {
        bookingDate: '2026-08-02',
        bookingStartTime: '2026-08-02T09:00:00.000Z',
        bookingEndTime: '2026-08-02T09:30:00.000Z',
      }),
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );
    await createBooking(
      ctx,
      registerBookingPayload(businessId, serviceId, otherUserId, customerId, {
        bookingDate: '2026-08-02',
        bookingStartTime: '2026-08-02T10:00:00.000Z',
        bookingEndTime: '2026-08-02T10:30:00.000Z',
      }),
      await tokenForRole(ctx, 'Standard', businessId, otherUserId),
    );

    const response = await findAllBookingsByBusinessForUser(
      ctx,
      businessId,
      userId,
      await tokenForRole(ctx, 'Business Owner', businessId, owner.id),
      {
        startDateTime: '2026-08-01',
        endDateTime: '2026-08-31',
        timezone: 'UTC',
      },
    );

    expect(response.status).toBe(200);
    const data = successBody<Record<string, unknown>[]>(response).data;
    expect(data).toHaveLength(2);
  });

  it('returns an empty array for a user with no bookings', async () => {
    const businessId = await createOwningBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');

    const response = await findAllBookingsByBusinessForUser(
      ctx,
      businessId,
      userId,
      await tokenForRole(ctx, 'Standard', businessId, userId),
      {
        startDateTime: '2026-08-01',
        endDateTime: '2026-08-31',
        timezone: 'UTC',
      },
    );

    expect(response.status).toBe(200);
    expect(successBody(response).data).toEqual([]);
  });

  it("returns 401 when a different Standard user tries to view someone else's bookings", async () => {
    const businessId = await createOwningBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const otherUser = await createStaffUser(ctx, businessId, 'Standard');

    const response = await findAllBookingsByBusinessForUser(
      ctx,
      businessId,
      userId,
      await tokenForRole(ctx, 'Standard', businessId, otherUser.id),
      {
        startDateTime: '2026-08-01',
        endDateTime: '2026-08-31',
        timezone: 'UTC',
      },
    );

    expect(response.status).toBe(401);
    expect(errorBody(response).statusCode).toBe(401);
  });

  it('returns 401 when the caller belongs to a different business', async () => {
    const businessId = await createOwningBusiness(ctx);
    const otherBusinessId = await createOwningBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');

    const response = await findAllBookingsByBusinessForUser(
      ctx,
      businessId,
      userId,
      await tokenForRole(ctx, 'Admin', otherBusinessId, randomUUID()),
      {
        startDateTime: '2026-08-01',
        endDateTime: '2026-08-31',
        timezone: 'UTC',
      },
    );

    expect(response.status).toBe(401);
    expect(errorBody(response).statusCode).toBe(401);
  });

  describe('route param binding sanity check', () => {
    // The controller destructures businessId/userId via two separate
    // @Param() decorators (`@Param('businessId') businessId`,
    // `@Param('userId') userId`) rather than a single @Param() DTO object --
    // confirmed against both the handler and its @ApiParam Swagger docs
    // (booking.controller.docs.ts). This test pins down that the two path
    // segments bind to the correct named values and aren't silently
    // transposed, since a transposition here wouldn't be caught by the
    // usecase's own unit tests (they call `.execute(businessId, userId)`
    // directly with no HTTP routing involved).
    it('binds :businessId and :userId to the correct positions, not swapped', async () => {
      const businessId = await createOwningBusiness(ctx);
      const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
      const customerId = await createCustomerForBusiness(ctx, businessId);
      const serviceId = await createServiceForBusiness(ctx, businessId);
      const token = await tokenForRole(ctx, 'Standard', businessId, userId);

      await createBooking(
        ctx,
        registerBookingPayload(businessId, serviceId, userId, customerId),
        token,
      );

      // businessId and userId are different-shaped values (a v7 business
      // uuid vs a v4 user uuid) so a transposition would manifest as a 401
      // (mismatched business/self check) or a 200 with an empty array,
      // rather than silently succeeding.
      const response = await findAllBookingsByBusinessForUser(
        ctx,
        businessId,
        userId,
        token,
        {
          startDateTime: '2026-06-01',
          endDateTime: '2026-06-30',
          timezone: 'UTC',
        },
      );

      expect(response.status).toBe(200);
      expect(successBody(response).data).toHaveLength(1);
    });
  });
});
