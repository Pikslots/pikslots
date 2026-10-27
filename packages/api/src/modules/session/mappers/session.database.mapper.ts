import type {
  SessionTableInsert,
  SessionTableSelect,
} from 'src/shared/database/schema/session.table';
import { Session } from '@pikslots/domain';

export class SessionPersistenceMapper {
  public persistenceToDomain(row: SessionTableSelect): Session {
    return Session.reconstitute({
      id: row.id,
      userId: row.user_id,
      role: row.role,
      businessId: row.business_id,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
    });
  }

  public domainToPersistence(session: Session): SessionTableInsert {
    return {
      id: session.id,
      user_id: session.userId,
      role: session.role,
      business_id: session.businessId,
      issued_at: session.issuedAt,
      expires_at: session.expiresAt,
    };
  }
}
