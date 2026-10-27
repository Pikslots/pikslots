import { Inject, Injectable } from '@nestjs/common';
import {
  DeleteSessionUseCase,
  InfrastructureError,
  ISessionRepository,
  Result,
  SessionNotFound,
} from '@pikslots/domain';
import type { SessionRepository } from '@pikslots/domain';
import { SessionCacheService } from 'src/shared/cache/otp/session.cache.service';

@Injectable()
export class DeleteSessionUseCaseImpl implements DeleteSessionUseCase {
  constructor(
    @Inject(ISessionRepository)
    private readonly sessionRepository: SessionRepository,
    private readonly sessionCacheService: SessionCacheService,
  ) {}

  async execute(
    id: string,
  ): Promise<Result<void, SessionNotFound | InfrastructureError>> {
    const result = await this.sessionRepository.delete(id);

    await this.sessionCacheService.remove(id);

    return result;
  }
}
