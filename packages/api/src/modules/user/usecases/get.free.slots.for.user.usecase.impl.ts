import { Inject, Injectable } from '@nestjs/common';
import {
  err,
  InfrastructureError,
  IUserRepository,
  ok,
  Result,
  Slot,
  UserNotFoundError,
  WeekDay,
} from '@pikslots/domain';
import type {
  GetFreeSlotsForUser,
  GetFreeSlotsForUserCommand,
  UserBreak,
  UserInactiveError,
  UserRepository,
  UserSuspendedError,
} from '@pikslots/domain';
import {
  getWeekDay,
  isoToMillis,
  millisToIso,
  workingHourToUTC,
} from '@pikslots/datetime';

const USER_SUSPENDED_ERR: UserSuspendedError = {
  kind: 'user_suspended',
  reason: 'selected users has been suspended',
  message: 'selected users has been suspended',
  timestamp: new Date(),
};

const USER_INACTIVE_ERR: UserInactiveError = {
  kind: 'user_inactive',
  status: 'inactive',
  message: 'selected user is inactive',
  timestamp: new Date(),
};

@Injectable()
export class GetFreeSlotsForUserUseCaseImpl implements GetFreeSlotsForUser {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: UserRepository,
  ) {}

  async execute(
    command: GetFreeSlotsForUserCommand,
  ): Promise<
    Result<
      Slot[],
      | UserNotFoundError
      | UserSuspendedError
      | UserInactiveError
      | InfrastructureError
    >
  > {
    const userResult = await this.userRepository.findById(command.userId);

    if (!userResult.ok) return err(userResult.error);

    if (!userResult.value) {
      return err<UserNotFoundError>({
        kind: 'user_not_found',
        message: `User not found by id: ${command.userId}`,
        by: 'id',
        value: command.userId,
        timestamp: new Date(),
      });
    }

    if (userResult.value.status === 'inactive') return err(USER_INACTIVE_ERR);

    if (userResult.value.status === 'suspended') return err(USER_SUSPENDED_ERR);

    const user = userResult.value;
    const weekDay = getWeekDay(command.date) as WeekDay;
    const dayHours = user.userWorkingHours[weekDay];

    // working day is off i.e monday is off
    if (!dayHours.enabled) return ok([]);

    // Convert the working hour stored as HH:mm to utc string (based on the timezone )
    // like -> ISO 8601 UTC string, e.g. "2025-06-16T13:00:00.000Z"
    const windowStart = workingHourToUTC(
      command.date,
      dayHours.openTime,
      command.businessTimezone,
    );
    const windowEnd = workingHourToUTC(
      command.date,
      dayHours.closeTime,
      command.businessTimezone,
    );

    // already booked bookings
    const bookedResult = await this.userRepository.findBookedSlotsForUser(
      command.userId,
      command.businessId,
      command.date,
    );

    if (!bookedResult.ok) return err(bookedResult.error);

    // user breaks
    const breaksResult = await this.userRepository.findUserBreaks(
      command.userId,
      command.businessId,
      weekDay,
    );

    if (!breaksResult.ok) return err(breaksResult.error);

    // Convert break HH:mm times to UTC ISO strings for the requested date based on the timezone,
    // then merge with booked slots so generateSlots treats them as blocked time.
    const breakSlots: UserBreak[] = breaksResult.value.map((brk) => ({
      startTime: workingHourToUTC(
        command.date,
        brk.startTime,
        command.businessTimezone,
      ),
      endTime: workingHourToUTC(
        command.date,
        brk.endTime,
        command.businessTimezone,
      ),
      day: brk.day,
    }));

    // user timeoffs
    const timeoffsResult = await this.userRepository.findUserTimeoffsByDate(
      command.userId,
      command.businessId,
      command.date,
    );

    if (!timeoffsResult.ok) return err(timeoffsResult.error);

    // An all-day timeoff blocks the entire working window regardless of its
    // stored start/end instants, so short-circuit instead of relying on
    // interval overlap math.
    if (timeoffsResult.value.some((timeoff) => timeoff.allDay)) return ok([]);

    // Timeoffs already store startDateTime/endDateTime as UTC ISO instants,
    // so they're directly usable as blocked slots, same as bookings/breaks.
    // Recurrence is ignored for now — only the stored start/end are checked.
    const timeoffSlots: Slot[] = timeoffsResult.value.map((timeoff) => ({
      startTime: timeoff.startDateTime,
      endTime: timeoff.endDateTime,
    }));

    const blockedSlots = [
      ...bookedResult.value,
      ...breakSlots,
      ...timeoffSlots,
    ];

    // Clamp the window start to the next 5-minute boundary at or after now (UTC)
    // so past slots are never generated and the first available slot always
    // starts on a clean 5-minute mark.  For future dates now < windowStart so
    // the ceil is a no-op and windowStart is used as-is.
    const FIVE_MIN_MS = 5 * 60_000;
    const nowCeil = Math.ceil(Date.now() / FIVE_MIN_MS) * FIVE_MIN_MS;
    const effectiveWindowStart = millisToIso(
      Math.max(isoToMillis(windowStart), nowCeil),
    );

    return ok(
      this.generateSlots(
        effectiveWindowStart,
        windowEnd,
        blockedSlots,
        command.durationInMins,
        command.bufferTimeInMins,
      ),
    );
  }

  /**
   * Generates non-overlapping available time slots within a working window,
   * skipping any slot that conflicts with an existing booking (± buffer time).
   *
   * Slots are produced at fixed intervals of `durationMins` from `windowStart`.
   * A slot is excluded if it overlaps with any booked slot once the buffer is
   * applied on both sides of that booking.
   *
   * @param windowStart  - ISO 8601 UTC string marking the start of the working window
   * @param windowEnd    - ISO 8601 UTC string marking the end of the working window
   * @param blockedSlots - All blocked intervals for the day: existing bookings + breaks (ISO 8601 UTC start/end times)
   * @param durationMins - Duration of each generated slot in minutes
   * @param bufferMins   - Buffer time around each existing booking in minutes
   * @returns Array of available slots with ISO 8601 UTC start and end times
   */
  private generateSlots(
    windowStart: string,
    windowEnd: string,
    blockedSlots: Slot[],
    durationMins: number,
    bufferMins: number,
  ): Slot[] {
    const slots: Slot[] = [];
    const durationMs = durationMins * 60_000; // convert to ms unix timetamp
    const bufferMs = bufferMins * 60_000;

    let current = isoToMillis(windowStart);
    const endMs = isoToMillis(windowEnd);

    while (current + durationMs <= endMs) {
      const slotEnd = current + durationMs;

      // `slotEnd + bufferMs` is used so that a slot whose trailing buffer
      // runs into a blocked interval (break or booking) is also excluded.
      // Strict inequalities keep boundary-touching slots available:
      // e.g. break 10:00–11:00 with buffer=0 → slot 9:30–10:00 still allowed.
      const hasConflict = blockedSlots.some(({ startTime, endTime }) => {
        const blockedStart = isoToMillis(startTime);
        const blockedEnd = isoToMillis(endTime);
        return current < blockedEnd && slotEnd + bufferMs > blockedStart;
      });

      if (!hasConflict) {
        slots.push({
          startTime: millisToIso(current),
          endTime: millisToIso(slotEnd),
        });
      }

      current += durationMs + bufferMs;
    }
    return slots;
  }
}
