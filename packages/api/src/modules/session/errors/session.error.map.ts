import { HttpStatus } from '@nestjs/common';
import { InfrastructureError, SessionNotFound } from '@pikslots/domain';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';

type SessionError = SessionNotFound | InfrastructureError;

const sessionErrorMap: Record<
  SessionError['kind'],
  (error: SessionError) => PikslotsBaseErrorResponse
> = {
  session_not_found: (error) =>
    new PikslotsBaseErrorResponse(error.message, HttpStatus.NOT_FOUND),
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
