import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import type { Notification } from '@pikslots/domain';
import { NOTIFICATION_ENDPOINTS } from '@pikslots/shared';
import type {
  FindNotificationsResponse,
  MarkAllNotificationsAsReadResponse,
  MarkNotificationAsReadResponse,
  NotificationResponse,
} from '@pikslots/shared';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';
import { PikslotsBaseResponse } from 'src/shared/types/base.response';
import { SecurityContext } from 'src/shared/security/context/security.context';
import { mapNotificationError } from './errors/notification.errors.map';
import {
  FindNotificationsDocs,
  MarkAllNotificationsAsReadDocs,
  MarkNotificationAsReadDocs,
} from './docs/notification.controller.docs';
import { NotificationUsecasesFactory } from './factory/notification.usecases.factory';
import { FindNotificationsDto } from './dto/find.notifications.dto';

function toNotificationResponse(
  notification: Notification,
): NotificationResponse {
  return {
    id: notification.id,
    kind: notification.kind,
    iconClassName: notification.iconClassName,
    title: notification.title,
    message: notification.message,
    body: notification.body,
    href: notification.href,
    isRead: notification.isRead,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    userId: notification.userId,
    businessId: notification.businessId,
    createdAt: notification.createdAt.toISOString(),
  };
}

@ApiTags('Notifications')
@Controller('')
export class NotificationController {
  constructor(
    private readonly notificationUsecasesFactory: NotificationUsecasesFactory,
    private readonly securityContext: SecurityContext,
  ) {}

  @FindNotificationsDocs()
  @Get(NOTIFICATION_ENDPOINTS.FIND_ALL)
  async findNotifications(
    @Res({ passthrough: true }) res: Response,
    @Query() query: FindNotificationsDto,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<FindNotificationsResponse>
  > {
    const result =
      await this.notificationUsecasesFactory.findNotificationsUsecase.execute({
        callerUserId: this.securityContext.userId,
        callerBusinessId: this.securityContext.businessId,
        onlyUnread: query.onlyUnread,
      });

    if (!result.ok) {
      const errorResponse = mapNotificationError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<FindNotificationsResponse>(
      result.value.map(toNotificationResponse),
      HttpStatus.OK,
    );
  }

  @MarkNotificationAsReadDocs()
  @Patch(NOTIFICATION_ENDPOINTS.MARK_AS_READ)
  async markNotificationAsRead(
    @Res({ passthrough: true }) res: Response,
    @Param('notificationId') notificationId: string,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<MarkNotificationAsReadResponse>
  > {
    const result =
      await this.notificationUsecasesFactory.markNotificationAsReadUsecase.execute(
        {
          id: notificationId,
          callerUserId: this.securityContext.userId,
          callerBusinessId: this.securityContext.businessId,
        },
      );

    if (!result.ok) {
      const errorResponse = mapNotificationError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<MarkNotificationAsReadResponse>(
      { message: 'success' },
      HttpStatus.OK,
    );
  }

  @MarkAllNotificationsAsReadDocs()
  @Patch(NOTIFICATION_ENDPOINTS.MARK_ALL_AS_READ)
  async markAllNotificationsAsRead(
    @Res({ passthrough: true }) res: Response,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<MarkAllNotificationsAsReadResponse>
  > {
    const result =
      await this.notificationUsecasesFactory.markAllNotificationsAsReadUsecase.execute(
        {
          callerUserId: this.securityContext.userId,
          callerBusinessId: this.securityContext.businessId,
        },
      );

    if (!result.ok) {
      const errorResponse = mapNotificationError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<MarkAllNotificationsAsReadResponse>(
      { message: 'success' },
      HttpStatus.OK,
    );
  }
}
