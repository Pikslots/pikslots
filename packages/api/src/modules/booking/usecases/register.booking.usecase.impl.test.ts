import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BookingConflictError,
  Booking,
  err,
  IBookingRepository,
  IBusinessRepository,
  ICustomerRepository,
  InfrastructureError,
  IUserRepository,
  ok,
  RegisterBookingCommand,
  UnauthorizedError,
} from '@pikslots/domain';
import { BOOKING_TEST_DATA } from '../repository/booking.test.data';
import { BookingRepositoryTestImpl } from '../repository/booking.repository.fake.impl';
import { RegisterBookingUseCaseImpl } from './register.booking.usecase.impl';
import { SecurityContext } from 'src/shared/security/context/security.context';
import { PikslotEmailService } from 'src/shared/email/pikslot.email.service';
import { BusinessRepositoryTestImpl } from '../../business/repository/business.repository.fake.impl';
import { BUSINESS_TEST_DATA } from '../../business/repository/business.fake.data';
import { CustomerRepositoryTestImpl } from '../../customer/repository/customer.repository.fake.impl';
import { CUSTOMER_TEST_DATA } from '../../customer/repository/customer.test.data';
import { UserRepositoryTestImpl } from '../../user/repository/user.repository.fake.impl';
import { USER_TEST_DATA } from '../../user/repository/user.test.data';
import { AUDIT_LOG_QUEUE } from 'src/shared/queue/jobs/pikslot.events';

jest.mock('uuid', () => ({
  v7: () => 'mock-generated-id',
}));

interface CapturedSendEmail {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

interface SendEmailOutcome {
  ok: boolean;
  error?: { kind: string; message: string };
}

function buildCommand(
  overrides: Partial<RegisterBookingCommand> = {},
): RegisterBookingCommand {
  return {
    businessId: 'business-1',
    userId: 'user-standard-1',
    serviceId: 'service-haircut-1',
    customerId: 'customer-1',
    bookingDate: '2024-09-05',
    bookingStartTime: '2024-09-05T09:00:00.000Z',
    bookingEndTime: '2024-09-05T09:30:00.000Z',
    serviceSnapshot: {
      title: 'Haircut',
      durationInMins: 30,
      cost: 25,
      colorCode: '#F54927',
    },
    createdBy: 'customer-1',
    ...overrides,
  };
}

describe('RegisterBookingUseCaseImpl', () => {
  let useCase: RegisterBookingUseCaseImpl;
  let repository: BookingRepositoryTestImpl;
  let customerRepository: CustomerRepositoryTestImpl;
  let emailSend: jest.Mock<Promise<SendEmailOutcome>, [CapturedSendEmail]>;
  let securityContext: SecurityContext;
  let originalData: typeof BOOKING_TEST_DATA;
  let originalCustomers: typeof CUSTOMER_TEST_DATA;
  let originalUsers: typeof USER_TEST_DATA;
  let originalBusinesses: typeof BUSINESS_TEST_DATA;

  beforeEach(async () => {
    if (!originalData) originalData = [...BOOKING_TEST_DATA];
    if (!originalCustomers) originalCustomers = [...CUSTOMER_TEST_DATA];
    if (!originalUsers) originalUsers = [...USER_TEST_DATA];
    if (!originalBusinesses) originalBusinesses = [...BUSINESS_TEST_DATA];

    BOOKING_TEST_DATA.length = 0;
    BOOKING_TEST_DATA.push(...originalData);
    CUSTOMER_TEST_DATA.length = 0;
    CUSTOMER_TEST_DATA.push(...originalCustomers);
    USER_TEST_DATA.length = 0;
    USER_TEST_DATA.push(...originalUsers);
    BUSINESS_TEST_DATA.length = 0;
    BUSINESS_TEST_DATA.push(...originalBusinesses);

    emailSend = jest
      .fn<Promise<SendEmailOutcome>, [CapturedSendEmail]>()
      .mockResolvedValue({ ok: true });

    securityContext = {
      userId: 'user-standard-1',
      role: 'Standard',
      businessId: 'business-1',
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterBookingUseCaseImpl,
        { provide: IBookingRepository, useClass: BookingRepositoryTestImpl },
        { provide: ICustomerRepository, useClass: CustomerRepositoryTestImpl },
        { provide: IUserRepository, useClass: UserRepositoryTestImpl },
        { provide: IBusinessRepository, useClass: BusinessRepositoryTestImpl },
        { provide: SecurityContext, useValue: securityContext },
        { provide: PikslotEmailService, useValue: { sendEmail: emailSend } },
        {
          provide: getQueueToken(AUDIT_LOG_QUEUE),
          useValue: { add: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    useCase = moduleRef.get(RegisterBookingUseCaseImpl);
    repository = moduleRef.get(IBookingRepository);
    customerRepository = moduleRef.get(ICustomerRepository);
  });

  describe('authorization', () => {
    // NOTE: These tests assert the INTENDED behavior (matching every sibling
    // use case's `if (!Booking.canX(...))` pattern). As of this writing, the
    // use case has the condition inverted (`if (Booking.canRegisterBooking(...))`),
    // so these will currently FAIL — see the flag above the test file.

    it('allows a Platform Owner to create a booking for anyone', async () => {
      Object.assign(securityContext, {
        userId: 'user-platform-owner-1',
        role: 'Platform Owner',
        businessId: 'business-999',
      });

      const result = await useCase.execute(
        buildCommand({ userId: 'user-standard-1', businessId: 'business-1' }),
      );

      expect(result.ok).toBe(true);
    });

    it('allows a Business Owner to create a booking for anyone within their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-business-owner-1',
        role: 'Business Owner',
        businessId: 'business-1',
      });

      const result = await useCase.execute(
        buildCommand({ userId: 'user-standard-1', businessId: 'business-1' }),
      );

      expect(result.ok).toBe(true);
    });

    it('denies a Business Owner acting outside their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-business-owner-1',
        role: 'Business Owner',
        businessId: 'business-2',
      });
      const saveSpy = jest.spyOn(repository, 'save');

      const result = await useCase.execute(
        buildCommand({ userId: 'user-standard-1', businessId: 'business-1' }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
      }
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('allows an Admin to create a booking for anyone within their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-admin-1',
        role: 'Admin',
        businessId: 'business-1',
      });

      const result = await useCase.execute(
        buildCommand({ userId: 'user-enhanced-1', businessId: 'business-1' }),
      );

      expect(result.ok).toBe(true);
    });

    it('denies an Admin acting outside their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-admin-1',
        role: 'Admin',
        businessId: 'business-2',
      });
      const saveSpy = jest.spyOn(repository, 'save');

      const result = await useCase.execute(
        buildCommand({ userId: 'user-enhanced-1', businessId: 'business-1' }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
      }
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('allows an Enhanced user to create a booking for anyone within their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-enhanced-1',
        role: 'Enhanced',
        businessId: 'business-1',
      });

      const result = await useCase.execute(
        buildCommand({ userId: 'user-standard-1', businessId: 'business-1' }),
      );

      expect(result.ok).toBe(true);
    });

    it('denies an Enhanced user acting outside their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-enhanced-1',
        role: 'Enhanced',
        businessId: 'business-2',
      });
      const saveSpy = jest.spyOn(repository, 'save');

      const result = await useCase.execute(
        buildCommand({ userId: 'user-standard-1', businessId: 'business-1' }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
      }
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('allows a Standard user to create a booking for themselves', async () => {
      Object.assign(securityContext, {
        userId: 'user-standard-1',
        role: 'Standard',
        businessId: 'business-1',
      });

      const result = await useCase.execute(
        buildCommand({ userId: 'user-standard-1', businessId: 'business-1' }),
      );

      expect(result.ok).toBe(true);
    });

    it('denies a Standard user creating a booking for someone else', async () => {
      Object.assign(securityContext, {
        userId: 'user-standard-1',
        role: 'Standard',
        businessId: 'business-1',
      });
      const saveSpy = jest.spyOn(repository, 'save');

      const result = await useCase.execute(
        buildCommand({ userId: 'user-enhanced-1', businessId: 'business-1' }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
      }
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('denies a Standard user creating a booking for themselves under a mismatched business', async () => {
      Object.assign(securityContext, {
        userId: 'user-standard-1',
        role: 'Standard',
        businessId: 'business-2',
      });
      const saveSpy = jest.spyOn(repository, 'save');

      const result = await useCase.execute(
        buildCommand({ userId: 'user-standard-1', businessId: 'business-1' }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
      }
      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('conflict detection', () => {
    it('rejects creation when the time slot overlaps an existing booking in the same business', async () => {
      // booking-6 occupies business-1, 2024-09-01T10:00Z–11:00Z
      const saveSpy = jest.spyOn(repository, 'save');

      const result = await useCase.execute(
        buildCommand({
          businessId: 'business-1',
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
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('allows creation when the time slot does not overlap any existing booking', async () => {
      const result = await useCase.execute(
        buildCommand({
          businessId: 'business-1',
          bookingDate: '2024-09-03',
          bookingStartTime: '2024-09-03T15:00:00.000Z',
          bookingEndTime: '2024-09-03T15:30:00.000Z',
        }),
      );

      expect(result.ok).toBe(true);
    });

    it('does not treat a booking in a different business as a conflict', async () => {
      // booking-5 occupies business-2, 2024-08-13T09:00Z–09:30Z
      const result = await useCase.execute(
        buildCommand({
          businessId: 'business-1',
          bookingDate: '2024-08-13',
          bookingStartTime: '2024-08-13T09:00:00.000Z',
          bookingEndTime: '2024-08-13T09:30:00.000Z',
        }),
      );

      expect(result.ok).toBe(true);
    });

    it('does not exclude any booking id during creation (no self-exclusion needed for a new booking)', async () => {
      const conflictSpy = jest.spyOn(repository, 'hasConflict');

      await useCase.execute(buildCommand());

      expect(conflictSpy).toHaveBeenCalledWith(
        'business-1',
        expect.any(String),
        expect.any(String),
      );
      // called with exactly 3 args — no excludeBookingId, unlike EditBookingUseCaseImpl
      expect(conflictSpy.mock.calls[0]).toHaveLength(3);
    });
  });

  describe('repository failures', () => {
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
      const saveSpy = jest.spyOn(repository, 'save');

      const result = await useCase.execute(buildCommand());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual(infraError);
      }
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('propagates an InfrastructureError from save', async () => {
      const infraError: InfrastructureError = {
        kind: 'infrastructure',
        message: 'Failed to save booking',
        timestamp: new Date(),
        cause: new Error('boom'),
      };
      jest.spyOn(repository, 'save').mockResolvedValueOnce(err(infraError));

      const result = await useCase.execute(buildCommand());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual(infraError);
      }
    });
  });

  describe('repository interactions', () => {
    it('calls hasConflict with the command businessId and times', async () => {
      const conflictSpy = jest.spyOn(repository, 'hasConflict');
      const command = buildCommand({
        businessId: 'business-1',
        bookingStartTime: '2024-09-05T09:00:00.000Z',
        bookingEndTime: '2024-09-05T09:30:00.000Z',
      });

      await useCase.execute(command);

      expect(conflictSpy).toHaveBeenCalledTimes(1);
      expect(conflictSpy).toHaveBeenCalledWith(
        command.businessId,
        command.bookingStartTime,
        command.bookingEndTime,
      );
    });

    it('calls save with a Booking entity matching the command, only after conflict check passes', async () => {
      const saveSpy = jest.spyOn(repository, 'save');
      const command = buildCommand({
        businessId: 'business-1',
        userId: 'user-standard-1',
        serviceId: 'service-color-1',
        customerId: 'customer-9',
        bookingDate: '2024-09-06',
        bookingStartTime: '2024-09-06T11:00:00.000Z',
        bookingEndTime: '2024-09-06T12:00:00.000Z',
        createdBy: 'customer-9',
      });

      await useCase.execute(command);

      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mock-generated-id',
          businessId: command.businessId,
          serviceId: command.serviceId,
          customerId: command.customerId,
          bookingDate: command.bookingDate,
          bookingStartTime: command.bookingStartTime,
          bookingEndTime: command.bookingEndTime,
          createdBy: command.createdBy,
        }),
      );
    });
  });

  describe('successful creation', () => {
    it('generates a bookingId derived from the created uuid via Booking.createUniqueBookingId', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('mock-generated-id');
        expect(result.value.bookingId).toBe(
          Booking.createUniqueBookingId('mock-generated-id'),
        );
      }
    });

    it('persists all command fields onto the created booking', async () => {
      const command = buildCommand({
        businessId: 'business-1',
        userId: 'user-standard-1',
        serviceId: 'service-haircut-1',
        customerId: 'customer-1',
        bookingDate: '2024-09-07',
        bookingStartTime: '2024-09-07T09:00:00.000Z',
        bookingEndTime: '2024-09-07T09:30:00.000Z',
        serviceSnapshot: {
          title: 'Haircut',
          durationInMins: 30,
          cost: 25,
          colorCode: '#F54927',
        },
        createdBy: 'customer-1',
      });

      const result = await useCase.execute(command);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.businessId).toBe(command.businessId);
        expect(result.value.serviceId).toBe(command.serviceId);
        expect(result.value.customerId).toBe(command.customerId);
        expect(result.value.bookingDate).toBe(command.bookingDate);
        expect(result.value.bookingStartTime).toBe(command.bookingStartTime);
        expect(result.value.bookingEndTime).toBe(command.bookingEndTime);
        expect(result.value.serviceSnapshot).toEqual(command.serviceSnapshot);
        expect(result.value.createdBy).toBe(command.createdBy);
        expect(result.value.isDeleted).toBe(false);
        expect(result.value.deletedAt).toBeNull();
        expect(result.value.deletedBy).toBeNull();
      }

      const persisted = BOOKING_TEST_DATA.find(
        (b) => b.id === 'mock-generated-id',
      );
      expect(persisted).toBeDefined();
    });
  });

  describe('booking confirmation emails', () => {
    it('sends confirmation emails to the guest and the assigned team member', async () => {
      const result = await useCase.execute(
        buildCommand({ label: 'confirmed' }),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const bookingRef = result.value.bookingId;
      expect(emailSend).toHaveBeenCalledTimes(2);

      expect(emailSend).toHaveBeenNthCalledWith(1, {
        to: 'alice.walker@example.com',
        subject: `Your booking is confirmed — ${bookingRef}`,
        template: 'booking-confirmation',
        context: {
          firstName: 'Alice',
          isTeamMember: false,
          businessName: "Alice's Salon & Spa",
          serviceName: 'Haircut',
          bookingRef,
          bookingDate: '2024-09-05',
          startTime: '4:00 AM',
          endTime: '4:30 AM',
          teamMemberName: 'Eve Davis',
          guestFullName: 'Alice Walker',
          price: 0.25,
          currency: 'USD',
        },
      });

      expect(emailSend).toHaveBeenNthCalledWith(2, {
        to: 'eve@acme.com',
        subject: `New booking confirmed — ${bookingRef}`,
        template: 'booking-confirmation',
        context: {
          firstName: 'Eve',
          isTeamMember: true,
          businessName: "Alice's Salon & Spa",
          serviceName: 'Haircut',
          bookingRef,
          bookingDate: '2024-09-05',
          startTime: '4:00 AM',
          endTime: '4:30 AM',
          teamMemberName: 'Eve Davis',
          guestFullName: 'Alice Walker',
          price: 0.25,
          currency: 'USD',
        },
      });
    });

    it('sends only the team member confirmation when the guest has no email', async () => {
      const result = await useCase.execute(
        buildCommand({ customerId: 'customer-3', label: 'confirmed' }),
      );

      expect(result.ok).toBe(true);
      expect(emailSend).toHaveBeenCalledTimes(1);

      const teamCall = emailSend.mock.calls[0][0];
      expect(teamCall.to).toBe('eve@acme.com');
      expect(teamCall.context.isTeamMember).toBe(true);
      expect(teamCall.context.guestFullName).toBe('Priya Nair');
    });

    it('does not send confirmations for non-confirmed bookings', async () => {
      const result = await useCase.execute(buildCommand({ label: 'Pending' }));

      expect(result.ok).toBe(true);
      expect(emailSend).not.toHaveBeenCalled();
    });

    it('still returns the saved booking when confirmation emails fail', async () => {
      emailSend.mockResolvedValue({
        ok: false,
        error: { kind: 'email_sending_failed', message: 'smtp down' },
      });

      const saveSpy = jest.spyOn(repository, 'save');
      const result = await useCase.execute(
        buildCommand({ label: 'confirmed' }),
      );

      expect(result.ok).toBe(true);
      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(emailSend).toHaveBeenCalledTimes(2);
    });

    it('still returns the saved booking when email data cannot be loaded', async () => {
      jest
        .spyOn(customerRepository, 'findById')
        .mockResolvedValueOnce(ok(null));

      const saveSpy = jest.spyOn(repository, 'save');
      const result = await useCase.execute(
        buildCommand({ label: 'confirmed' }),
      );

      expect(result.ok).toBe(true);
      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(emailSend).not.toHaveBeenCalled();
    });
  });
});
