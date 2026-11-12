import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import {
  Booking,
  BookingNotFoundError,
  type AuditLogJobDataShape,
  type BookingRepository,
  DeleteBookingCommand,
  DeleteBookingUseCase,
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
  message: 'Cannot delete booking: unauthorized',
  timestamp: new Date(),
};

@Injectable()
export class DeleteBookingUseCaseImpl implements DeleteBookingUseCase {
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
    command: DeleteBookingCommand,
  ): Promise<
    Result<void, BookingNotFoundError | UnauthorizedError | InfrastructureError>
  > {
    const found = await this.bookingRepository.findById(command.id);
    if (!found.ok) return err(found.error);

    if (!found.value) {
      return err<BookingNotFoundError>({
        kind: 'booking_not_found',
        by: 'id',
        value: command.id,
        message: `Booking not found by id: ${command.id}`,
        timestamp: new Date(),
      });
    }
    const isSelf = this.securityContext.userId === found.value.userId;
    const callerRole = this.securityContext.role;
    const isPartOfSameBusiness =
      this.securityContext.businessId === found.value.businessId;

    if (!Booking.canDeleteBooking(callerRole, isPartOfSameBusiness, isSelf))
      return err(UNAUTHORIZED_ERROR);

    const softDeleted = found.value.softDelete(command.deletedBy);

    const saved = await this.bookingRepository.update(softDeleted);
    if (!saved.ok) return err(saved.error);

    await this.logBookingDeletedAudit(softDeleted);

    return ok(undefined);
  }

  private async logBookingDeletedAudit(booking: Booking): Promise<void> {
    const payload: AuditLogJobDataShape = {
      businessId: booking.businessId,
      userId: this.securityContext.userId,
      userType: 'user',
      action: PIKSLOT_EVENTS.AUDIT_LOG.BOOKING_DELETED,
      description: `Booking ${booking.bookingId} was cancelled`,
      entityType: 'booking',
      entityId: booking.id,
      occurredAt: new Date().toISOString(),
    };

    await this.auditLogQueue.add(
      PIKSLOT_EVENTS.AUDIT_LOG.BOOKING_DELETED,
      payload,
    );
  }
}
