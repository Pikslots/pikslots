import {
  err,
  InfrastructureError,
  ok,
  Result,
  Session,
  SessionNotFound,
  SessionRepository,
} from '@pikslots/domain';
import { SESSION_TEST_DATA } from './session.test.data';

export class SessionRepositoryTestImpl implements SessionRepository {
  async save(session: Session): Promise<Result<void, InfrastructureError>> {
    try {
      await Promise.resolve('');
      SESSION_TEST_DATA.push(session);
      return ok(undefined);
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to save session',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findById(
    id: string,
  ): Promise<Result<Session, SessionNotFound | InfrastructureError>> {
    await Promise.resolve('');
    const found = SESSION_TEST_DATA.find((session) => session.id === id);

    if (!found || found.isExpired()) {
      return err<SessionNotFound>({
        kind: 'session_not_found',
        message: 'Session not found',
        by: 'id',
        value: id,
        timestamp: new Date(),
      });
    }

    return ok(found);
  }

  async findAllByUserId(
    userId: string,
  ): Promise<Result<Session[], InfrastructureError>> {
    await Promise.resolve('');
    return ok(SESSION_TEST_DATA.filter((session) => session.userId === userId));
  }

  async delete(
    id: string,
  ): Promise<Result<void, SessionNotFound | InfrastructureError>> {
    await Promise.resolve('');
    const index = SESSION_TEST_DATA.findIndex((session) => session.id === id);

    if (index === -1) {
      return err<SessionNotFound>({
        kind: 'session_not_found',
        message: 'Session not found',
        by: 'id',
        value: id,
        timestamp: new Date(),
      });
    }

    SESSION_TEST_DATA.splice(index, 1);
    return ok(undefined);
  }
}
