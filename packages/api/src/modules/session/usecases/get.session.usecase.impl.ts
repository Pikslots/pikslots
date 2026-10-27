import { Inject, Injectable } from '@nestjs/common';
import {
  err,
  GetSessionUseCase,
  InfrastructureError,
  ISessionRepository,
  ok,
  Result,
  Session,
  SessionNotFound,
} from '@pikslots/domain';
import type { SessionRepository } from '@pikslots/domain';
import { SessionCacheService } from 'src/shared/cache/otp/session.cache.service';

const SESSION_NOT_FOUND = (id: string): SessionNotFound => ({
  kind: 'session_not_found',
  message: 'failed to find session',
  by: 'id',
  value: id,
  timestamp: new Date(),
});

@Injectable()
export class GetSessionUseCaseImpl implements GetSessionUseCase {
  constructor(
    @Inject(ISessionRepository)
    private readonly sessionRepository: SessionRepository,
    private readonly sessionCacheService: SessionCacheService,
  ) {}

  async execute(
    id: string,
  ): Promise<Result<Session, SessionNotFound | InfrastructureError>> {
    const cached = await this.sessionCacheService.get(id);

    if (cached) return ok(cached);

    const found = await this.sessionRepository.findById(id);

    if (!found.ok) return err(found.error);
    if (found.value.isExpired()) return err(SESSION_NOT_FOUND(id));

    await this.sessionCacheService.save(found.value);

    return ok(found.value);
  }
}
