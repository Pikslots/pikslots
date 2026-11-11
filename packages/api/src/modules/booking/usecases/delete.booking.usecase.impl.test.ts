import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import {
  DeleteBookingCommand,
  IBookingRepository,
  BookingNotFoundError,
  UnauthorizedError,
  InfrastructureError,
  err,
} from '@pikslots/domain';
import { BOOKING_TEST_DATA } from '../repository/booking.test.data';
import { BookingRepositoryTestImpl } from '../repository/booking.repository.fake.impl';
import { DeleteBookingUseCaseImpl } from './delete.booking.usecase.impl';
import { SecurityContext } from 'src/shared/security/context/security.context';
import { AUDIT_LOG_QUEUE } from 'src/shared/queue/jobs/pikslot.events';
import { NotificationDispatchService } from 'src/shared/realtime/notification.dispatch.service';

jest.mock('uuid', () => ({
  v7: () => 'mock-generated-id',
}));

function buildCommand(
  overrides: Partial<DeleteBookingCommand> = {},
): DeleteBookingCommand {
  return {
    id: 'booking-1',
    deletedBy: 'user-standard-1',
    ...overrides,
  };
}

describe('DeleteBookingUseCaseImpl', () => {
  let useCase: DeleteBookingUseCaseImpl;
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
        DeleteBookingUseCaseImpl,
        { provide: IBookingRepository, useClass: BookingRepositoryTestImpl },
        { provide: SecurityContext, useValue: securityContext },
        {
          provide: getQueueToken(AUDIT_LOG_QUEUE),
          useValue: { add: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: NotificationDispatchService,
          useValue: { dispatch: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    useCase = moduleRef.get(DeleteBookingUseCaseImpl);
    repository = moduleRef.get(IBookingRepository);
  });

  describe('authorization', () => {
    it('allows a Platform Owner to delete any booking regardless of business', async () => {
      Object.assign(securityContext, {
        userId: 'user-platform-owner-1',
        role: 'Platform Owner',
        businessId: 'business-999',
      });

      const result = await useCase.execute(buildCommand({ id: 'booking-1' }));

      expect(result.ok).toBe(true);
    });

    it('allows a Business Owner to delete a booking within their own business, even if not the booked user', async () => {
      Object.assign(securityContext, {
        userId: 'user-business-owner-1',
        role: 'Business Owner',
        businessId: 'business-1',
      });

      const result = await useCase.execute(buildCommand({ id: 'booking-1' })); // owned by user-standard-1, business-1

      expect(result.ok).toBe(true);
    });

    it('denies a Business Owner acting outside their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-business-owner-1',
        role: 'Business Owner',
        businessId: 'business-2',
      });
      const updateSpy = jest.spyOn(repository, 'update');

      const result = await useCase.execute(buildCommand({ id: 'booking-1' })); // business-1

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
      }
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('allows an Admin to delete a booking within their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-admin-1',
        role: 'Admin',
        businessId: 'business-1',
      });

      const result = await useCase.execute(buildCommand({ id: 'booking-3' })); // user-enhanced-1, business-1

      expect(result.ok).toBe(true);
    });

    it('denies an Admin acting outside their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-admin-1',
        role: 'Admin',
        businessId: 'business-2',
      });
      const updateSpy = jest.spyOn(repository, 'update');

      const result = await useCase.execute(buildCommand({ id: 'booking-3' })); // business-1

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
      }
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('rejects an Enhanced user to delete a booking within their own business, even if not the booked user', async () => {
      Object.assign(securityContext, {
        userId: 'user-enhanced-1',
        role: 'Enhanced',
        businessId: 'business-1',
      });

      const result = await useCase.execute(buildCommand({ id: 'booking-1' })); // owned by user-standard-1

      expect(result.ok).toBe(false);
    });

    it('denies an Enhanced user acting outside their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-enhanced-1',
        role: 'Enhanced',
        businessId: 'business-2',
      });
      const updateSpy = jest.spyOn(repository, 'update');

      const result = await useCase.execute(buildCommand({ id: 'booking-1' })); // business-1

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
      }
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('rejects a Standard user to delete their own booking', async () => {
      Object.assign(securityContext, {
        userId: 'user-standard-1',
        role: 'Standard',
        businessId: 'business-1',
      });

      const result = await useCase.execute(buildCommand({ id: 'booking-1' })); // owned by user-standard-1

      expect(result.ok).toBe(false);
    });

    it("denies a Standard user deleting someone else's booking, even in the same business", async () => {
      Object.assign(securityContext, {
        userId: 'user-standard-1',
        role: 'Standard',
        businessId: 'business-1',
      });
      const updateSpy = jest.spyOn(repository, 'update');

      const result = await useCase.execute(buildCommand({ id: 'booking-3' })); // owned by user-enhanced-1

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
      }
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('denies a Standard user deleting their own booking under a mismatched business context', async () => {
      Object.assign(securityContext, {
        userId: 'user-standard-1',
        role: 'Standard',
        businessId: 'business-2',
      });
      const updateSpy = jest.spyOn(repository, 'update');

      const result = await useCase.execute(buildCommand({ id: 'booking-1' })); // record's businessId is business-1

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
        buildCommand({ id: 'booking-nonexistent' }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as BookingNotFoundError).kind).toBe(
          'booking_not_found',
        );
      }
    });

    it('returns BookingNotFoundError for a soft-deleted booking (findById excludes deleted rows)', async () => {
      const result = await useCase.execute(buildCommand({ id: 'booking-4' })); // soft-deleted in fixture

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as BookingNotFoundError).kind).toBe(
          'booking_not_found',
        );
      }
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
      const updateSpy = jest.spyOn(repository, 'update');

      const result = await useCase.execute(buildCommand());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual(infraError);
      }
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe('repository interactions', () => {
    it('calls findById with the command id', async () => {
      const findByIdSpy = jest.spyOn(repository, 'findById');

      await useCase.execute(buildCommand({ id: 'booking-1' }));

      expect(findByIdSpy).toHaveBeenCalledTimes(1);
      expect(findByIdSpy).toHaveBeenCalledWith('booking-1');
    });
  });

  describe('successful deletion', () => {
    it('sets deletedBy from the command, not from securityContext.userId', async () => {
      // Business Owner deletes on behalf of the booked user; deletedBy should
      // reflect whatever the command specifies, which the use case passes
      // straight through to softDelete(command.deletedBy).
      Object.assign(securityContext, {
        userId: 'user-business-owner-1',
        role: 'Business Owner',
        businessId: 'business-1',
      });

      await useCase.execute(
        buildCommand({ id: 'booking-1', deletedBy: 'user-business-owner-1' }),
      );

      const stored = BOOKING_TEST_DATA.find((b) => b.id === 'booking-1');
      expect(stored?.deletedBy).toBe('user-business-owner-1');
    });
  });
});
