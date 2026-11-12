import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import {
  Booking,
  BookingConflictError,
  BookingNotFoundError,
  type AuditLogJobDataShape,
  type BookingRepository,
  EditBookingUseCase,
  EditBookingUseCaseCommand,
  err,
  IBookingRepository,
  InfrastructureError,
  ok,
  Result,
  UnauthorizedError,
} from '@pikslots/domain';
import { Queue } from 'bullmq';
import { SecurityContext } from 'src/shared/security/context/security.context';
import {
  AUDIT_LOG_QUEUE,
  PIKSLOT_EVENTS,
} from 'src/shared/queue/jobs/pikslot.events';
import type { AuditLogJobName } from 'src/shared/queue/jobs';

const UNAUTHORIZED_ERROR: UnauthorizedError = {
  kind: 'unauthorized',
  message: 'Cannot edit booking: unauthorized',
  timestamp: new Date(),
};

@Injectable()
export class EditBookingUseCaseImpl implements EditBookingUseCase {
  constructor(
    @Inject(IBookingRepository)
    private readonly bookingRepository: BookingRepository,
    private readonly securityContext: SecurityContext,
    @InjectQueue(AUDIT_LOG_QUEUE)
    private readonly auditLogQueue: Queue<
      AuditLogJobDataShape,
      void,
      AuditLogJobName
    >,
  ) {}

  async execute(
    command: EditBookingUseCaseCommand,
  ): Promise<
    Result<
      Booking,
      | BookingNotFoundError
      | BookingConflictError
      | UnauthorizedError
      | InfrastructureError
    >
  > {
    const found = await this.bookingRepository.findById(command.bookingId);

    if (!found.ok) return err(found.error);

    if (!found.value) {
      return err<BookingNotFoundError>({
        kind: 'booking_not_found',
        by: 'id',
        value: command.bookingId,
        message: `Booking not found by id: ${command.bookingId}`,
        timestamp: new Date(),
      });
    }

    const isSelf = this.securityContext.userId === found.value.userId;
    const callerRole = this.securityContext.role;
    const isPartOfSameBusiness =
      this.securityContext.businessId === found.value.businessId;

    if (!Booking.canEditBooking(callerRole, isPartOfSameBusiness, isSelf))
      return err(UNAUTHORIZED_ERROR);

    const conflict = await this.bookingRepository.hasConflict(
      found.value.businessId,
      command.bookingStartTime,
      command.bookingEndTime,
      found.value.id,
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

    const updated = found.value.update({
      bookingDate: command.bookingDate,
      bookingStartTime: command.bookingStartTime,
      bookingEndTime: command.bookingEndTime,
      serviceId: command.serviceId,
      customerId: command.customerId,
      userId: command.userId,
      updatedBy: command.updatedBy,
      label: command.label ?? null,
      notes: command.notes ?? null,
    });

    const saved = await this.bookingRepository.update(updated);

    if (!saved.ok) return err(saved.error);

    await this.logBookingUpdatedAudit(updated);

    return ok(updated);
  }

  private async logBookingUpdatedAudit(booking: Booking): Promise<void> {
    const payload: AuditLogJobDataShape = {
      businessId: booking.businessId,
      userId: this.securityContext.userId,
      userType: 'user',
      action: PIKSLOT_EVENTS.AUDIT_LOG.BOOKING_UPDATED,
      description: `Booking ${booking.bookingId} was updated`,
      entityType: 'booking',
      entityId: booking.id,
      occurredAt: new Date().toISOString(),
    };

    await this.auditLogQueue.add(
      PIKSLOT_EVENTS.AUDIT_LOG.BOOKING_UPDATED,
      payload,
    );
  }
}
