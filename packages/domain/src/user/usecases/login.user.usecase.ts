import type { InfrastructureError, UnauthorizedError, Result } from '../../shared';
import type {
  UserInactiveError,
  UserInvitedError,
  UserNoAccessError,
  UserSuspendedError,
} from '../errors';

export interface LoginUserCommand {
  usernameOrEmail: string;
  password: string;
  country: string;
  os: string;
  browser: string;
}

export const ILoginUserUseCase = Symbol('ILoginUserUseCase');

export interface LoginUserUseCase {
  execute(
    command: LoginUserCommand,
  ): Promise<
    Result<
      { sessionId: string },
      | UnauthorizedError
      | UserSuspendedError
      | UserInactiveError
      | UserNoAccessError
      | UserInvitedError
      | InfrastructureError
    >
  >;
}
