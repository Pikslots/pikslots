import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  Booking,
  BookingConflictError,
  type AuditLogJobDataShape,
  type BookingRepository,
  type BusinessRepository,
  type CustomerRepository,
  err,
  IBookingRepository,
  IBusinessRepository,
  ICustomerRepository,
  IUserRepository,
  InfrastructureError,
  ok,
  RegisterBookingCommand,
  RegisterBookingUseCase,
  Result,
  UnauthorizedError,
  type UserRepository,
} from '@pikslots/domain';
import { formatIsoInTimezone } from '@pikslots/datetime';
import { Queue } from 'bullmq';
import { SecurityContext } from 'src/shared/security/context/security.context';
import {
  PikslotEmailService,
  type EmailTemplateContextMap,
} from 'src/shared/email/pikslot.email.service';
import {
  AUDIT_LOG_QUEUE,
  PIKSLOT_EVENTS,
} from 'src/shared/queue/jobs/pikslot.events';
import type { AuditLogJobName } from 'src/shared/queue/jobs';
import { v7 as uuidv7 } from 'uuid';

const UNAUTHORIZED_ERROR: UnauthorizedError = {
  kind: 'unauthorized',
  message: 'Cannot create booking: unauthorized',
  timestamp: new Date(),
};

@Injectable()
export class RegisterBookingUseCaseImpl implements RegisterBookingUseCase {
  private readonly logger: Logger = new Logger(RegisterBookingUseCaseImpl.name);

  constructor(
    @Inject(IBookingRepository)
    private readonly bookingRepository: BookingRepository,
    @Inject(ICustomerRepository)
    private readonly customerRepository: CustomerRepository,
    @Inject(IUserRepository)
    private readonly userRepository: UserRepository,
    @Inject(IBusinessRepository)
    private readonly businessRepository: BusinessRepository,
    private readonly securityContext: SecurityContext,
    private readonly emailService: PikslotEmailService,
    @InjectQueue(AUDIT_LOG_QUEUE)
    private readonly auditLogQueue: Queue<
      AuditLogJobDataShape,
      void,
      AuditLogJobName
    >,
  ) {}

  async execute(
    command: RegisterBookingCommand,
  ): Promise<
    Result<
      Booking,
      BookingConflictError | UnauthorizedError | InfrastructureError
    >
  > {
    const callerBusinessId = this.securityContext.businessId;
    const callerUserId = this.securityContext.userId;
    const callerRole = this.securityContext.role;
    const isPartOfSameBusiness = callerBusinessId === command.businessId;
    const isSelf = callerUserId === command.userId; // booking for self

    if (!Booking.canRegisterBooking(callerRole, isPartOfSameBusiness, isSelf))
      return err(UNAUTHORIZED_ERROR);

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
      serviceSnapshot: command.serviceSnapshot,
      customerId: command.customerId,
      createdBy: command.createdBy,
      label: command.label ?? null,
      notes: command.notes ?? null,
    });

    const saved = await this.bookingRepository.save(booking);
    if (!saved.ok) return err(saved.error);

    await this.sendBookingConfirmationEmails(booking);

    await this.logBookingCreatedAudit(booking);

    return ok(booking);
  }

  private async logBookingCreatedAudit(booking: Booking): Promise<void> {
    const payload: AuditLogJobDataShape = {
      businessId: booking.businessId,
      userId: this.securityContext.userId,
      userType: 'user',
      action: PIKSLOT_EVENTS.AUDIT_LOG.BOOKING_CREATED,
      description: `Booking ${booking.bookingId} was created`,
      entityType: 'booking',
      entityId: booking.id,
      occurredAt: new Date().toISOString(),
    };

    await this.auditLogQueue.add(
      PIKSLOT_EVENTS.AUDIT_LOG.BOOKING_CREATED,
      payload,
    );
  }

  private async sendBookingConfirmationEmails(booking: Booking): Promise<void> {
    if (booking.label?.toLowerCase() !== 'confirmed') return;
    if (!booking.userId) return;

    const [customerResult, userResult, businessResult] = await Promise.all([
      this.customerRepository.findById(booking.customerId),
      this.userRepository.findById(booking.userId),
      this.businessRepository.findById(booking.businessId),
    ]);

    if (
      !customerResult.ok ||
      !userResult.ok ||
      !businessResult.ok ||
      !customerResult.value ||
      !userResult.value ||
      !businessResult.value
    ) {
      this.logger.warn(
        `failed to load email data for booking id ${booking.bookingId}`,
      );
      return;
    }

    const customer = customerResult.value;
    const user = userResult.value;
    const business = businessResult.value;

    const shared: Omit<
      EmailTemplateContextMap['booking-confirmation'],
      'firstName' | 'isTeamMember'
    > = {
      businessName: business.name,
      serviceName: booking.serviceSnapshot.title,
      bookingRef: booking.bookingId,
      bookingDate: booking.bookingDate,
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
        `${customer.name.firstName} ${customer.name.lastName}`.trim(),
      price: booking.serviceSnapshot.cost / 100,
      currency: business.locationDetails.currency,
    };

    if (customer.email) {
      await this.sendBookingConfirmationEmail(
        customer.email,
        customer.name.firstName,
        false,
        shared,
        booking.bookingId,
      );
    }

    if (user.email) {
      await this.sendBookingConfirmationEmail(
        user.email,
        user.name.firstName,
        true,
        shared,
        booking.bookingId,
      );
    }
  }

  private async sendBookingConfirmationEmail(
    to: string,
    firstName: string,
    isTeamMember: boolean,
    shared: Omit<
      EmailTemplateContextMap['booking-confirmation'],
      'firstName' | 'isTeamMember'
    >,
    bookingId: string,
  ): Promise<void> {
    const result = await this.emailService.sendEmail({
      to,
      subject: isTeamMember
        ? `New booking confirmed — ${bookingId}`
        : `Your booking is confirmed — ${bookingId}`,
      template: 'booking-confirmation',
      context: {
        firstName,
        isTeamMember,
        ...shared,
      },
    });

    if (!result.ok) {
      this.logger.warn(
        `failed to send booking confirmation email to ${to} for booking id ${bookingId}`,
      );
    }
  }
}
