import { Inject, Injectable } from '@nestjs/common';
import {
  err,
  INotificationRepository,
  InfrastructureError,
  MarkNotificationAsReadCommand,
  MarkNotificationAsReadUseCase,
  Notification,
  NotificationNotFoundError,
  ok,
  Result,
  UnauthorizedError,
} from '@pikslots/domain';
import type { NotificationRepository } from '@pikslots/domain';

const UNAUTHORIZED_ERROR: UnauthorizedError = {
  kind: 'unauthorized',
  message: 'You are not allowed to mark this notification as read',
  timestamp: new Date(),
};

@Injectable()
export class MarkNotificationAsReadUseCaseImpl implements MarkNotificationAsReadUseCase {
  constructor(
    @Inject(INotificationRepository)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    command: MarkNotificationAsReadCommand,
  ): Promise<
    Result<
      Notification,
      NotificationNotFoundError | UnauthorizedError | InfrastructureError
    >
  > {
    const found = await this.notificationRepository.findById(command.id);
    if (!found.ok) return err(found.error);

    if (!found.value) {
      return err<NotificationNotFoundError>({
        kind: 'notification_not_found',
        by: 'id',
        value: command.id,
        message: `Notification not found for id: ${command.id}`,
        timestamp: new Date(),
      });
    }

    if (
      !found.value.isVisibleTo(command.callerUserId, command.callerBusinessId)
    ) {
      return err(UNAUTHORIZED_ERROR);
    }

    const read = found.value.markAsRead();
    const updated = await this.notificationRepository.update(read);
    if (!updated.ok) return err(updated.error);

    return ok(read);
  }
}
