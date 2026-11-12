import type { InfrastructureError, Result } from '../../shared';
import type { NotificationNotFoundError } from '../errors';
import type { Notification } from '../notification.entity';

/** Matches notifications addressed directly to `callerUserId`, OR
 * broadcast to `callerBusinessId` — mirrors Notification.isVisibleTo. */
export interface FindNotificationsFilter {
  callerUserId: string;
  callerBusinessId: string | null;
  onlyUnread?: boolean;
}

export interface NotificationRepository {
  save(notification: Notification): Promise<Result<void, InfrastructureError>>;
  findById(id: string): Promise<Result<Notification | null, InfrastructureError>>;
  findAll(filter: FindNotificationsFilter): Promise<Result<Notification[], InfrastructureError>>;
  countUnread(
    filter: Omit<FindNotificationsFilter, 'onlyUnread'>,
  ): Promise<Result<number, InfrastructureError>>;
  update(
    notification: Notification,
  ): Promise<Result<void, NotificationNotFoundError | InfrastructureError>>;
  markAllAsRead(
    filter: Omit<FindNotificationsFilter, 'onlyUnread'>,
  ): Promise<Result<void, InfrastructureError>>;
}

export const INotificationRepository = Symbol('INotificationRepository');
