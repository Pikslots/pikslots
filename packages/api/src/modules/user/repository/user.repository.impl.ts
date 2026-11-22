import { Inject, Injectable } from '@nestjs/common';
import {
  err,
  ok,
  InfrastructureError,
  Result,
  Slot,
  User,
  UserAlreadyExistsError,
  UserBreak,
  UserNotFoundError,
  UserRepository,
  UserRole,
  WeekDay,
  ShedulingWindow,
} from '@pikslots/domain';
import { Kysely } from 'kysely';
import { PIKSLOTS_DB } from 'src/shared/database/pikslots.database.module';
import {
  isUniqueViolation,
  getUniqueViolationField,
} from 'src/shared/database/helpers';
import { PikSlotsDatabase } from 'src/shared/database/schema';
import { UserPersistenceMapper } from '../mappers/user.database.mapper';

@Injectable()
export class UserRepositoryImpl implements UserRepository {
  private readonly mapper = new UserPersistenceMapper();

  constructor(
    @Inject(PIKSLOTS_DB) private readonly db: Kysely<PikSlotsDatabase>,
  ) {}

  async save(
    user: User,
  ): Promise<Result<void, UserAlreadyExistsError | InfrastructureError>> {
    try {
      await this.db
        .insertInto('users')
        .values(this.mapper.domainToPersistence(user))
        .execute();
      return ok(undefined);
    } catch (cause) {
      if (isUniqueViolation(cause)) {
        const field = getUniqueViolationField(cause);
        return err<UserAlreadyExistsError>({
          kind: 'user_already_exists',
          message: `A user with this ${field} already exists`,
          timestamp: new Date(),
          field,
        });
      }

      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to save user',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findById(
    id: string,
  ): Promise<Result<User | null, UserNotFoundError | InfrastructureError>> {
    try {
      const row = await this.db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', id)
        .where('is_deleted', '=', false)
        .executeTakeFirst();

      if (!row) return ok(null);

      return ok(this.mapper.persistenceToDomain(row));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find user by id',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findByEmail(
    email: string,
  ): Promise<Result<User | null, UserNotFoundError | InfrastructureError>> {
    try {
      const row = await this.db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', email)
        .where('is_deleted', '=', false)
        .executeTakeFirst();

      if (!row) return ok(null);

      return ok(this.mapper.persistenceToDomain(row));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find user by email',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findByUsername(
    username: string,
  ): Promise<Result<User | null, UserNotFoundError | InfrastructureError>> {
    try {
      const row = await this.db
        .selectFrom('users')
        .selectAll()
        .where('username', '=', username)
        .where('is_deleted', '=', false)
        .executeTakeFirst();

      if (!row) return ok(null);

      return ok(this.mapper.persistenceToDomain(row));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find user by username',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findAllByBusiness(
    businessId: string,
  ): Promise<Result<User[], InfrastructureError>> {
    try {
      const rows = await this.db
        .selectFrom('users')
        .selectAll()
        .where('business_id', '=', businessId)
        .where('is_deleted', '=', false)
        .execute();
      return ok(rows.map((row) => this.mapper.persistenceToDomain(row)));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find users by business',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findAllByIds(
    ids: string[],
  ): Promise<Result<User[], InfrastructureError>> {
    if (ids.length === 0) return ok([]);
    try {
      const rows = await this.db
        .selectFrom('users')
        .selectAll()
        .where('id', 'in', ids)
        .execute();
      return ok(rows.map((row) => this.mapper.persistenceToDomain(row)));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find users by ids',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findAllByRole(
    role: UserRole,
  ): Promise<Result<User[], InfrastructureError>> {
    try {
      const rows = await this.db
        .selectFrom('users')
        .selectAll()
        .where('role', '=', role)
        .where('is_deleted', '=', false)
        .execute();
      return ok(rows.map((row) => this.mapper.persistenceToDomain(row)));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find users by role',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async update(
    user: User,
  ): Promise<Result<void, UserNotFoundError | InfrastructureError>> {
    try {
      const result = await this.db
        .updateTable('users')
        .set(this.mapper.domainToPersistence(user))
        .where('id', '=', user.id)
        .where('is_deleted', '=', false)
        .executeTakeFirst();

      if (!result.numUpdatedRows || result.numUpdatedRows === BigInt(0)) {
        return err<UserNotFoundError>({
          kind: 'user_not_found',
          by: 'id',
          value: user.id,
          message: `User not found against ${user.id}`,
          timestamp: new Date(),
        });
      }

      return ok(undefined);
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to update user',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async existsByEmail(
    email: string,
  ): Promise<Result<boolean, InfrastructureError>> {
    try {
      const row = await this.db
        .selectFrom('users')
        .select('id')
        .where('email', '=', email)
        .where('is_deleted', '=', false)
        .executeTakeFirst();

      return ok(row !== undefined);
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to check user existence by email',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async existsByUsername(
    username: string,
  ): Promise<Result<boolean, InfrastructureError>> {
    try {
      const row = await this.db
        .selectFrom('users')
        .select('id')
        .where('username', '=', username)
        .where('is_deleted', '=', false)
        .executeTakeFirst();

      return ok(row !== undefined);
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to check user existence by username',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findBookedSlotsForUser(
    userId: string,
    businessId: string,
    date: string,
  ): Promise<Result<Slot[], InfrastructureError>> {
    try {
      const rows = await this.db
        .selectFrom('bookings')
        .select(['booking_start_time', 'booking_end_time'])
        .where('user_id', '=', userId)
        .where('business_id', '=', businessId)
        .where('booking_date', '=', new Date(date))
        .where('is_deleted', '=', false)
        .execute();

      return ok(
        rows.map((row) => ({
          startTime: row.booking_start_time.toISOString(),
          endTime: row.booking_end_time.toISOString(),
        })),
      );
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find booked slots for user',
        timestamp: new Date(),
        cause,
      });
    }
  }
  async findShedulingWindow(
    businessId: string,
  ): Promise<Result<ShedulingWindow, InfrastructureError>> {
    try {
      const row = await this.db
        .selectFrom('businesses')
        .select(['booking_policies'])
        .where('id', '=', businessId)
        .where('is_deleted', '=', false)
        .executeTakeFirstOrThrow();

      return ok({
        unit: row.booking_policies.scheduleWindow.unit,
        value: row.booking_policies.scheduleWindow.value,
      });
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find available dates for booking',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findUserBreaks(
    userId: string,
    businessId: string,
    day: WeekDay,
  ): Promise<Result<UserBreak[], InfrastructureError>> {
    try {
      const rows = await this.db
        .selectFrom('breaks')
        .select(['day', 'start_time', 'end_time'])
        .where('user_id', '=', userId)
        .where('business_id', '=', businessId)
        .where('day', '=', day)
        .where('is_deleted', '=', false)
        .execute();

      return ok(
        rows.map((row) => ({
          day: row.day,
          startTime: row.start_time,
          endTime: row.end_time,
        })),
      );
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find user breaks',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findUserTimeoffsByDate(
    userId: string,
    businessId: string,
    startDate: string,
  ): Promise<
    Result<
      {
        title: string;
        startDateTime: string;
        endDateTime: string;
        allDay: boolean;
        timeZone: string;
      }[],
      InfrastructureError
    >
  > {
    try {
      const dayStart = new Date(startDate);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

      const rows = await this.db
        .selectFrom('timeoffs')
        .select([
          'title',
          'start_date_time',
          'end_date_time',
          'all_day',
          'time_zone',
        ])
        .where('user_id', '=', userId)
        .where('business_id', '=', businessId)
        .where('start_date_time', '<', dayEnd)
        .where('end_date_time', '>', dayStart)
        .where('is_deleted', '=', false)
        .execute();

      return ok(
        rows.map((row) => ({
          title: row.title,
          startDateTime: row.start_date_time.toISOString(),
          endDateTime: row.end_date_time.toISOString(),
          allDay: row.all_day,
          timeZone: row.time_zone,
        })),
      );
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find user timeoffs by date',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findUserTimeoffsWithinShedulingWindow(
    userId: string,
    businessId: string,
    windowStartDate: string,
    windowEndDate: string,
  ): Promise<
    Result<
      {
        title: string;
        startDateTime: string;
        endDateTime: string;
        allDay: boolean;
        timeZone: string;
      }[],
      InfrastructureError
    >
  > {
    try {
      const windowStart = new Date(`${windowStartDate}T00:00:00.000Z`);
      const windowEnd = new Date(`${windowEndDate}T00:00:00.000Z`);
      windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);

      const rows = await this.db
        .selectFrom('timeoffs')
        .select([
          'title',
          'start_date_time',
          'end_date_time',
          'all_day',
          'time_zone',
        ])
        .where('user_id', '=', userId)
        .where('business_id', '=', businessId)
        .where('start_date_time', '<', windowEnd)
        .where('end_date_time', '>', windowStart)
        .where('is_deleted', '=', false)
        // .where('all_day', '=', true)
        .execute();

      return ok(
        rows.map((row) => ({
          title: row.title,
          startDateTime: row.start_date_time.toISOString(),
          endDateTime: row.end_date_time.toISOString(),
          allDay: row.all_day,
          timeZone: row.time_zone,
        })),
      );
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find user timeoffs within scheduling window',
        timestamp: new Date(),
        cause,
      });
    }
  }
}
