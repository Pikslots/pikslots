import { Inject, Injectable, Logger } from '@nestjs/common';
import { INotificationRepository, Notification } from '@pikslots/domain';
import type { NotificationRepository } from '@pikslots/domain';
import { v7 as uuidv7 } from 'uuid';
import { NotificationEmitterService } from './notification.emitter.service';
import type { NotificationDispatchInput } from './notification.dispatch.types';

/** Persists a notification and fires its websocket event in the same call —
 * no queue in between. Failures are logged and swallowed so a notification
 * glitch never fails the caller's own operation (e.g. booking creation). */
@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    @Inject(INotificationRepository)
    private readonly notificationRepository: NotificationRepository,
    private readonly emitter: NotificationEmitterService,
  ) {}

  async dispatch(input: NotificationDispatchInput): Promise<void> {
    const notification = Notification.create({ id: uuidv7(), ...input });

    const saved = await this.notificationRepository.save(notification);

    if (!saved.ok) {
      this.logger.error(
        `Failed to persist notification: ${JSON.stringify(saved.error)}`,
      );
      return;
    }

    this.emitter.emit(
      notification.userId
        ? { type: 'user', userId: notification.userId }
        : { type: 'business', businessId: notification.businessId! },
      {
        id: notification.id,
        kind: notification.kind,
        title: notification.title,
        message: notification.message,
        body: notification.body,
        createdAt: notification.createdAt.toISOString(),
        href: notification.href ?? undefined,
      },
    );
  }
}
