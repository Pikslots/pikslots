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
  findBookingById,
  deleteBooking,
  tokenForRole,
} from './support/booking-fixtures';

describe(`GET ${BOOKING_ENDPOINTS.FIND_BY_ID}`, () => {
  const ctx = setupBookingTestContext();

  it('returns the full booking shape, including audit fields, for its own Standard user', async () => {
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

    const response = await findBookingById(ctx, created.id, token);

    expect(response.status).toBe(200);
    const data = successBody<Record<string, unknown>>(response).data;
    expect(data.id).toBe(created.id);
    expect(data.bookingId).toBe(created.bookingId);
    expect(data.businessId).toBe(businessId);
    expect(data.serviceId).toBe(serviceId);
    expect(data.customerId).toBe(customerId);
    expect(data).toHaveProperty('createdAt');
    expect(data).toHaveProperty('createdBy');
    expect(data).toHaveProperty('updatedAt');
    expect(data).toHaveProperty('updatedBy');
    expect(data).toHaveProperty('isDeleted');
    expect(data).toHaveProperty('deletedAt');
    expect(data).toHaveProperty('deletedBy');
  });

  it("allows an Admin in the same business to view another user's booking", async () => {
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

    const response = await findBookingById(
      ctx,
      created.id,
      await tokenForRole(ctx, 'Admin', businessId, admin.id),
    );

    expect(response.status).toBe(200);
  });

  it("returns 401 when a different Standard user tries to view someone else's booking", async () => {
    const businessId = await createOwningBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
    const otherUser = await createStaffUser(ctx, businessId, 'Standard');
    const customerId = await createCustomerForBusiness(ctx, businessId);
    const serviceId = await createServiceForBusiness(ctx, businessId);
    const created = await createBooking(
      ctx,
      registerBookingPayload(businessId, serviceId, userId, customerId),
      await tokenForRole(ctx, 'Standard', businessId, userId),
    );

    const response = await findBookingById(
      ctx,
      created.id,
      await tokenForRole(ctx, 'Standard', businessId, otherUser.id),
    );

    expect(response.status).toBe(401);
    expect(errorBody(response).statusCode).toBe(401);
  });

  it('returns 401 when the caller belongs to a different business', async () => {
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

    const response = await findBookingById(
      ctx,
      created.id,
      await tokenForRole(ctx, 'Admin', otherBusinessId, randomUUID()),
    );

    expect(response.status).toBe(401);
    expect(errorBody(response).statusCode).toBe(401);
  });

  it('returns 404 for a booking that does not exist', async () => {
    const businessId = await createOwningBusiness(ctx);
    const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');

    const response = await findBookingById(
      ctx,
      randomUUID(),
      await tokenForRole(ctx, 'Admin', businessId, userId),
    );

    expect(response.status).toBe(404);
    expect(errorBody(response).statusCode).toBe(404);
  });

  it('returns 404 for a soft-deleted booking (findById excludes deleted rows)', async () => {
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

    const admin = await createStaffUser(ctx, businessId, 'Admin');
    await deleteBooking(
      ctx,
      created.id,
      await tokenForRole(ctx, 'Admin', businessId, admin.id),
    ).then((res) => expect(res.status).toBe(200));

    const response = await findBookingById(ctx, created.id, token);

    expect(response.status).toBe(404);
    expect(errorBody(response).statusCode).toBe(404);
  });
});
