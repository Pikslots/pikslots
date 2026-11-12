// booking.repository.fake.impl.ts
import {
  Booking,
  BookingConflictError,
  BookingNotFoundError,
  BookingRepository,
  err,
  InfrastructureError,
  ok,
  Result,
} from '@pikslots/domain';
import { BOOKING_TEST_DATA } from './booking.test.data';

/**
 * In-memory fake for BookingRepository, used for unit testing use cases.
 * Mirrors BookingRepositoryImpl's real query semantics exactly:
 * - findById, findAllByBusiness, findAllByBusinessForUser, and hasConflict
 *   all filter isDeleted (matches `where('is_deleted', '=', false)`).
 * - update and delete filter isDeleted and return BookingNotFoundError when
 *   no active row matches (matches `numUpdatedRows`/`numDeletedRows` checks).
 * - hasConflict uses strict overlap semantics: start < otherEnd AND end > otherStart
 *   (matches the real repo's `<`/`>` comparisons, not `<=`/`>=`), and supports
 *   excludeBookingId for self-exclusion during updates.
 */
export class BookingRepositoryTestImpl implements BookingRepository {
  async save(
    booking: Booking,
  ): Promise<Result<void, BookingConflictError | InfrastructureError>> {
    await Promise.resolve('');

    BOOKING_TEST_DATA.push(booking);
    return ok(undefined);
  }

  async findById(
    id: string,
  ): Promise<Result<Booking | null, InfrastructureError>> {
    await Promise.resolve('');

    const found =
      BOOKING_TEST_DATA.find((b) => b.id === id && !b.isDeleted) ?? null;
    return ok(found);
  }

  async findAllByBusiness(
    businessId: string,
    startDateTime?: string,
    endDateTime?: string,
  ): Promise<Result<Booking[], InfrastructureError>> {
    await Promise.resolve('');

    return ok(
      BOOKING_TEST_DATA.filter(
        (b) =>
          b.businessId === businessId &&
          !b.isDeleted &&
          this.isWithinRange(b, startDateTime, endDateTime),
      ),
    );
  }

  async findAllByBusinessForUser(
    businessId: string,
    userId: string,
    startDateTime?: string,
    endDateTime?: string,
  ): Promise<Result<Booking[], InfrastructureError>> {
    await Promise.resolve('');

    return ok(
      BOOKING_TEST_DATA.filter(
        (b) =>
          b.businessId === businessId &&
          b.userId === userId &&
          !b.isDeleted &&
          this.isWithinRange(b, startDateTime, endDateTime),
      ),
    );
  }

  private isWithinRange(
    booking: Booking,
    startDateTime?: string,
    endDateTime?: string,
  ): boolean {
    if (
      startDateTime &&
      new Date(booking.bookingEndTime).getTime() <=
        new Date(startDateTime).getTime()
    ) {
      return false;
    }

    if (
      endDateTime &&
      new Date(booking.bookingStartTime).getTime() >=
        new Date(endDateTime).getTime()
    ) {
      return false;
    }

    return true;
  }

  async findStartingBetween(
    windowStartIso: string,
    windowEndIso: string,
  ): Promise<Result<Booking[], InfrastructureError>> {
    await Promise.resolve('');

    const start = new Date(windowStartIso).getTime();
    const end = new Date(windowEndIso).getTime();

    return ok(
      BOOKING_TEST_DATA.filter((b) => {
        if (b.isDeleted) return false;
        const startTime = new Date(b.bookingStartTime).getTime();
        return startTime >= start && startTime < end;
      }),
    );
  }

  async update(
    booking: Booking,
  ): Promise<Result<void, BookingNotFoundError | InfrastructureError>> {
    await Promise.resolve('');
    const index = BOOKING_TEST_DATA.findIndex(
      (b) => b.id === booking.id && !b.isDeleted,
    );
    if (index === -1) {
      return err<BookingNotFoundError>({
        kind: 'booking_not_found',
        by: 'id',
        value: booking.id,
        message: `Booking not found for id: ${booking.id}`,
        timestamp: new Date(),
      });
    }
    BOOKING_TEST_DATA[index] = booking;
    return ok(undefined);
  }

  async delete(
    id: string,
  ): Promise<Result<void, BookingNotFoundError | InfrastructureError>> {
    await Promise.resolve('');
    const index = BOOKING_TEST_DATA.findIndex((b) => b.id === id);
    if (index === -1) {
      return err<BookingNotFoundError>({
        kind: 'booking_not_found',
        by: 'id',
        value: id,
        message: `Booking not found for id: ${id}`,
        timestamp: new Date(),
      });
    }
    BOOKING_TEST_DATA.splice(index, 1);
    return ok(undefined);
  }

  async hasConflict(
    businessId: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string,
  ): Promise<Result<boolean, InfrastructureError>> {
    await Promise.resolve('');
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    const conflict = BOOKING_TEST_DATA.some((b) => {
      if (b.businessId !== businessId) return false;
      if (b.isDeleted) return false;
      if (excludeBookingId && b.id === excludeBookingId) return false;

      const existingStart = new Date(b.bookingStartTime).getTime();
      const existingEnd = new Date(b.bookingEndTime).getTime();

      // matches real repo: booking_start_time < endTime AND booking_end_time > startTime
      return existingStart < end && existingEnd > start;
    });

    return ok(conflict);
  }
}
