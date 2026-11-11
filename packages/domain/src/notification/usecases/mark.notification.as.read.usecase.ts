import type { InfrastructureError, Result, UnauthorizedError } from '../../shared';
import type { NotificationNotFoundError } from '../errors';
import type { Notification } from '../notification.entity';

export interface MarkNotificationAsReadCommand {
  id: string;
  callerUserId: string;
  callerBusinessId: string | null;
}

export const IMarkNotificationAsReadUseCase = Symbol('IMarkNotificationAsReadUseCase');

export interface MarkNotificationAsReadUseCase {
  execute(
    command: MarkNotificationAsReadCommand,
  ): Promise<
    Result<Notification, NotificationNotFoundError | UnauthorizedError | InfrastructureError>
  >;
}
