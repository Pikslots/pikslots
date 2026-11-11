import { Inject, Injectable } from '@nestjs/common';
import {
  INotificationRepository,
  InfrastructureError,
  MarkAllNotificationsAsReadCommand,
  MarkAllNotificationsAsReadUseCase,
  Result,
} from '@pikslots/domain';
import type { NotificationRepository } from '@pikslots/domain';

@Injectable()
export class MarkAllNotificationsAsReadUseCaseImpl implements MarkAllNotificationsAsReadUseCase {
  constructor(
    @Inject(INotificationRepository)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    command: MarkAllNotificationsAsReadCommand,
  ): Promise<Result<void, InfrastructureError>> {
    return this.notificationRepository.markAllAsRead(command);
  }
}
