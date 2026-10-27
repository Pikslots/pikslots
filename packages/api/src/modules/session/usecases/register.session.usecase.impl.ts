import { Inject, Injectable } from '@nestjs/common';
import {
  err,
  InfrastructureError,
  ISessionRepository,
  ok,
  RegisterSessionCommand,
  RegisterSessionUseCase,
  Result,
  Session,
} from '@pikslots/domain';
import type { SessionRepository } from '@pikslots/domain';
import { v7 as uuidv7 } from 'uuid';
import { SessionCacheService } from 'src/shared/cache/otp/session.cache.service';

const SESSION_TTL_SECONDS = 604800;

@Injectable()
export class RegisterSessionUseCaseImpl implements RegisterSessionUseCase {
  constructor(
    @Inject(ISessionRepository)
    private readonly sessionRepository: SessionRepository,
    private readonly sessionCacheService: SessionCacheService,
  ) {}

  async execute(
    command: RegisterSessionCommand,
  ): Promise<Result<Session, InfrastructureError>> {
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_SECONDS * 1000);

    const session = Session.create({
      id: uuidv7(),
      userId: command.userId,
      role: command.role,
      businessId: command.businessId,
      issuedAt,
      expiresAt,
    });

    const saved = await this.sessionRepository.save(session);

    if (!saved.ok) return err(saved.error);

    await this.sessionCacheService.save(session);

    return ok(session);
  }
}
