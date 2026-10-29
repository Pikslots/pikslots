import { HttpStatus } from '@nestjs/common';
import {
  InfrastructureError,
  SessionNotFound,
  UnauthorizedError,
} from '@pikslots/domain';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';

type SessionError = SessionNotFound | UnauthorizedError | InfrastructureError;

const sessionErrorMap: Record<
  SessionError['kind'],
  (error: SessionError) => PikslotsBaseErrorResponse
> = {
  session_not_found: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.NOT_FOUND),
  unauthorized: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.UNAUTHORIZED),
  infrastructure: () =>
    new PikslotsBaseErrorResponse(
      'Something went wrong. Please try again later.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    ),
};

export function mapSessionError(
  error: SessionError,
): PikslotsBaseErrorResponse {
  return sessionErrorMap[error.kind](error);
}
