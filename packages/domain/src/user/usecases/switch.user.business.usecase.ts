import type { BusinessNotFoundError } from '../../business/errors';
import type { InfrastructureError, Result, UnauthorizedError } from '../../shared';
import type { UserNotFoundError } from '../errors';
import type { User } from '../user.entity';

export interface SwitchUserBusinessCommand {
  userId: string;
  businessId: string;
}

export const ISwitchUserBusinessUseCase = Symbol('ISwitchUserBusinessUseCase');

export interface SwitchUserBusinessUseCase {
  execute(
    command: SwitchUserBusinessCommand,
  ): Promise<
    Result<
      User,
      UserNotFoundError | BusinessNotFoundError | UnauthorizedError | InfrastructureError
    >
  >;
}
