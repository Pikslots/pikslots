import type { InfrastructureError, Result, UnauthorizedError } from '../../shared';
import type { Session } from '../session.entity';

export const IGetSessionsByUserIdUseCase = Symbol('IGetSessionsByUserIdUseCase');

export interface GetSessionsByUserIdUseCase {
  execute(userId: string): Promise<Result<Session[], UnauthorizedError | InfrastructureError>>;
}
