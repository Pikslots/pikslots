import { Test, TestingModule } from '@nestjs/testing';
import {
  BookingConflictError,
  CustomerAlreadyExistsError,
  err,
  IBusinessRepository,
  IBookingRepository,
  ICustomerRepository,
  InfrastructureError,
  IServiceRepository,
  IUserRepository,
  type RegisterPublicBookingCommand,
  ServiceNotFoundError,
  UnauthorizedError,
} from '@pikslots/domain';
import { RegisterPublicBookingUseCaseImpl } from './register.public.booking.usecase.impl';
import { PikslotEmailService } from 'src/shared/email/pikslot.email.service';
import { BookingRepositoryTestImpl } from '../../booking/repository/booking.repository.fake.impl';
import { BOOKING_TEST_DATA } from '../../booking/repository/booking.test.data';
import { BusinessRepositoryTestImpl } from '../../business/repository/business.repository.fake.impl';
import { CustomerRepositoryTestImpl } from '../../customer/repository/customer.repository.fake.impl';
import { CUSTOMER_TEST_DATA } from '../../customer/repository/customer.test.data';
import { ServiceRepositoryTestImpl } from '../../service/repository/service.repository.fake.impl';
import { SERVICE_TEST_DATA } from '../../service/repository/service.test.data';
import { UserRepositoryTestImpl } from '../../user/repository/user.repository.fake.impl';
import { USER_TEST_DATA } from '../../user/repository/user.test.data';

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
  overrides: Partial<RegisterPublicBookingCommand> = {},
): RegisterPublicBookingCommand {
  return {
    businessId: 'business-1',
    serviceId: 'service-haircut-1',
    userId: 'user-standard-1',
    bookingDate: '2026-06-16',
    bookingStartTime: '2026-06-16T15:00:00.000Z',
    bookingEndTime: '2026-06-16T15:45:00.000Z',
    contact: {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      phone: '+1-555-9999',
      address: '123 Main St',
      customFields: { 'Preferred stylist': 'Any' },
    },
    termsAccepted: true,
    ...overrides,
  };
}

describe('RegisterPublicBookingUseCaseImpl', () => {
  let useCase: RegisterPublicBookingUseCaseImpl;
  let bookingRepository: BookingRepositoryTestImpl;
  let customerRepository: CustomerRepositoryTestImpl;
  let emailSend: jest.Mock<Promise<SendEmailOutcome>, [CapturedSendEmail]>;
  let originalBookings: typeof BOOKING_TEST_DATA;
  let originalCustomers: typeof CUSTOMER_TEST_DATA;
  let originalServices: typeof SERVICE_TEST_DATA;
  let originalUsers: typeof USER_TEST_DATA;

  beforeEach(async () => {
    if (!originalBookings) originalBookings = [...BOOKING_TEST_DATA];
    if (!originalCustomers) originalCustomers = [...CUSTOMER_TEST_DATA];
    if (!originalServices) originalServices = [...SERVICE_TEST_DATA];
    if (!originalUsers) originalUsers = [...USER_TEST_DATA];

    BOOKING_TEST_DATA.length = 0;
    BOOKING_TEST_DATA.push(...originalBookings);
    CUSTOMER_TEST_DATA.length = 0;
    CUSTOMER_TEST_DATA.push(...originalCustomers);
    SERVICE_TEST_DATA.length = 0;
    SERVICE_TEST_DATA.push(...originalServices);
    USER_TEST_DATA.length = 0;
    USER_TEST_DATA.push(...originalUsers);

    emailSend = jest
      .fn<Promise<SendEmailOutcome>, [CapturedSendEmail]>()
      .mockResolvedValue({ ok: true });

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterPublicBookingUseCaseImpl,
        { provide: IBookingRepository, useClass: BookingRepositoryTestImpl },
        { provide: ICustomerRepository, useClass: CustomerRepositoryTestImpl },
        { provide: IServiceRepository, useClass: ServiceRepositoryTestImpl },
        { provide: IUserRepository, useClass: UserRepositoryTestImpl },
        { provide: IBusinessRepository, useClass: BusinessRepositoryTestImpl },
        { provide: PikslotEmailService, useValue: { sendEmail: emailSend } },
      ],
    }).compile();

    useCase = moduleRef.get(RegisterPublicBookingUseCaseImpl);
    bookingRepository = moduleRef.get(IBookingRepository);
    customerRepository = moduleRef.get(ICustomerRepository);
  });

  it('registers a booking, creates a customer, and persists the service snapshot', async () => {
    const saveSpy = jest.spyOn(bookingRepository, 'save');
    const result = await useCase.execute(buildCommand());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const booking = result.value;
    expect(booking.bookingId).toMatch(/^BK[A-Z0-9]+$/);
    expect(booking.businessId).toBe('business-1');
    expect(booking.serviceId).toBe('service-haircut-1');
    expect(booking.userId).toBe('user-standard-1');
    expect(booking.createdBy).toBe(booking.customerId);
    expect(booking.serviceSnapshot).toEqual({
      title: 'Haircut & Style',
      durationInMins: 45,
      cost: 40,
      colorCode: '#F4A261',
    });
    expect(booking.notes).toBeNull();

    const created = await customerRepository.findByEmailOrName(
      'jane.doe@example.com',
      { firstName: 'Jane', lastName: 'Doe' },
      'business-1',
    );
    expect(created.ok && created.value).toBeTruthy();
    expect(created.ok && created.value?.name).toEqual({
      firstName: 'Jane',
      lastName: 'Doe',
    });
    expect(created.ok && created.value?.additionalFields).toEqual({
      'Preferred stylist': 'Any',
    });
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it('finds an existing customer by email instead of creating a duplicate', async () => {
    const before = CUSTOMER_TEST_DATA.length;
    const result = await useCase.execute(
      buildCommand({
        contact: {
          firstName: 'Alice',
          lastName: 'Walker',
          email: 'alice.walker@example.com',
          phone: null,
          address: null,
        },
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.customerId).toBe('customer-1');
    expect(CUSTOMER_TEST_DATA.length).toBe(before);
  });

  it('reuses an existing customer without overwriting its custom fields', async () => {
    const before = CUSTOMER_TEST_DATA.length;
    const result = await useCase.execute(
      buildCommand({
        contact: {
          firstName: 'Alice',
          lastName: 'Walker',
          email: 'alice.walker@example.com',
          phone: null,
          address: null,
          customFields: { 'Preferred stylist': 'Bob', 'Hair length': 'Long' },
        },
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.customerId).toBe('customer-1');
    expect(CUSTOMER_TEST_DATA.length).toBe(before);

    const updated = await customerRepository.findByEmailOrName(
      'alice.walker@example.com',
      { firstName: 'Alice', lastName: 'Walker' },
      'business-1',
    );
    expect(updated.ok && updated.value?.additionalFields).toEqual({
      'Preferred stylist': 'Any',
    });
  });

  it('always creates a new customer when no email is provided', async () => {
    const before = CUSTOMER_TEST_DATA.length;
    const result = await useCase.execute(
      buildCommand({
        contact: {
          firstName: 'Cher',
          lastName: 'Cher',
          email: null,
          phone: '+1-555-1111',
          address: null,
        },
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(CUSTOMER_TEST_DATA.length).toBe(before + 1);
    expect(result.value.customerId).toBe('mock-generated-id');
    expect(result.value.createdBy).toBe('mock-generated-id');
  });

  it('rejects when the service does not exist and never saves a booking', async () => {
    const saveSpy = jest.spyOn(bookingRepository, 'save');
    const result = await useCase.execute(
      buildCommand({ serviceId: 'service-missing' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as ServiceNotFoundError).kind).toBe(
        'service_not_found',
      );
    }
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('rejects when the service belongs to another business', async () => {
    const saveSpy = jest.spyOn(bookingRepository, 'save');
    const result = await useCase.execute(
      buildCommand({
        serviceId: 'service-business-2-1',
        businessId: 'business-1',
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as ServiceNotFoundError).kind).toBe(
        'service_not_found',
      );
    }
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('rejects an assigned user from another business', async () => {
    const saveSpy = jest.spyOn(bookingRepository, 'save');
    const result = await useCase.execute(
      buildCommand({ userId: 'user-platform-owner-1' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
    }
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('rejects an unknown assigned user', async () => {
    const saveSpy = jest.spyOn(bookingRepository, 'save');
    const result = await useCase.execute(
      buildCommand({ userId: 'user-missing' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
    }
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('assigns a valid same-business team member', async () => {
    const result = await useCase.execute(
      buildCommand({ userId: 'user-enhanced-1' }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.userId).toBe('user-enhanced-1');
  });

  it('returns booking_conflict when the slot is already taken', async () => {
    const saveSpy = jest.spyOn(bookingRepository, 'save');
    const result = await useCase.execute(
      buildCommand({
        bookingDate: '2024-08-10',
        bookingStartTime: '2024-08-10T09:15:00.000Z',
        bookingEndTime: '2024-08-10T09:45:00.000Z',
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

  it('propagates customer_already_exists when the save races', async () => {
    const raceError: CustomerAlreadyExistsError = {
      kind: 'customer_already_exists',
      message: 'already exists',
      timestamp: new Date(),
      email: 'new.guest@example.com',
      businessId: 'business-1',
    };
    jest
      .spyOn(customerRepository, 'save')
      .mockResolvedValueOnce(err(raceError));

    const result = await useCase.execute(
      buildCommand({
        contact: {
          firstName: 'New',
          lastName: 'Guest',
          email: 'new.guest@example.com',
          phone: null,
          address: null,
        },
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as CustomerAlreadyExistsError).kind).toBe(
        'customer_already_exists',
      );
    }
  });

  it('propagates infrastructure errors from the customer lookup', async () => {
    const infra: InfrastructureError = {
      kind: 'infrastructure',
      message: 'boom',
      timestamp: new Date(),
      cause: new Error('boom'),
    };
    jest
      .spyOn(customerRepository, 'findByEmailOrName')
      .mockResolvedValueOnce(err(infra));

    const result = await useCase.execute(buildCommand());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('infrastructure');
    }
  });

  it('sends booking confirmation emails to the guest and the assigned team member', async () => {
    const result = await useCase.execute(buildCommand());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const bookingRef = result.value.bookingId;

    expect(emailSend).toHaveBeenNthCalledWith(1, {
      to: 'jane.doe@example.com',
      subject: `Your booking is confirmed — ${bookingRef}`,
      template: 'booking-confirmation',
      context: {
        firstName: 'Jane',
        businessName: "Alice's Salon & Spa",
        serviceName: 'Haircut & Style',
        bookingRef,
        bookingDate: '2026-06-16',
        startTime: '10:00 AM',
        endTime: '10:45 AM',
        teamMemberName: 'Eve Davis',
        guestFullName: 'Jane Doe',
        price: 0.4,
        currency: 'USD',
      },
    });
  });

  it('still returns the saved booking when confirmation emails fail', async () => {
    emailSend.mockResolvedValue({
      ok: false,
      error: { kind: 'email_sending_failed', message: 'smtp down' },
    });

    const saveSpy = jest.spyOn(bookingRepository, 'save');
    const result = await useCase.execute(buildCommand());

    expect(result.ok).toBe(true);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(emailSend).toHaveBeenCalledTimes(1);
  });
});
