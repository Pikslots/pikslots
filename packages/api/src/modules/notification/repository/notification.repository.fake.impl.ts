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
import { NOTIFICATION_TEST_DATA } from './notification.test.data';

function isVisible(
  notification: Notification,
  filter: Omit<FindNotificationsFilter, 'onlyUnread'>,
): boolean {
  if (notification.userId) return notification.userId === filter.callerUserId;
  return (
    filter.callerBusinessId !== null &&
    notification.businessId === filter.callerBusinessId
  );
}

/**
 * In-memory fake for NotificationRepository, used for unit testing use cases.
 */
export class NotificationRepositoryTestImpl implements NotificationRepository {
  async save(
    notification: Notification,
  ): Promise<Result<void, InfrastructureError>> {
    await Promise.resolve();
    NOTIFICATION_TEST_DATA.push(notification);
    return ok(undefined);
  }

  async findById(
    id: string,
  ): Promise<Result<Notification | null, InfrastructureError>> {
    await Promise.resolve();
    const found = NOTIFICATION_TEST_DATA.find((n) => n.id === id);
    return ok(found ?? null);
  }

  async findAll(
    filter: FindNotificationsFilter,
  ): Promise<Result<Notification[], InfrastructureError>> {
    await Promise.resolve();
    const rows = NOTIFICATION_TEST_DATA.filter(
      (n) => isVisible(n, filter) && (!filter.onlyUnread || !n.isRead),
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return ok(rows);
  }

  async countUnread(
    filter: Omit<FindNotificationsFilter, 'onlyUnread'>,
  ): Promise<Result<number, InfrastructureError>> {
    await Promise.resolve();
    const count = NOTIFICATION_TEST_DATA.filter(
      (n) => isVisible(n, filter) && !n.isRead,
    ).length;
    return ok(count);
  }

  async update(
    notification: Notification,
  ): Promise<Result<void, NotificationNotFoundError | InfrastructureError>> {
    await Promise.resolve();
    const index = NOTIFICATION_TEST_DATA.findIndex(
      (n) => n.id === notification.id,
    );
    if (index === -1) {
      return err<NotificationNotFoundError>({
        kind: 'notification_not_found',
        by: 'id',
        value: notification.id,
        message: `Notification not found for id: ${notification.id}`,
        timestamp: new Date(),
      });
    }
    NOTIFICATION_TEST_DATA[index] = notification;
    return ok(undefined);
  }

  async markAllAsRead(
    filter: Omit<FindNotificationsFilter, 'onlyUnread'>,
  ): Promise<Result<void, InfrastructureError>> {
    await Promise.resolve();
    NOTIFICATION_TEST_DATA.forEach((n, index) => {
      if (isVisible(n, filter) && !n.isRead) {
        NOTIFICATION_TEST_DATA[index] = n.markAsRead();
      }
    });
    return ok(undefined);
  }
}
