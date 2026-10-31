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
  editBookingPayload,
  editBooking,
  tokenForRole,
} from './support/booking-fixtures';

describe(`PATCH ${BOOKING_ENDPOINTS.EDIT}`, () => {
  const ctx = setupBookingTestContext();

  it('updates a real row in Postgres for its own Standard user', async () => {
    const businessId = await createOwningBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const customerId = await createCustomerForBusiness(ctx, businessId);
    const serviceId = await createServiceForBusiness(ctx, businessId);
    const otherServiceId = await createServiceForBusiness(ctx, businessId);
    const token = await tokenForRole(ctx, 'Standard', businessId, userId);
    const registerPayload = registerBookingPayload(
      businessId,
      serviceId,
      userId,
      customerId,
      {
        bookingStartTime: '2026-09-01T09:00:00.000Z',
        bookingEndTime: '2026-09-01T09:30:00.000Z',
      },
    );
    const created = await createBooking(ctx, registerPayload, token);

    const payload = editBookingPayload({
      bookingDate: registerPayload.bookingDate,
      bookingStartTime: '2026-09-01T13:00:00.000Z',
      bookingEndTime: '2026-09-01T13:30:00.000Z',
      serviceId: otherServiceId,
      customerId,
      userId,
    });

    const response = await editBooking(ctx, created.id, payload, token);

    expect(response.status).toBe(200);
    expect(successBody(response).data).toEqual({ message: 'success' });

    const row = await ctx.db
      .selectFrom('bookings')
      .selectAll()
      .where('id', '=', created.id)
      .executeTakeFirstOrThrow();
    expect(row.service_id).toBe(otherServiceId);
    expect(row.booking_start_time).toEqual(
      new Date('2026-09-01T13:00:00.000Z'),
    );
  });

  it("allows an Admin in the same business to edit another user's booking", async () => {
    const businessId = await createOwningBusiness(ctx);
    const admin = await createStaffUser(ctx, businessId, 'Admin');
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const customerId = await createCustomerForBusiness(ctx, businessId);
    const serviceId = await createServiceForBusiness(ctx, businessId);
    const registerPayload = registerBookingPayload(
      businessId,
      serviceId,
      userId,
      customerId,
      {
        bookingStartTime: '2026-09-02T09:00:00.000Z',
        bookingEndTime: '2026-09-02T09:30:00.000Z',
      },
    );
    const created = await createBooking(
      ctx,
      registerPayload,
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );

    const payload = editBookingPayload({
      bookingDate: registerPayload.bookingDate,
      bookingStartTime: '2026-09-02T14:00:00.000Z',
      bookingEndTime: '2026-09-02T14:30:00.000Z',
      serviceId,
      customerId,
      userId,
    });

    const response = await editBooking(
      ctx,
      created.id,
      payload,
      await tokenForRole(ctx, 'Admin', businessId, admin.id),
    );

    expect(response.status).toBe(200);
  });

  it("returns 401 when a different Standard user tries to edit someone else's booking", async () => {
    const businessId = await createOwningBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const otherUser = await createStaffUser(ctx, businessId, 'Standard');
    const customerId = await createCustomerForBusiness(ctx, businessId);
    const serviceId = await createServiceForBusiness(ctx, businessId);
    const registerPayload = registerBookingPayload(
      businessId,
      serviceId,
      userId,
      customerId,
    );
    const created = await createBooking(
      ctx,
      registerPayload,
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );

    const payload = editBookingPayload({
      bookingDate: registerPayload.bookingDate,
      bookingStartTime: registerPayload.bookingStartTime,
      bookingEndTime: registerPayload.bookingEndTime,
      serviceId,
      customerId,
      userId,
    });

    const response = await editBooking(
      ctx,
      created.id,
      payload,
      await tokenForRole(ctx, 'Standard', businessId, otherUser.id),
    );

    expect(response.status).toBe(401);
    expect(errorBody(response).statusCode).toBe(401);
  });

  it('returns 409 when the new time slot overlaps another active booking in the same business', async () => {
    const businessId = await createOwningBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const customerId = await createCustomerForBusiness(ctx, businessId);
    const serviceId = await createServiceForBusiness(ctx, businessId);
    const token = await tokenForRole(ctx, 'Standard', businessId, userId);

    await createBooking(
      ctx,
      registerBookingPayload(businessId, serviceId, userId, customerId, {
        bookingStartTime: '2026-09-03T10:00:00.000Z',
        bookingEndTime: '2026-09-03T10:30:00.000Z',
      }),
      token,
    );
    const registerPayload = registerBookingPayload(
      businessId,
      serviceId,
      userId,
      customerId,
      {
        bookingStartTime: '2026-09-03T13:00:00.000Z',
        bookingEndTime: '2026-09-03T13:30:00.000Z',
      },
    );
    const created = await createBooking(ctx, registerPayload, token);

    const payload = editBookingPayload({
      bookingDate: registerPayload.bookingDate,
      bookingStartTime: '2026-09-03T10:15:00.000Z',
      bookingEndTime: '2026-09-03T10:45:00.000Z',
      serviceId,
      customerId,
      userId,
    });

    const response = await editBooking(ctx, created.id, payload, token);

    expect(response.status).toBe(409);
    expect(errorBody(response).statusCode).toBe(409);
  });

  it('allows keeping the exact same time slot (self-exclusion from its own conflict check)', async () => {
    const businessId = await createOwningBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const customerId = await createCustomerForBusiness(ctx, businessId);
    const serviceId = await createServiceForBusiness(ctx, businessId);
    const token = await tokenForRole(ctx, 'Standard', businessId, userId);
    const registerPayload = registerBookingPayload(
      businessId,
      serviceId,
      userId,
      customerId,
      {
        bookingStartTime: '2026-09-04T09:00:00.000Z',
        bookingEndTime: '2026-09-04T09:30:00.000Z',
      },
    );
    const created = await createBooking(ctx, registerPayload, token);

    const payload = editBookingPayload({
      bookingDate: registerPayload.bookingDate,
      bookingStartTime: registerPayload.bookingStartTime,
      bookingEndTime: registerPayload.bookingEndTime,
      serviceId,
      customerId,
      userId,
    });

    const response = await editBooking(ctx, created.id, payload, token);

    expect(response.status).toBe(200);
  });

  it('returns 404 when editing a booking that does not exist', async () => {
    const businessId = await createOwningBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const customerId = await createCustomerForBusiness(ctx, businessId);
    const serviceId = await createServiceForBusiness(ctx, businessId);
    const token = await tokenForRole(ctx, 'Standard', businessId, userId);

    const payload = editBookingPayload({
      bookingDate: '2026-09-05',
      bookingStartTime: '2026-09-05T09:00:00.000Z',
      bookingEndTime: '2026-09-05T09:30:00.000Z',
      serviceId,
      customerId,
      userId,
    });

    const response = await editBooking(ctx, randomUUID(), payload, token);

    expect(response.status).toBe(404);
    expect(errorBody(response).statusCode).toBe(404);
  });
});
