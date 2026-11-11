import { Injectable, Logger } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import type {
  NotificationPayload,
  NotificationTarget,
} from './notification.types';

@Injectable()
export class NotificationEmitterService {
  private readonly logger: Logger = new Logger(NotificationEmitterService.name);
  constructor(private readonly gateway: NotificationGateway) {}

  emitToUser(userId: string, payload: NotificationPayload): void {
    this.gateway.server.to(`user:${userId}`).emit('notification', payload);
  }

  emitToBusiness(businessId: string, payload: NotificationPayload): void {
    this.gateway.server
      .to(`business:${businessId}`)
      .emit('notification', payload);
  }

  emit(target: NotificationTarget, payload: NotificationPayload): void {
    this.logger.log('Fired notification websocket event');
    if (target.type === 'user') this.emitToUser(target.userId, payload);
    else this.emitToBusiness(target.businessId, payload);
  }
}
