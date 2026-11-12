import type {
  NotificationTableInsert,
  NotificationTableSelect,
} from 'src/shared/database/schema/notification.table';
import { Notification } from '@pikslots/domain';
import { sql, type RawBuilder } from 'kysely';

export class NotificationPersistenceMapper {
  public persistenceToDomain(row: NotificationTableSelect): Notification {
    return Notification.reconstitute({
      id: row.id,
      userId: row.user_id,
      businessId: row.business_id,
      kind: row.kind,
      iconClassName: row.icon_class_name,
      title: row.title,
      message: row.message,
      body: row.body,
      href: row.href,
      isRead: row.is_read,
      readAt: row.read_at,
      createdAt: row.created_at,
    });
  }

  public domainToPersistence(
    notification: Notification,
  ): Omit<NotificationTableInsert, 'body'> & { body: RawBuilder<string[]> } {
    return {
      id: notification.id,
      user_id: notification.userId,
      business_id: notification.businessId,
      kind: notification.kind,
      icon_class_name: notification.iconClassName,
      title: notification.title,
      message: notification.message,
      // `pg` serializes plain JS arrays as Postgres array literals (`{...}`),
      // not JSON — explicitly cast so the jsonb column gets valid JSON.
      body: sql`${JSON.stringify(notification.body)}::jsonb`,
      href: notification.href,
      is_read: notification.isRead,
      read_at: notification.readAt,
      created_at: notification.createdAt,
    };
  }
}
