import type { InfrastructureError, Result, UnauthorizedError } from '../../shared';
import type { SessionNotFound } from '../errors';

export const IDeleteSessionUseCase = Symbol('IDeleteSessionUseCase');

export interface DeleteSessionUseCase {
  execute(
    id: string,
  ): Promise<Result<void, SessionNotFound | UnauthorizedError | InfrastructureError>>;
}
