import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Cacheable } from 'cacheable';
import { Session } from '@pikslots/domain';
import type { UserRole } from '@pikslots/domain';
import { CACHE } from '../cache.tokens';

const SESSION_CACHE_PREFIX = 'session:';

interface SessionCacheRecord {
  id: string;
  userId: string;
  role: UserRole;
  businessId: string | null;
  issuedAt: string;
  expiresAt: string;
}

@Injectable()
export class SessionCacheService {
  private readonly logger = new Logger(SessionCacheService.name);

  constructor(@Inject(CACHE) private readonly cache: Cacheable) {}

  async save(session: Session): Promise<void> {
    const ttlMilliseconds = Math.max(
      1000,
      session.expiresAt.getTime() - Date.now(),
    );

    try {
      await this.cache.set(
        this.cacheKey(session.id),
        {
          id: session.id,
          userId: session.userId,
          role: session.role,
          businessId: session.businessId,
          issuedAt: session.issuedAt.toISOString(),
          expiresAt: session.expiresAt.toISOString(),
        },
        ttlMilliseconds,
      );
    } catch (cause) {
      this.logger.warn(
        `Failed to cache session ${session.id}`,
        cause instanceof Error ? cause.stack : String(cause),
      );
    }
  }

  async remove(sessionId: string): Promise<void> {
    try {
      await this.cache.delete(this.cacheKey(sessionId));
    } catch (cause) {
      this.logger.warn(
        `Failed to delete cached session ${sessionId}`,
        cause instanceof Error ? cause.stack : String(cause),
      );
    }
  }

  async get(sessionId: string): Promise<Session | null> {
    try {
      const record = await this.cache.get<SessionCacheRecord>(
        this.cacheKey(sessionId),
      );

      if (!record) return null;

      const session = Session.reconstitute({
        id: record.id,
        userId: record.userId,
        role: record.role,
        businessId: record.businessId,
        issuedAt: new Date(record.issuedAt),
        expiresAt: new Date(record.expiresAt),
      });

      if (session.isExpired()) {
        await this.remove(sessionId);
        return null;
      }

      return session;
    } catch (cause) {
      this.logger.warn(
        `Failed to read session ${sessionId} from cache`,
        cause instanceof Error ? cause.stack : String(cause),
      );
      return null;
    }
  }

  private cacheKey(id: string): string {
    return `${SESSION_CACHE_PREFIX}${id}`;
  }
}
