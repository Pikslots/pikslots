import { Inject, Injectable } from '@nestjs/common';
import {
  DeleteSessionUseCase,
  err,
  InfrastructureError,
  ISessionRepository,
  Result,
  Session,
  SessionNotFound,
  UnauthorizedError,
} from '@pikslots/domain';
import type { SessionRepository } from '@pikslots/domain';
import { SessionCacheService } from 'src/shared/cache/session/session.cache.service';
import { SecurityContext } from 'src/shared/security/context/security.context';

const UNAUTHORIZED_ERROR: UnauthorizedError = {
  kind: 'unauthorized',
  message: 'You are not allowed to delete this session',
  timestamp: new Date(),
};

@Injectable()
export class DeleteSessionUseCaseImpl implements DeleteSessionUseCase {
  constructor(
    @Inject(ISessionRepository)
    private readonly sessionRepository: SessionRepository,
    private readonly sessionCacheService: SessionCacheService,
    private readonly securityContext: SecurityContext,
  ) {}

  async execute(
    id: string,
  ): Promise<
    Result<void, SessionNotFound | UnauthorizedError | InfrastructureError>
  > {
    const { role, userId, businessId } = this.securityContext;

    const existing = await this.sessionRepository.findById(id);
    if (!existing.ok) return err(existing.error);

    const isSelf = existing.value.userId === userId;
    const isPartOfSameBusiness = existing.value.businessId === businessId;

    if (!Session.canRemoveSession(role, isSelf, isPartOfSameBusiness)) {
      return err(UNAUTHORIZED_ERROR);
    }

    const result = await this.sessionRepository.delete(id);

    await this.sessionCacheService.remove(id);

    return result;
  }
}
