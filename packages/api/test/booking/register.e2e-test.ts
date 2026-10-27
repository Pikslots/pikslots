import { randomUUID } from 'node:crypto';
import { BOOKING_ENDPOINTS } from '@pikslots/shared';

import { errorBody } from '../common/http-envelope';
import { setupBookingTestContext } from './support/booking-test-context';
import {
  createOwningBusiness,
  createStaffUser,
  createCustomerForBusiness,
  createServiceForBusiness,
  registerBookingPayload,
  registerBooking,
  createBooking,
  tokenForRole,
} from './support/booking-fixtures';

describe(`POST ${BOOKING_ENDPOINTS.REGISTER}`, () => {
  const ctx = setupBookingTestContext();

  describe('successful creation', () => {
    it('creates a real row in Postgres when a Standard user books for themselves', async () => {
      const businessId = await createOwningBusiness(ctx);
      const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
      const customerId = await createCustomerForBusiness(ctx, businessId);
      const serviceId = await createServiceForBusiness(ctx, businessId);
      const payload = registerBookingPayload(
        businessId,
        serviceId,
        userId,
        customerId,
      );

      const response = await registerBooking(
        ctx,
        payload,
        await tokenForRole(ctx, 'Standard', businessId, userId),
      );

      expect(response.status).toBe(201);

      const row = await ctx.db
        .selectFrom('bookings')
        .selectAll()
        .where('business_id', '=', businessId)
        .where('is_deleted', '=', false)
        .executeTakeFirstOrThrow();

      expect(row.service_id).toBe(serviceId);
      expect(row.customer_id).toBe(customerId);
      expect(row.booking_id).toMatch(/^BK/);
    });

    it('stores the serviceSnapshot as real jsonb, not a stringified/double-encoded value', async () => {
      const businessId = await createOwningBusiness(ctx);
      const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
      const customerId = await createCustomerForBusiness(ctx, businessId);
      const serviceId = await createServiceForBusiness(ctx, businessId);
      const payload = registerBookingPayload(
        businessId,
        serviceId,
        userId,
        customerId,
        {
          serviceSnapshot: {
            title: 'Deep Tissue Massage',
            durationInMins: 60,
            cost: 9000,
            colorCode: '#0d9488',
          },
        },
      );

      await registerBooking(
        ctx,
        payload,
        await tokenForRole(ctx, 'Standard', businessId, userId),
      ).then((res) => expect(res.status).toBe(201));

      const row = await ctx.db
        .selectFrom('bookings')
        .selectAll()
        .where('business_id', '=', businessId)
        .executeTakeFirstOrThrow();

      expect(row.service_snapshot).toEqual({
        title: 'Deep Tissue Massage',
        durationInMins: 60,
        cost: 9000,
        colorCode: '#0d9488',
      });
    });
  });

  describe('conflict detection', () => {
    it('returns 409 when the time slot overlaps an existing active booking in the same business', async () => {
      const businessId = await createOwningBusiness(ctx);
      const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
      const customerId = await createCustomerForBusiness(ctx, businessId);
      const serviceId = await createServiceForBusiness(ctx, businessId);
      const token = await tokenForRole(ctx, 'Standard', businessId, userId);

      await createBooking(
        ctx,
        registerBookingPayload(businessId, serviceId, userId, customerId, {
          bookingStartTime: '2026-07-01T10:00:00.000Z',
          bookingEndTime: '2026-07-01T11:00:00.000Z',
        }),
        token,
      );

      const response = await registerBooking(
        ctx,
        registerBookingPayload(businessId, serviceId, userId, customerId, {
          bookingStartTime: '2026-07-01T10:15:00.000Z',
          bookingEndTime: '2026-07-01T10:45:00.000Z',
        }),
        token,
      );

      expect(response.status).toBe(409);
      expect(errorBody(response).statusCode).toBe(409);
    });

    it('allows a booking in a different business at an identical, otherwise-conflicting time', async () => {
      const businessId1 = await createOwningBusiness(ctx);
      const businessId2 = await createOwningBusiness(ctx);
      const user1 = await createStaffUser(ctx, businessId1, 'Standard');
      const user2 = await createStaffUser(ctx, businessId2, 'Standard');
      const customer1 = await createCustomerForBusiness(ctx, businessId1);
      const customer2 = await createCustomerForBusiness(ctx, businessId2);
      const service1 = await createServiceForBusiness(ctx, businessId1);
      const service2 = await createServiceForBusiness(ctx, businessId2);

      await createBooking(
        ctx,
        registerBookingPayload(businessId1, service1, user1.id, customer1, {
          bookingStartTime: '2026-07-02T09:00:00.000Z',
          bookingEndTime: '2026-07-02T09:30:00.000Z',
        }),
        await tokenForRole(ctx, 'Standard', businessId1, user1.id),
      );

      const response = await registerBooking(
        ctx,
        registerBookingPayload(businessId2, service2, user2.id, customer2, {
          bookingStartTime: '2026-07-02T09:00:00.000Z',
          bookingEndTime: '2026-07-02T09:30:00.000Z',
        }),
        await tokenForRole(ctx, 'Standard', businessId2, user2.id),
      );

      expect(response.status).toBe(201);
    });
  });

  describe('authorization', () => {
    it('allows a Business Owner to book for a Standard user within their own business', async () => {
      const businessId = await createOwningBusiness(ctx);
      const owner = await createStaffUser(ctx, businessId, 'Business Owner');
      const standard = await createStaffUser(ctx, businessId, 'Standard');
      const customerId = await createCustomerForBusiness(ctx, businessId);
      const serviceId = await createServiceForBusiness(ctx, businessId);

      const response = await registerBooking(
        ctx,
        registerBookingPayload(businessId, serviceId, standard.id, customerId),
        await tokenForRole(ctx, 'Business Owner', businessId, owner.id),
      );

      expect(response.status).toBe(201);
    });

    it('returns 401 when a Business Owner books outside their own business', async () => {
      const businessId = await createOwningBusiness(ctx);
      const otherBusinessId = await createOwningBusiness(ctx);
      const standard = await createStaffUser(ctx, businessId, 'Standard');
      const customerId = await createCustomerForBusiness(ctx, businessId);
      const serviceId = await createServiceForBusiness(ctx, businessId);

      const response = await registerBooking(
        ctx,
        registerBookingPayload(businessId, serviceId, standard.id, customerId),
        await tokenForRole(ctx, 'Business Owner', otherBusinessId, randomUUID()),
      );

      expect(response.status).toBe(401);
      expect(errorBody(response).statusCode).toBe(401);
    });

    it('returns 401 when a Standard user tries to book for someone else', async () => {
      const businessId = await createOwningBusiness(ctx);
      const standard = await createStaffUser(ctx, businessId, 'Standard');
      const otherStandard = await createStaffUser(ctx, businessId, 'Standard');
      const customerId = await createCustomerForBusiness(ctx, businessId);
      const serviceId = await createServiceForBusiness(ctx, businessId);

      const response = await registerBooking(
        ctx,
        registerBookingPayload(
          businessId,
          serviceId,
          otherStandard.id,
          customerId,
        ),
        await tokenForRole(ctx, 'Standard', businessId, standard.id),
      );

      expect(response.status).toBe(401);
      expect(errorBody(response).statusCode).toBe(401);
    });

    it('returns 401 when a Standard user books for themselves under a mismatched business context', async () => {
      const businessId = await createOwningBusiness(ctx);
      const otherBusinessId = await createOwningBusiness(ctx);
      const standard = await createStaffUser(ctx, businessId, 'Standard');
      const customerId = await createCustomerForBusiness(ctx, businessId);
      const serviceId = await createServiceForBusiness(ctx, businessId);

      const response = await registerBooking(
        ctx,
        registerBookingPayload(businessId, serviceId, standard.id, customerId),
        await tokenForRole(ctx, 'Standard', otherBusinessId, standard.id),
      );

      expect(response.status).toBe(401);
      expect(errorBody(response).statusCode).toBe(401);
    });
  });

  describe('validation', () => {
    it('returns 400 when businessId is not a valid uuid v7 (strict @IsUUID(7) on RegisterBookingDto)', async () => {
      const businessId = await createOwningBusiness(ctx);
      const { id: userId } = await createStaffUser(ctx, businessId, 'Standard');
      const customerId = await createCustomerForBusiness(ctx, businessId);
      const serviceId = await createServiceForBusiness(ctx, businessId);
      const payload = {
        ...registerBookingPayload(businessId, serviceId, userId, customerId),
        // a v4 uuid, not v7 -- RegisterBookingDto.businessId is @IsUUID('7')
        businessId: randomUUID(),
      };

      const response = await registerBooking(
        ctx,
        payload,
        await tokenForRole(ctx, 'Standard', businessId, userId),
      );

      expect(response.status).toBe(400);
    });
  });

  describe('known bug: persisted userId does not honor command.userId', () => {
    it('assigns the persisted booking to command.userId (the target), not the calling Business Owner', async () => {
      const businessId = await createOwningBusiness(ctx);
      const owner = await createStaffUser(ctx, businessId, 'Business Owner');
      const standard = await createStaffUser(ctx, businessId, 'Standard');
      const customerId = await createCustomerForBusiness(ctx, businessId);
      const serviceId = await createServiceForBusiness(ctx, businessId);
      const payload = registerBookingPayload(
        businessId,
        serviceId,
        standard.id, // booking is "for" the Standard user
        customerId,
      );

      const response = await registerBooking(
        ctx,
        payload,
        await tokenForRole(ctx, 'Business Owner', businessId, owner.id),
      );
      expect(response.status).toBe(201);

      const row = await ctx.db
        .selectFrom('bookings')
        .selectAll()
        .where('business_id', '=', businessId)
        .where('is_deleted', '=', false)
        .executeTakeFirstOrThrow();

      // Intended: the booking belongs to whoever it was booked FOR.
      expect(row.user_id).toBe(standard.id);
    });
  });
});
