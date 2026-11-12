import type { InfrastructureError, Result } from '../../shared';
import type { BookingNotFoundError, BookingConflictError } from '../errors';
import type { Booking, BookingProps } from '../booking.entity';

export interface BookingRepository {
  save(booking: Booking): Promise<Result<void, BookingConflictError | InfrastructureError>>;
  findById(id: string): Promise<Result<Booking | null, InfrastructureError>>;
  findAllByBusiness(
    businessId: string,
    startDateTime?: string,
    endDateTime?: string,
  ): Promise<Result<Booking[], InfrastructureError>>;
  findAllByBusinessForUser(
    businessId: string,
    userId: string,
    startDateTime?: string,
    endDateTime?: string,
  ): Promise<Result<Booking[], InfrastructureError>>;
  /** Cross-business lookup of confirmed, non-deleted bookings whose
   * bookingStartTime falls within [windowStartIso, windowEndIso). Used by the
   * reminder scheduler to scan for bookings starting soon. */
  findStartingBetween(
    windowStartIso: string,
    windowEndIso: string,
  ): Promise<Result<Booking[], InfrastructureError>>;
  update(booking: Booking): Promise<Result<void, BookingNotFoundError | InfrastructureError>>;
  delete(id: string): Promise<Result<void, BookingNotFoundError | InfrastructureError>>;
  hasConflict(
    businessId: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string,
  ): Promise<Result<boolean, InfrastructureError>>;
}

export const IBookingRepository = Symbol('IBookingRepository');
