import { Inject, Injectable } from '@nestjs/common';
import {
  IFindNotificationsUseCase,
  IMarkAllNotificationsAsReadUseCase,
  IMarkNotificationAsReadUseCase,
} from '@pikslots/domain';
import type {
  FindNotificationsUseCase,
  MarkAllNotificationsAsReadUseCase,
  MarkNotificationAsReadUseCase,
} from '@pikslots/domain';

@Injectable()
export class NotificationUsecasesFactory {
  @Inject(IFindNotificationsUseCase)
  public readonly findNotificationsUsecase: FindNotificationsUseCase;

  @Inject(IMarkNotificationAsReadUseCase)
  public readonly markNotificationAsReadUsecase: MarkNotificationAsReadUseCase;

  @Inject(IMarkAllNotificationsAsReadUseCase)
  public readonly markAllNotificationsAsReadUsecase: MarkAllNotificationsAsReadUseCase;
}
