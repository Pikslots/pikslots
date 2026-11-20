import type { InfrastructureError, Result } from '../../shared';
import type { InviterNotAuthorizedError, UserAlreadyExistsError } from '../errors';
import type { UserRole } from '../types';

export interface InviteUserCommand {
  email: string;
  username: string;
  name: { firstName: string; lastName: string };
  role: UserRole;
  businessId: string;
  businessName?: string;
  phone?: string;
}

export const IInviteUserUseCase = Symbol('IInviteUserUseCase');

export interface InviteUserUseCase {
  execute(
    command: InviteUserCommand,
  ): Promise<
    Result<
      { message: 'success' },
      UserAlreadyExistsError | InviterNotAuthorizedError | InfrastructureError
    >
  >;
}
