import { HttpStatus } from '@nestjs/common';
import {
  type InfrastructureError,
  type InviteAlreadyAcceptedError,
  type InvalidOtpError,
  type InviterNotAuthorizedError,
  type RoleQueryNotAuthorizedError,
  type UnauthorizedError,
  type UserAlreadyExistsError,
  type UserNotFoundError,
  type UserNoAccessError,
  type UserSuspendedError,
  type UserInactiveError,
  type ValidationError,
  type WorkingHoursUpdateNotAuthorizedError,
  UserInvitedError,
  type BusinessNotFoundError,
  type SessionNotFound,
} from '@pikslots/domain';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';

type UserError =
  | UserAlreadyExistsError
  | InviterNotAuthorizedError
  | RoleQueryNotAuthorizedError
  | UnauthorizedError
  | UserNotFoundError
  | UserInactiveError
  | UserNoAccessError
  | UserSuspendedError
  | UserInvitedError
  | WorkingHoursUpdateNotAuthorizedError
  | InvalidOtpError
  | InviteAlreadyAcceptedError
  | InfrastructureError
  | ValidationError
  | BusinessNotFoundError
  | SessionNotFound;

const userErrorMap: Record<
  UserError['kind'],
  (error: UserError) => PikslotsBaseErrorResponse
> = {
  user_already_exists: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.CONFLICT),
  inviter_not_authorized: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.FORBIDDEN),
  role_query_not_authorized: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.FORBIDDEN),
  working_hours_update_not_authorized: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.FORBIDDEN),
  user_not_found: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.NOT_FOUND),
  user_suspended: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.FORBIDDEN),
  user_invited: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.FORBIDDEN),
  user_inactive: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.FORBIDDEN),
  user_no_access: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.FORBIDDEN),
  unauthorized: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.UNAUTHORIZED),
  validation: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.BAD_REQUEST),
  invalid_otp: (error) =>
    new PikslotsBaseErrorResponse(
      error.message,
      HttpStatus.UNPROCESSABLE_ENTITY,
    ),
  invite_already_accepted: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.CONFLICT),
  business_not_found: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.NOT_FOUND),
  session_not_found: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.UNAUTHORIZED),
  infrastructure: () =>
    new PikslotsBaseErrorResponse(
      'Something went wrong. Please try again later.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    ),
};

export function mapUserError(error: UserError): PikslotsBaseErrorResponse {
  return userErrorMap[error.kind](error);
}
