import { Provider } from '@nestjs/common';
import {
  IFindNotificationsUseCase,
  IMarkAllNotificationsAsReadUseCase,
  IMarkNotificationAsReadUseCase,
} from '@pikslots/domain';
import { FindNotificationsUseCaseImpl } from './find.notifications.usecase.impl';
import { MarkNotificationAsReadUseCaseImpl } from './mark.notification.as.read.usecase.impl';
import { MarkAllNotificationsAsReadUseCaseImpl } from './mark.all.notifications.as.read.usecase.impl';

export const NOTIFICATION_USECASES: Provider[] = [
  {
    useClass: FindNotificationsUseCaseImpl,
    provide: IFindNotificationsUseCase,
  },
  {
    useClass: MarkNotificationAsReadUseCaseImpl,
    provide: IMarkNotificationAsReadUseCase,
  },
  {
    useClass: MarkAllNotificationsAsReadUseCaseImpl,
    provide: IMarkAllNotificationsAsReadUseCase,
  },
];
