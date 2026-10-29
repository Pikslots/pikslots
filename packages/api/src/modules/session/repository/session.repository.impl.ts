import { Inject, Injectable } from '@nestjs/common';
import {
  err,
  InfrastructureError,
  ok,
  Result,
  Session,
  SessionNotFound,
  SessionRepository,
} from '@pikslots/domain';
import { Kysely } from 'kysely';
import { PIKSLOTS_DB } from 'src/shared/database/pikslots.database.module';
import { PikSlotsDatabase } from 'src/shared/database/schema';
import { SessionPersistenceMapper } from '../mappers/session.database.mapper';

@Injectable()
export class SessionRepositoryImpl implements SessionRepository {
  private readonly mapper = new SessionPersistenceMapper();

  constructor(@Inject(PIKSLOTS_DB) readonly db: Kysely<PikSlotsDatabase>) {}

  async save(session: Session): Promise<Result<void, InfrastructureError>> {
    try {
      await this.db
        .insertInto('sessions')
        .values(this.mapper.domainToPersistence(session))
        .execute();
      return ok(undefined);
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to register session',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findById(
    id: string,
  ): Promise<Result<Session, SessionNotFound | InfrastructureError>> {
    try {
      const row = await this.db
        .selectFrom('sessions')
        .selectAll()
        .where('id', '=', id)
        .where('expires_at', '>', new Date())
        .executeTakeFirst();

      if (!row) {
        return err<SessionNotFound>({
          kind: 'session_not_found',
          message: 'Session not found',
          by: 'id',
          timestamp: new Date(),
          value: id,
        });
      }

      return ok(this.mapper.persistenceToDomain(row));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to get session by id',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async findAllByUserId(
    userId: string,
  ): Promise<Result<Session[], InfrastructureError>> {
    try {
      const rows = await this.db
        .selectFrom('sessions')
        .selectAll()
        .where('user_id', '=', userId)
        .orderBy('issued_at', 'desc')
        .execute();

      return ok(rows.map((row) => this.mapper.persistenceToDomain(row)));
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to get sessions by user id',
        timestamp: new Date(),
        cause,
      });
    }
  }

  async delete(
    id: string,
  ): Promise<Result<void, SessionNotFound | InfrastructureError>> {
    try {
      const result = await this.db
        .deleteFrom('sessions')
        .where('id', '=', id)
        .executeTakeFirst();

      if (!result.numDeletedRows || result.numDeletedRows === BigInt(0)) {
        return err<SessionNotFound>({
          kind: 'session_not_found',
          by: 'id',
          value: id,
          message: `Session not found against ${id}`,
          timestamp: new Date(),
        });
      }

      return ok(undefined);
    } catch (cause) {
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to delete session',
        timestamp: new Date(),
        cause,
      });
    }
  }
}
