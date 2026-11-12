import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IBookingRepository } from '@pikslots/domain';
import type { Booking, BookingRepository } from '@pikslots/domain';
import { NotificationDispatchService } from 'src/shared/realtime/notification.dispatch.service';
import { NOTIFICATION_ICON_CLASS_NAMES } from 'src/shared/realtime/notification.dispatch.types';

const REMINDER_LEAD_MINUTES = 10;
const SCAN_WINDOW_MINUTES = 1; // matches the EVERY_MINUTE cron tick

@Injectable()
export class BookingReminderScheduler {
  private readonly logger = new Logger(BookingReminderScheduler.name);

  constructor(
    @Inject(IBookingRepository)
    private readonly bookingRepository: BookingRepository,
    private readonly notificationDispatchService: NotificationDispatchService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async scanUpcomingBookings(): Promise<void> {
    const now = Date.now();
    const windowStart = new Date(
      now + REMINDER_LEAD_MINUTES * 60_000,
    ).toISOString();
    const windowEnd = new Date(
      now + (REMINDER_LEAD_MINUTES + SCAN_WINDOW_MINUTES) * 60_000,
    ).toISOString();

    const result = await this.bookingRepository.findStartingBetween(
      windowStart,
      windowEnd,
    );

    if (!result.ok) {
      this.logger.warn(
        `Failed to scan for upcoming bookings: ${JSON.stringify(result.error)}`,
      );
      return;
    }

    const confirmedBookings = result.value.filter(
      (booking) => booking.label?.toLowerCase() === 'confirmed',
    );

    await Promise.all(
      confirmedBookings.map((booking) => this.enqueueReminder(booking)),
    );
  }

  private async enqueueReminder(booking: Booking): Promise<void> {
    if (!booking.userId) return;

    await this.notificationDispatchService.dispatch({
      userId: booking.userId,
      kind: 'booking',
      iconClassName: NOTIFICATION_ICON_CLASS_NAMES.booking,
      title: 'Upcoming appointment',
      message: `${booking.serviceSnapshot.title} starts in ${REMINDER_LEAD_MINUTES} minutes.`,
      body: [
        `Booking ${booking.bookingId} (${booking.serviceSnapshot.title}) is scheduled to start in ${REMINDER_LEAD_MINUTES} minutes.`,
      ],
    });
  }
}
