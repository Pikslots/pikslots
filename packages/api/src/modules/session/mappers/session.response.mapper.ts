import type { Session } from '@pikslots/domain';
import type { SessionResponse } from '@pikslots/shared';

export class SessionResponseMapper {
  static toResponse(session: Session): SessionResponse {
    return {
      id: session.id,
      userId: session.userId,
      role: session.role,
      businessId: session.businessId,
      issuedAt: session.issuedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    };
  }
}
