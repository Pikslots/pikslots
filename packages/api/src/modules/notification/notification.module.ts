import { Module } from '@nestjs/common';
import { INotificationRepository } from '@pikslots/domain';
import { NotificationRepositoryImpl } from './repository/notification.repository.impl';
import { NOTIFICATION_USECASES } from './usecases';
import { NotificationUsecasesFactory } from './factory/notification.usecases.factory';
import { NotificationController } from './notification.controller';

@Module({
  controllers: [NotificationController],
  providers: [
    { useClass: NotificationRepositoryImpl, provide: INotificationRepository },
    ...NOTIFICATION_USECASES,
    NotificationUsecasesFactory,
  ],
  exports: [INotificationRepository, NotificationUsecasesFactory],
})
export class NotificationModule {}
