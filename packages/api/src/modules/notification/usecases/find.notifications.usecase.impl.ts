import { Inject, Injectable } from '@nestjs/common';
import {
  FindNotificationsCommand,
  FindNotificationsUseCase,
  INotificationRepository,
  InfrastructureError,
  Notification,
  Result,
} from '@pikslots/domain';
import type { NotificationRepository } from '@pikslots/domain';

@Injectable()
export class FindNotificationsUseCaseImpl implements FindNotificationsUseCase {
  constructor(
    @Inject(INotificationRepository)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    command: FindNotificationsCommand,
  ): Promise<Result<Notification[], InfrastructureError>> {
    return this.notificationRepository.findAll(command);
  }
}
