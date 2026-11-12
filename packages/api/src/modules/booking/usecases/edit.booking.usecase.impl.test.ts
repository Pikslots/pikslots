import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BookingConflictError,
  BookingNotFoundError,
  EditBookingUseCaseCommand,
  err,
  IBookingRepository,
  InfrastructureError,
  UnauthorizedError,
} from '@pikslots/domain';
import { BOOKING_TEST_DATA } from '../repository/booking.test.data';
import { BookingRepositoryTestImpl } from '../repository/booking.repository.fake.impl';
import { EditBookingUseCaseImpl } from './edit.booking.usecase.impl';
import { SecurityContext } from 'src/shared/security/context/security.context';
import { AUDIT_LOG_QUEUE } from 'src/shared/queue/jobs/pikslot.events';

jest.mock('uuid', () => ({
  v7: () => 'mock-generated-id',
}));

function buildCommand(
  overrides: Partial<EditBookingUseCaseCommand> = {},
): EditBookingUseCaseCommand {
  return {
    bookingId: 'booking-1',
    bookingDate: '2024-08-11',
    bookingStartTime: '2024-08-11T09:00:00.000Z',
    bookingEndTime: '2024-08-11T09:30:00.000Z',
    serviceId: 'service-haircut-1',
    customerId: 'customer-1',
    userId: 'user-standard-1',
    updatedBy: 'user-standard-1',
    ...overrides,
  };
}

describe('EditBookingUseCaseImpl', () => {
  let useCase: EditBookingUseCaseImpl;
  let repository: BookingRepositoryTestImpl;
  let securityContext: SecurityContext;
  let originalData: typeof BOOKING_TEST_DATA;

  beforeEach(async () => {
    if (!originalData) originalData = [...BOOKING_TEST_DATA];
    BOOKING_TEST_DATA.length = 0;
    BOOKING_TEST_DATA.push(...originalData);

    securityContext = {
      userId: 'user-standard-1',
      role: 'Standard',
      businessId: 'business-1',
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EditBookingUseCaseImpl,
        { provide: IBookingRepository, useClass: BookingRepositoryTestImpl },
        { provide: SecurityContext, useValue: securityContext },
        {
          provide: getQueueToken(AUDIT_LOG_QUEUE),
          useValue: { add: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    useCase = moduleRef.get(EditBookingUseCaseImpl);
    repository = moduleRef.get(IBookingRepository);
  });

  describe('authorization', () => {
    it('allows a Platform Owner to edit any booking regardless of business', async () => {
      Object.assign(securityContext, {
        userId: 'user-platform-owner-1',
        role: 'Platform Owner',
        businessId: 'business-999',
      });

      const result = await useCase.execute(
        buildCommand({ bookingId: 'booking-1' }),
      );

      expect(result.ok).toBe(true);
    });

    it('allows a Business Owner to edit a booking within their own business, even if not the booked user', async () => {
      Object.assign(securityContext, {
        userId: 'user-business-owner-1',
        role: 'Business Owner',
        businessId: 'business-1',
      });

      const result = await useCase.execute(
        buildCommand({ bookingId: 'booking-1' }), // owned by user-standard-1
      );

      expect(result.ok).toBe(true);
    });

    it('denies a Business Owner acting outside their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-business-owner-1',
        role: 'Business Owner',
        businessId: 'business-2',
      });
      const updateSpy = jest.spyOn(repository, 'update');

      const result = await useCase.execute(
        buildCommand({ bookingId: 'booking-1' }), // business-1
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
      }
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('allows an Admin to edit a booking within their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-admin-1',
        role: 'Admin',
        businessId: 'business-1',
      });

      const result = await useCase.execute(
        buildCommand({ bookingId: 'booking-3' }), // user-enhanced-1, business-1
      );

      expect(result.ok).toBe(true);
    });

    it('denies an Admin acting outside their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-admin-1',
        role: 'Admin',
        businessId: 'business-2',
      });
      const updateSpy = jest.spyOn(repository, 'update');

      const result = await useCase.execute(
        buildCommand({ bookingId: 'booking-3' }), // business-1
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
      }
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('allows an Enhanced user to edit a booking within their own business, even if not the booked user', async () => {
      Object.assign(securityContext, {
        userId: 'user-enhanced-1',
        role: 'Enhanced',
        businessId: 'business-1',
      });

      const result = await useCase.execute(
        buildCommand({ bookingId: 'booking-1' }), // owned by user-standard-1
      );

      expect(result.ok).toBe(true);
    });

    it('denies an Enhanced user acting outside their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-enhanced-1',
        role: 'Enhanced',
        businessId: 'business-2',
      });
      const updateSpy = jest.spyOn(repository, 'update');

      const result = await useCase.execute(
        buildCommand({ bookingId: 'booking-1' }), // business-1
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
      }
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('allows a Standard user to edit their own booking', async () => {
      Object.assign(securityContext, {
        userId: 'user-standard-1',
        role: 'Standard',
        businessId: 'business-1',
      });

      const result = await useCase.execute(
        buildCommand({ bookingId: 'booking-1' }), // owned by user-standard-1
      );

      expect(result.ok).toBe(true);
    });

    it("denies a Standard user editing someone else's booking, even in the same business", async () => {
      Object.assign(securityContext, {
        userId: 'user-standard-1',
        role: 'Standard',
        businessId: 'business-1',
      });
      const updateSpy = jest.spyOn(repository, 'update');

      const result = await useCase.execute(
        buildCommand({ bookingId: 'booking-3' }), // owned by user-enhanced-1
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
      }
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('denies a Standard user editing their own booking under a mismatched business context', async () => {
      Object.assign(securityContext, {
        userId: 'user-standard-1',
        role: 'Standard',
        businessId: 'business-2',
      });
      const updateSpy = jest.spyOn(repository, 'update');

      const result = await useCase.execute(
        buildCommand({ bookingId: 'booking-1' }), // record's businessId is business-1
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
      }
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe('not found', () => {
    it('returns BookingNotFoundError when the booking does not exist', async () => {
      const result = await useCase.execute(
        buildCommand({ bookingId: 'booking-nonexistent' }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as BookingNotFoundError).kind).toBe(
          'booking_not_found',
        );
      }
    });

    it('returns BookingNotFoundError for a soft-deleted booking (findById excludes deleted rows)', async () => {
      const result = await useCase.execute(
        buildCommand({ bookingId: 'booking-4' }), // soft-deleted in fixture
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as BookingNotFoundError).kind).toBe(
          'booking_not_found',
        );
      }
    });
  });

  describe('conflict detection', () => {
    it('rejects the edit when the new time slot overlaps another booking in the same business', async () => {
      // booking-6 occupies business-1, 2024-09-01T10:00Z–11:00Z.
      // Editing booking-1 into that window should trigger a conflict.
      const updateSpy = jest.spyOn(repository, 'update');

      const result = await useCase.execute(
        buildCommand({
          bookingId: 'booking-1',
          bookingDate: '2024-09-01',
          bookingStartTime: '2024-09-01T10:15:00.000Z',
          bookingEndTime: '2024-09-01T10:45:00.000Z',
        }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as BookingConflictError).kind).toBe(
          'booking_conflict',
        );
      }
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('allows the edit when the new time slot does not overlap any other booking', async () => {
      const result = await useCase.execute(
        buildCommand({
          bookingId: 'booking-1',
          bookingDate: '2024-09-02',
          bookingStartTime: '2024-09-02T10:00:00.000Z',
          bookingEndTime: '2024-09-02T10:30:00.000Z',
        }),
      );

      expect(result.ok).toBe(true);
    });
  });

  describe('repository failures', () => {
    it('propagates an InfrastructureError from findById', async () => {
      const infraError: InfrastructureError = {
        kind: 'infrastructure',
        message: 'DB unreachable',
        timestamp: new Date(),
        cause: new Error('boom'),
      };
      jest.spyOn(repository, 'findById').mockResolvedValueOnce(err(infraError));
      const conflictSpy = jest.spyOn(repository, 'hasConflict');
      const updateSpy = jest.spyOn(repository, 'update');

      const result = await useCase.execute(buildCommand());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual(infraError);
      }
      expect(conflictSpy).not.toHaveBeenCalled();
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('propagates an InfrastructureError from hasConflict', async () => {
      const infraError: InfrastructureError = {
        kind: 'infrastructure',
        message: 'Failed to check booking conflict',
        timestamp: new Date(),
        cause: new Error('boom'),
      };
      jest
        .spyOn(repository, 'hasConflict')
        .mockResolvedValueOnce(err(infraError));
      const updateSpy = jest.spyOn(repository, 'update');

      const result = await useCase.execute(buildCommand());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual(infraError);
      }
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('propagates a BookingNotFoundError from update (e.g. race condition after findById)', async () => {
      const notFoundError: BookingNotFoundError = {
        kind: 'booking_not_found',
        by: 'id',
        value: 'booking-1',
        message: 'Booking not found for id: booking-1',
        timestamp: new Date(),
      };
      jest
        .spyOn(repository, 'update')
        .mockResolvedValueOnce(err(notFoundError));

      const result = await useCase.execute(buildCommand());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual(notFoundError);
      }
    });

    it('propagates an InfrastructureError from update', async () => {
      const infraError: InfrastructureError = {
        kind: 'infrastructure',
        message: 'Failed to update booking',
        timestamp: new Date(),
        cause: new Error('boom'),
      };
      jest.spyOn(repository, 'update').mockResolvedValueOnce(err(infraError));

      const result = await useCase.execute(buildCommand());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual(infraError);
      }
    });
  });

  describe('repository interactions', () => {
    it('calls findById with the command bookingId', async () => {
      const findByIdSpy = jest.spyOn(repository, 'findById');

      await useCase.execute(buildCommand({ bookingId: 'booking-1' }));

      expect(findByIdSpy).toHaveBeenCalledTimes(1);
      expect(findByIdSpy).toHaveBeenCalledWith('booking-1');
    });

    it('calls hasConflict with the businessId from the found booking, the command times, and the booking id as excludeBookingId', async () => {
      const conflictSpy = jest.spyOn(repository, 'hasConflict');
      const command = buildCommand({
        bookingId: 'booking-1',
        bookingStartTime: '2024-08-11T09:00:00.000Z',
        bookingEndTime: '2024-08-11T09:30:00.000Z',
      });

      await useCase.execute(command);

      expect(conflictSpy).toHaveBeenCalledTimes(1);
      expect(conflictSpy).toHaveBeenCalledWith(
        'business-1', // found.value.businessId, not command
        command.bookingStartTime,
        command.bookingEndTime,
        'booking-1',
      );
    });

    it('calls update with an entity reflecting the command fields, only after conflict check passes', async () => {
      const updateSpy = jest.spyOn(repository, 'update');
      const command = buildCommand({
        bookingId: 'booking-1',
        bookingDate: '2024-08-13',
        bookingStartTime: '2024-08-13T09:00:00.000Z',
        bookingEndTime: '2024-08-13T09:45:00.000Z',
        serviceId: 'service-color-1',
        customerId: 'customer-9',
        userId: 'user-standard-1',
        updatedBy: 'user-standard-1',
      });

      await useCase.execute(command);

      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'booking-1',
          bookingDate: command.bookingDate,
          bookingStartTime: command.bookingStartTime,
          bookingEndTime: command.bookingEndTime,
          serviceId: command.serviceId,
          customerId: command.customerId,
          userId: command.userId,
          updatedBy: command.updatedBy,
        }),
      );
    });
  });

  describe('successful edit', () => {
    it('returns ok(updatedBooking) and persists the updated fields', async () => {
      const command = buildCommand({
        bookingId: 'booking-1',
        bookingDate: '2024-08-14',
        bookingStartTime: '2024-08-14T13:00:00.000Z',
        bookingEndTime: '2024-08-14T13:30:00.000Z',
        serviceId: 'service-color-1',
        customerId: 'customer-9',
        userId: 'user-standard-1',
        updatedBy: 'user-standard-1',
      });

      const result = await useCase.execute(command);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('booking-1');
        expect(result.value.bookingDate).toBe(command.bookingDate);
        expect(result.value.bookingStartTime).toBe(command.bookingStartTime);
        expect(result.value.bookingEndTime).toBe(command.bookingEndTime);
        expect(result.value.serviceId).toBe(command.serviceId);
        expect(result.value.customerId).toBe(command.customerId);
        expect(result.value.userId).toBe(command.userId);
        expect(result.value.updatedBy).toBe(command.updatedBy);
      }

      const persisted = BOOKING_TEST_DATA.find((b) => b.id === 'booking-1');
      expect(persisted).toBeDefined();
      expect(persisted?.bookingStartTime).toBe(command.bookingStartTime);
    });

    it('preserves identity and immutable fields not part of the edit', async () => {
      const before = BOOKING_TEST_DATA.find((b) => b.id === 'booking-1');

      await useCase.execute(buildCommand({ bookingId: 'booking-1' }));

      const after = BOOKING_TEST_DATA.find((b) => b.id === 'booking-1');
      expect(after?.id).toBe(before?.id);
      expect(after?.bookingId).toBe(before?.bookingId);
      expect(after?.businessId).toBe(before?.businessId);
      expect(after?.serviceSnapshot).toEqual(before?.serviceSnapshot);
      expect(after?.createdAt).toEqual(before?.createdAt);
      expect(after?.createdBy).toBe(before?.createdBy);
    });
  });
});
