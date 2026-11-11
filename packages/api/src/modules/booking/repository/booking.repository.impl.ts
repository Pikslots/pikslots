import { Inject, Injectable } from '@nestjs/common';
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
import { Kysely } from 'kysely';
import { PIKSLOTS_DB } from 'src/shared/database/pikslots.database.module';
import { PikSlotsDatabase } from 'src/shared/database/schema';
import { BookingPersistenceMapper } from '../mappers/booking.database.mapper';

@Injectable()
export class BookingRepositoryImpl implements BookingRepository {
  private readonly mapper = new BookingPersistenceMapper();

  constructor(
    @Inject(PIKSLOTS_DB) private readonly db: Kysely<PikSlotsDatabase>,
  ) {}

  async findAllByBusinessForUser(
    businessId: string,
    userId: string,
    startDateTime?: string,
    endDateTime?: string,
  ): Promise<Result<Booking[], InfrastructureError>> {
    try {
      let query = this.db
        .selectFrom('bookings')
        .selectAll()
        .where('business_id', '=', businessId)
        .where('user_id', '=', userId)
        .where('is_deleted', '=', false);

      if (startDateTime) {
        query = query.where('booking_end_time', '>', new Date(startDateTime));
      }
      if (endDateTime) {
        query = query.where('booking_start_time', '<', new Date(endDateTime));
      }

      const rows = await query.execute();

      return ok(rows.map((row) => this.mapper.persistenceToDomain(row)));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find bookings by business',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async save(
    booking: Booking,
  ): Promise<Result<void, BookingConflictError | InfrastructureError>> {
    try {
      await this.db
        .insertInto('bookings')
        .values(this.mapper.domainToPersistence(booking))
        .execute();
      return ok(undefined);
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to save booking',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findById(
    id: string,
  ): Promise<Result<Booking | null, InfrastructureError>> {
    try {
      const row = await this.db
        .selectFrom('bookings')
        .selectAll()
        .where('id', '=', id)
        .where('is_deleted', '=', false)
        .executeTakeFirst();

      if (!row) return ok(null);

      return ok(this.mapper.persistenceToDomain(row));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find booking by id',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findAllByBusiness(
    businessId: string,
    startDateTime?: string,
    endDateTime?: string,
  ): Promise<Result<Booking[], InfrastructureError>> {
    try {
      let query = this.db
        .selectFrom('bookings')
        .selectAll()
        .where('business_id', '=', businessId)
        .where('is_deleted', '=', false);

      if (startDateTime) {
        query = query.where('booking_end_time', '>', new Date(startDateTime));
      }
      if (endDateTime) {
        query = query.where('booking_start_time', '<', new Date(endDateTime));
      }

      const rows = await query.execute();

      return ok(rows.map((row) => this.mapper.persistenceToDomain(row)));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find bookings by business',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findStartingBetween(
    windowStartIso: string,
    windowEndIso: string,
  ): Promise<Result<Booking[], InfrastructureError>> {
    try {
      const rows = await this.db
        .selectFrom('bookings')
        .selectAll()
        .where('is_deleted', '=', false)
        .where('booking_start_time', '>=', new Date(windowStartIso))
        .where('booking_start_time', '<', new Date(windowEndIso))
        .execute();

      return ok(rows.map((row) => this.mapper.persistenceToDomain(row)));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find bookings starting between window',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async update(
    booking: Booking,
  ): Promise<Result<void, BookingNotFoundError | InfrastructureError>> {
    try {
      const result = await this.db
        .updateTable('bookings')
        .set(this.mapper.domainToPersistence(booking))
        .where('id', '=', booking.id)
        .where('is_deleted', '=', false)
        .executeTakeFirst();

      if (!result.numUpdatedRows || result.numUpdatedRows === BigInt(0)) {
        return err<BookingNotFoundError>({
          kind: 'booking_not_found',
          by: 'id',
          value: booking.id,
          message: `Booking not found for id: ${booking.id}`,
          timestamp: new Date(),
        });
      }

      return ok(undefined);
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to update booking',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async delete(
    id: string,
  ): Promise<Result<void, BookingNotFoundError | InfrastructureError>> {
    try {
      const result = await this.db
        .deleteFrom('bookings')
        .where('id', '=', id)
        .executeTakeFirst();

      if (!result.numDeletedRows || result.numDeletedRows === BigInt(0)) {
        return err<BookingNotFoundError>({
          kind: 'booking_not_found',
          by: 'id',
          value: id,
          message: `Booking not found for id: ${id}`,
          timestamp: new Date(),
        });
      }

      return ok(undefined);
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to delete booking',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async hasConflict(
    businessId: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string,
  ): Promise<Result<boolean, InfrastructureError>> {
    try {
      let query = this.db
        .selectFrom('bookings')
        .select('id')
        .where('business_id', '=', businessId)
        .where('is_deleted', '=', false)
        .where('booking_start_time', '<', new Date(endTime))
        .where('booking_end_time', '>', new Date(startTime));

      if (excludeBookingId) {
        query = query.where('id', '!=', excludeBookingId);
      }

      const row = await query.executeTakeFirst();
      return ok(row !== undefined);
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to check booking conflict',
        timestamp: new Date(),
        cause,
      });
    }
  }
}
