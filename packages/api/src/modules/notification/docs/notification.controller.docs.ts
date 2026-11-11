import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';

const NOTIFICATION_EXAMPLE = {
  id: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
  kind: 'booking',
  iconClassName: 'calendar-check',
  title: 'New booking',
  message: 'A new booking was created',
  body: [],
  href: '/bookings/BK3KX9M2P',
  isRead: false,
  readAt: null,
  userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7c',
  businessId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7d',
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const FindNotificationsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: "List the caller's notifications",
      description:
        'Returns notifications addressed directly to the caller, plus any broadcast to their business.',
    }),
    ApiQuery({
      name: 'onlyUnread',
      required: false,
      description: 'Return only unread notifications',
      example: true,
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Notifications retrieved successfully',
      schema: {
        example: {
          data: [NOTIFICATION_EXAMPLE],
          statusCode: 200,
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Caller is not authenticated',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Infrastructure failure',
      type: PikslotsBaseErrorResponse,
    }),
  );

export const MarkNotificationAsReadDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Mark a notification as read' }),
    ApiParam({
      name: 'notificationId',
      description: 'Notification ID',
      example: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Notification marked as read',
      schema: {
        example: {
          data: { message: 'success' },
          statusCode: 200,
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Notification not found',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Caller is not authorized to mark this notification as read',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Infrastructure failure',
      type: PikslotsBaseErrorResponse,
    }),
  );

export const MarkAllNotificationsAsReadDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: "Mark all of the caller's notifications as read",
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Notifications marked as read',
      schema: {
        example: {
          data: { message: 'success' },
          statusCode: 200,
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Caller is not authenticated',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Infrastructure failure',
      type: PikslotsBaseErrorResponse,
    }),
  );
