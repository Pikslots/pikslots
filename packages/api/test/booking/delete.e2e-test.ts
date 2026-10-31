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
  deleteBooking,
  tokenForRole,
} from './support/booking-fixtures';

describe(`DELETE ${BOOKING_ENDPOINTS.DELETE}`, () => {
  const ctx = setupBookingTestContext();

  it('soft-deletes a real row in Postgres when done by a Business Owner', async () => {
    const businessId = await createOwningBusiness(ctx);
    const owner = await createStaffUser(ctx, businessId, 'Business Owner');
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const customerId = await createCustomerForBusiness(ctx, businessId);
    const serviceId = await createServiceForBusiness(ctx, businessId);
    const created = await createBooking(
      ctx,
      registerBookingPayload(businessId, serviceId, userId, customerId),
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );

    const response = await deleteBooking(
      ctx,
      created.id,
      await tokenForRole(ctx, 'Business Owner', businessId, owner.id),
    );

    expect(response.status).toBe(200);
    expect(successBody(response).data).toEqual({ message: 'success' });

    const row = await ctx.db
      .selectFrom('bookings')
      .selectAll()
      .where('id', '=', created.id)
      .executeTakeFirstOrThrow();
    expect(row.is_deleted).toBe(true);
    expect(row.deleted_at).not.toBeNull();
  });

  it('frees up the time slot for a new booking after deletion', async () => {
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
        bookingStartTime: '2026-10-01T09:00:00.000Z',
        bookingEndTime: '2026-10-01T09:30:00.000Z',
      },
    );
    const created = await createBooking(
      ctx,
      registerPayload,
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );

    await deleteBooking(
      ctx,
      created.id,
      await tokenForRole(ctx, 'Admin', businessId, admin.id),
    ).then((res) => expect(res.status).toBe(200));

    const secondAttempt = await createBooking(
      ctx,
      registerPayload,
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );

    expect(secondAttempt.id).not.toBe(created.id);
  });

  it("allows an Admin in the same business to delete another user's booking", async () => {
    const businessId = await createOwningBusiness(ctx);
    const admin = await createStaffUser(ctx, businessId, 'Admin');
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const customerId = await createCustomerForBusiness(ctx, businessId);
    const serviceId = await createServiceForBusiness(ctx, businessId);
    const created = await createBooking(
      ctx,
      registerBookingPayload(businessId, serviceId, userId, customerId),
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );

    const response = await deleteBooking(
      ctx,
      created.id,
      await tokenForRole(ctx, 'Admin', businessId, admin.id),
    );

    expect(response.status).toBe(200);
  });

  it('returns 401 when an Admin from a different business tries to delete', async () => {
    const businessId = await createOwningBusiness(ctx);
    const otherBusinessId = await createOwningBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const customerId = await createCustomerForBusiness(ctx, businessId);
    const serviceId = await createServiceForBusiness(ctx, businessId);
    const created = await createBooking(
      ctx,
      registerBookingPayload(businessId, serviceId, userId, customerId),
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );

    const response = await deleteBooking(
      ctx,
      created.id,
      await tokenForRole(ctx, 'Admin', otherBusinessId, randomUUID()),
    );

    expect(response.status).toBe(401);
    expect(errorBody(response).statusCode).toBe(401);
  });

  it('returns 404 when deleting a booking that does not exist', async () => {
    const businessId = await createOwningBusiness(ctx);
    const admin = await createStaffUser(ctx, businessId, 'Admin');

    const response = await deleteBooking(
      ctx,
      randomUUID(),
      await tokenForRole(ctx, 'Admin', businessId, admin.id),
    );

    expect(response.status).toBe(404);
    expect(errorBody(response).statusCode).toBe(404);
  });

  it('returns 404 when deleting a booking that was already deleted', async () => {
    const businessId = await createOwningBusiness(ctx);
    const admin = await createStaffUser(ctx, businessId, 'Admin');
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const customerId = await createCustomerForBusiness(ctx, businessId);
    const serviceId = await createServiceForBusiness(ctx, businessId);
    const created = await createBooking(
      ctx,
      registerBookingPayload(businessId, serviceId, userId, customerId),
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );
    const adminToken = await tokenForRole(ctx, 'Admin', businessId, admin.id);

    await deleteBooking(ctx, created.id, adminToken).then((res) =>
      expect(res.status).toBe(200),
    );

    const response = await deleteBooking(ctx, created.id, adminToken);

    expect(response.status).toBe(404);
    expect(errorBody(response).statusCode).toBe(404);
  });

  describe('rejects roles that are not permitted to delete bookings', () => {
    it('rejects a Standard user to delete their own booking', async () => {
      const businessId = await createOwningBusiness(ctx);
      const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
      const customerId = await createCustomerForBusiness(ctx, businessId);
      const serviceId = await createServiceForBusiness(ctx, businessId);
      const token = await tokenForRole(ctx, 'Standard', businessId, userId);
      const created = await createBooking(
        ctx,
        registerBookingPayload(businessId, serviceId, userId, customerId),
        token,
      );

      const response = await deleteBooking(ctx, created.id, token);

      expect(response.status).toBe(403);
    });

    it('rejects an Enhanced user to delete a booking within their own business, even if not the booked user', async () => {
      const businessId = await createOwningBusiness(ctx);
      const enhanced = await createStaffUser(ctx, businessId, 'Enhanced');
      const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
      const customerId = await createCustomerForBusiness(ctx, businessId);
      const serviceId = await createServiceForBusiness(ctx, businessId);
      const created = await createBooking(
        ctx,
        registerBookingPayload(businessId, serviceId, userId, customerId),
        await tokenForRole(ctx, 'Standard', businessId, userId),
      );

      const response = await deleteBooking(
        ctx,
        created.id,
        await tokenForRole(ctx, 'Enhanced', businessId, enhanced.id),
      );

      expect(response.status).toBe(403);
    });
  });
});
