import type { BusinessNotFoundError } from '../../business/errors';
import type { SessionNotFound } from '../../session/errors';
import type { Session } from '../../session/session.entity';
import type { InfrastructureError, Result, UnauthorizedError } from '../../shared';
import type { UserNotFoundError } from '../errors';

export interface SwitchBusinessCommand {
  sessionId: string;
  businessId: string;
}

export type SwitchBusinessError =
  | SessionNotFound
  | UserNotFoundError
  | BusinessNotFoundError
  | UnauthorizedError
  | InfrastructureError;

export const ISwitchBusinessUseCase = Symbol('ISwitchBusinessUseCase');

export interface SwitchBusinessUseCase {
  execute(command: SwitchBusinessCommand): Promise<Result<Session, SwitchBusinessError>>;
}
