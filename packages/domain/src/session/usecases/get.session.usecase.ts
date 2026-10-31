import type { InfrastructureError, Result } from '../../shared';
import type { SessionNotFound } from '../errors';
import type { Session } from '../session.entity';

export const IGetSessionUseCase = Symbol('IGetSessionUseCase');

export interface GetSessionUseCase {
  execute(id: string): Promise<Result<Session, SessionNotFound | InfrastructureError>>;
}
