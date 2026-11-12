import { HttpStatus } from '@nestjs/common';
import type {
  InfrastructureError,
  NotificationNotFoundError,
  UnauthorizedError,
} from '@pikslots/domain';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';

type NotificationError =
  | NotificationNotFoundError
  | UnauthorizedError
  | InfrastructureError;

const notificationErrorMap: Record<
  NotificationError['kind'],
  (error: NotificationError) => PikslotsBaseErrorResponse
> = {
  notification_not_found: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.NOT_FOUND),
  unauthorized: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.UNAUTHORIZED),
  infrastructure: () =>
    new PikslotsBaseErrorResponse(
      'Something went wrong. Please try again later.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    ),
};

export function mapNotificationError(
  error: NotificationError,
): PikslotsBaseErrorResponse {
  return notificationErrorMap[error.kind](error);
}
