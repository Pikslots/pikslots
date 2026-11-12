import { Inject, Injectable } from '@nestjs/common';
import {
  err,
  FindNotificationsFilter,
  InfrastructureError,
  Notification,
  NotificationNotFoundError,
  NotificationRepository,
  ok,
  Result,
} from '@pikslots/domain';
import { ExpressionBuilder, Kysely } from 'kysely';
import { PIKSLOTS_DB } from 'src/shared/database/pikslots.database.module';
import { PikSlotsDatabase } from 'src/shared/database/schema';
import { NotificationPersistenceMapper } from '../mappers/notification.database.mapper';

/** Matches rows addressed to `callerUserId`, or broadcast to
 * `callerBusinessId` when provided — mirrors Notification.isVisibleTo. */
function visibleToExpression(
  eb: ExpressionBuilder<PikSlotsDatabase, 'notifications'>,
  filter: Omit<FindNotificationsFilter, 'onlyUnread'>,
) {
  return filter.callerBusinessId
    ? eb.or([
        eb('user_id', '=', filter.callerUserId),
        eb('business_id', '=', filter.callerBusinessId),
      ])
    : eb('user_id', '=', filter.callerUserId);
}

@Injectable()
export class NotificationRepositoryImpl implements NotificationRepository {
  private readonly mapper = new NotificationPersistenceMapper();

  constructor(
    @Inject(PIKSLOTS_DB) private readonly db: Kysely<PikSlotsDatabase>,
  ) {}

  async save(
    notification: Notification,
  ): Promise<Result<void, InfrastructureError>> {
    try {
      await this.db
        .insertInto('notifications')
        .values(this.mapper.domainToPersistence(notification))
        .execute();
      return ok(undefined);
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to save notification',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findById(
    id: string,
  ): Promise<Result<Notification | null, InfrastructureError>> {
    try {
      const row = await this.db
        .selectFrom('notifications')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      if (!row) return ok(null);

      return ok(this.mapper.persistenceToDomain(row));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find notification by id',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findAll(
    filter: FindNotificationsFilter,
  ): Promise<Result<Notification[], InfrastructureError>> {
    try {
      let query = this.db
        .selectFrom('notifications')
        .selectAll()
        .where((eb) => visibleToExpression(eb, filter));

      if (filter.onlyUnread) query = query.where('is_read', '=', false);

      const rows = await query.orderBy('created_at', 'desc').execute();

      return ok(rows.map((row) => this.mapper.persistenceToDomain(row)));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to find notifications',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async countUnread(
    filter: Omit<FindNotificationsFilter, 'onlyUnread'>,
  ): Promise<Result<number, InfrastructureError>> {
    try {
      const row = await this.db
        .selectFrom('notifications')
        .where((eb) => visibleToExpression(eb, filter))
        .where('is_read', '=', false)
        .select((eb) => eb.fn.countAll().as('count'))
        .executeTakeFirst();

      return ok(Number(row?.count ?? 0));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to count unread notifications',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async update(
    notification: Notification,
  ): Promise<Result<void, NotificationNotFoundError | InfrastructureError>> {
    try {
      const result = await this.db
        .updateTable('notifications')
        .set(this.mapper.domainToPersistence(notification))
        .where('id', '=', notification.id)
        .executeTakeFirst();

      if (!result.numUpdatedRows || result.numUpdatedRows === BigInt(0)) {
        return err<NotificationNotFoundError>({
          kind: 'notification_not_found',
          by: 'id',
          value: notification.id,
          message: `Notification not found for id: ${notification.id}`,
          timestamp: new Date(),
        });
      }

      return ok(undefined);
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to update notification',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async markAllAsRead(
    filter: Omit<FindNotificationsFilter, 'onlyUnread'>,
  ): Promise<Result<void, InfrastructureError>> {
    try {
      await this.db
        .updateTable('notifications')
        .set({ is_read: true, read_at: new Date() })
        .where((eb) => visibleToExpression(eb, filter))
        .where('is_read', '=', false)
        .execute();

      return ok(undefined);
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to mark all notifications as read',
        timestamp: new Date(),
        cause,
      });
    }
  }
}
