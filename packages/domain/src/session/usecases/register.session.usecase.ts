import type { InfrastructureError, Result } from '../../shared';
import type { UserRole } from '../../user';
import type { Session } from '../session.entity';

export interface RegisterSessionCommand {
  userId: string;
  role: UserRole;
  businessId: string | null;
}

export const IRegisterSessionUseCase = Symbol('IRegisterSessionUseCase');

export interface RegisterSessionUseCase {
  execute(command: RegisterSessionCommand): Promise<Result<Session, InfrastructureError>>;
}
