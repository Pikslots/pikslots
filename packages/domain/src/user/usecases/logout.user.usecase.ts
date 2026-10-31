import type { InfrastructureError, Result } from '../../shared';
import type { SessionNotFound } from '../../session/errors';

export interface LogoutUserCommand {
  sessionId: string;
}

export const ILogoutUserUseCase = Symbol('ILogoutUserUseCase');

export interface LogoutUserUseCase {
  execute(command: LogoutUserCommand): Promise<Result<void, SessionNotFound | InfrastructureError>>;
}
