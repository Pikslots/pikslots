import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  Booking,
  BookingConflictError,
  type BookingRepository,
  Customer,
  type CustomerAlreadyExistsError,
  type CustomerNotFoundError,
  type CustomerRepository,
  err,
  IBusinessRepository,
  IBookingRepository,
  ICustomerRepository,
  IServiceRepository,
  IUserRepository,
  type BusinessRepository,
  type InfrastructureError,
  type RegisterPublicBookingCommand,
  type RegisterPublicBookingError,
  type RegisterPublicBookingUseCase,
  ok,
  type Result,
  type ServiceNotFoundError,
  type ServiceRepository,
  type UnauthorizedError,
  type UserRepository,
} from '@pikslots/domain';
import { formatIsoInTimezone } from '@pikslots/datetime';
import { v7 as uuidv7 } from 'uuid';
import { PikslotEmailService } from 'src/shared/email/pikslot.email.service';

const EMPTY_SOCIAL_LINKS = {
  Website: '',
  Instagram: '',
  Facebook: '',
  Tiktok: '',
  X: '',
  Youtube: '',
  LinkedIn: '',
} as const;

@Injectable()
export class RegisterPublicBookingUseCaseImpl implements RegisterPublicBookingUseCase {
  private readonly logger: Logger = new Logger(
    RegisterPublicBookingUseCaseImpl.name,
  );

  constructor(
    @Inject(IBookingRepository)
    private readonly bookingRepository: BookingRepository,
    @Inject(ICustomerRepository)
    private readonly customerRepository: CustomerRepository,
    @Inject(IServiceRepository)
    private readonly serviceRepository: ServiceRepository,
    @Inject(IUserRepository)
    private readonly userRepository: UserRepository,
    @Inject(IBusinessRepository)
    private readonly businessRepository: BusinessRepository,
    private readonly emailService: PikslotEmailService,
  ) {}

  async execute(
    command: RegisterPublicBookingCommand,
  ): Promise<Result<Booking, RegisterPublicBookingError>> {
    const serviceResult = await this.serviceRepository.findById(
      command.serviceId,
    );
    if (!serviceResult.ok) return err(serviceResult.error);

    const service = serviceResult.value;
    if (!service || service.businessId !== command.businessId) {
      return err<ServiceNotFoundError>({
        kind: 'service_not_found',
        by: 'id',
        value: command.serviceId,
        message: 'Service not found',
        timestamp: new Date(),
      });
    }

    const userResult = await this.userRepository.findById(command.userId);

    if (!userResult.ok) {
      return err(userResult.error as InfrastructureError);
    }

    const user = userResult.value;
    if (!user || user.businessId !== command.businessId) {
      return err<UnauthorizedError>({
        kind: 'unauthorized',
        message: 'Cannot assign booking to this team member',
        timestamp: new Date(),
      });
    }

    const customerResult = await this.findOrCreateCustomer(command);

    if (!customerResult.ok) return err(customerResult.error);

    const customer = customerResult.value;

    const conflict = await this.bookingRepository.hasConflict(
      command.businessId,
      command.bookingStartTime,
      command.bookingEndTime,
    );

    if (!conflict.ok) return err(conflict.error);

    if (conflict.value) {
      return err<BookingConflictError>({
        kind: 'booking_conflict',
        message: 'A booking already exists for this time slot',
        timestamp: new Date(),
        startTime: command.bookingStartTime,
        endTime: command.bookingEndTime,
      });
    }

    const id = uuidv7();
    const booking = Booking.create({
      id,
      bookingId: Booking.createUniqueBookingId(id),
      bookingDate: command.bookingDate,
      bookingStartTime: command.bookingStartTime,
      bookingEndTime: command.bookingEndTime,
      businessId: command.businessId,
      serviceId: command.serviceId,
      userId: command.userId,
      serviceSnapshot: {
        title: service.title,
        durationInMins: service.durationInMins,
        cost: service.cost,
        colorCode: service.colorCode,
      },
      customerId: customer.id,
      createdBy: customer.id,
      label: 'confirmed',
      notes: null,
    });

    const businessResult = await this.businessRepository.findById(
      command.businessId,
    );
    if (!businessResult.ok)
      return err(businessResult.error as InfrastructureError);
    if (!businessResult.value)
      return err({
        kind: 'infrastructure',
        message: 'something went wrong!!',
        cause: 'business not found',
        timestamp: new Date(),
      });

    const business = businessResult.value;

    const saved = await this.bookingRepository.save(booking);
    if (!saved.ok) return err(saved.error);

    // await this.sendBookingConfirmations(booking, command, service, user);

    const shared = {
      businessName: business.name,
      serviceName: service.title,
      bookingRef: booking.bookingId,
      bookingDate: command.bookingDate,
      startTime: formatIsoInTimezone(
        booking.bookingStartTime,
        business.locationDetails.timeZone,
        'h:mm a',
      ),
      endTime: formatIsoInTimezone(
        booking.bookingEndTime,
        business.locationDetails.timeZone,
        'h:mm a',
      ),
      teamMemberName: `${user.name.firstName} ${user.name.lastName}`.trim(),
      guestFullName:
        `${command.contact.firstName} ${command.contact.lastName}`.trim(),
      price: booking.serviceSnapshot.cost / 100,
      currency: business.locationDetails.currency,
    };

    const customerEmail = command.contact.email;
    if (customerEmail) {
      const result = await this.emailService.sendEmail({
        to: customerEmail,
        subject: `Your booking is confirmed — ${booking.bookingId}`,
        template: 'booking-confirmation',
        context: {
          firstName: command.contact.firstName,
          ...shared,
        },
      });

      if (!result.ok) {
        this.logger.warn(`
        failed email to sent ${shared.guestFullName} with booking id ${booking.bookingId} 
        `);
      }
    }

    return ok(booking);
  }

  private async findOrCreateCustomer(
    command: RegisterPublicBookingCommand,
  ): Promise<
    Result<
      Customer,
      CustomerAlreadyExistsError | CustomerNotFoundError | InfrastructureError
    >
  > {
    const email = command.contact.email?.trim();
    const fullName = {
      firstName: command.contact.firstName,
      lastName: command.contact.lastName,
    };

    const existing = await this.customerRepository.findByEmailOrName(
      email ?? null,
      fullName,
      command.businessId,
    );

    if (!existing.ok) return err(existing.error);
    if (existing.value != null && existing.value.name.firstName.length > 0)
      return ok(existing.value);

    const id = uuidv7();
    const customer = Customer.create({
      id,
      name: {
        firstName: command.contact.firstName.trim(),
        lastName: command.contact.lastName.trim(),
      },
      email: email ?? null,
      additionalEmail: null,
      primaryPhone: command.contact.phone?.trim() || null,
      additionalPhone: null,
      company: null,
      country: null,
      address: command.contact.address?.trim() || null,
      city: null,
      state: null,
      zipCode: null,
      notes: null,
      customerSocialLinks: { ...EMPTY_SOCIAL_LINKS },
      additionalFields: command.contact.customFields ?? null,
      profileImageUrl: null,
      businessId: command.businessId,
      createdBy: id,
    });

    const saved = await this.customerRepository.save(customer);
    if (!saved.ok) {
      return err(saved.error);
    }
    return ok(customer);
  }
}
