import { Inject, Injectable } from '@nestjs/common';
import {
  ISessionRepository,
  LogoutUserUseCase,
  InfrastructureError,
  Result,
  SessionNotFound,
} from '@pikslots/domain';
import type { LogoutUserCommand, SessionRepository } from '@pikslots/domain';
import { SessionCacheService } from 'src/shared/cache/session/session.cache.service';

@Injectable()
export class LogoutUserUseCaseImpl implements LogoutUserUseCase {
  constructor(
    @Inject(ISessionRepository)
    private readonly sessionRepository: SessionRepository,
    private readonly sessionCacheService: SessionCacheService,
  ) {}

  async execute(
    command: LogoutUserCommand,
  ): Promise<Result<void, SessionNotFound | InfrastructureError>> {
    const deleted = await this.sessionRepository.delete(command.sessionId);

    await this.sessionCacheService.remove(command.sessionId);

    return deleted;
  }
}
