import type { InfrastructureError, Result } from '../../shared';
import type { SessionNotFound } from '../errors';
import type { Session } from '../session.entity';

export interface SessionRepository {
  save(session: Session): Promise<Result<void, InfrastructureError>>;
  findById(id: string): Promise<Result<Session, SessionNotFound | InfrastructureError>>;
  findAllByUserId(userId: string): Promise<Result<Session[], InfrastructureError>>;
  delete(id: string): Promise<Result<void, SessionNotFound | InfrastructureError>>;
}

export const ISessionRepository = Symbol('ISessionRepository');
