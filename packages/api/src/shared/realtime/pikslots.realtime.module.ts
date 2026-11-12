import { Global, Module } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { NotificationEmitterService } from './notification.emitter.service';
import { NotificationDispatchService } from './notification.dispatch.service';
import { NotificationModule } from '../../modules/notification/notification.module';

@Global()
@Module({
  imports: [NotificationModule],
  providers: [
    NotificationGateway,
    NotificationEmitterService,
    NotificationDispatchService,
  ],
  exports: [NotificationEmitterService, NotificationDispatchService],
})
export class PikslotsRealtimeModule {}
