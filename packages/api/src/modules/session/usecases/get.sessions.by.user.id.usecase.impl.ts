import { Inject, Injectable } from '@nestjs/common';
import {
  err,
  GetSessionsByUserIdUseCase,
  InfrastructureError,
  ISessionRepository,
  IUserRepository,
  Result,
  Session,
  UnauthorizedError,
} from '@pikslots/domain';
import type { SessionRepository, UserRepository } from '@pikslots/domain';
import { SecurityContext } from 'src/shared/security/context/security.context';

const UNAUTHORIZED_ERROR: UnauthorizedError = {
  kind: 'unauthorized',
  message: 'You are not allowed to view sessions for this user',
  timestamp: new Date(),
};

@Injectable()
export class GetSessionsByUserIdUseCaseImpl implements GetSessionsByUserIdUseCase {
  constructor(
    @Inject(ISessionRepository)
    private readonly sessionRepository: SessionRepository,
    @Inject(IUserRepository) private readonly userRepository: UserRepository,
    private readonly securityContext: SecurityContext,
  ) {}

  async execute(
    userId: string,
  ): Promise<Result<Session[], UnauthorizedError | InfrastructureError>> {
    const callerRole = this.securityContext.role;
    let isPartOfSameBusiness = false;

    if (callerRole === 'Business Owner' || callerRole === 'Admin') {
      const targetUser = await this.userRepository.findById(userId);

      if (!targetUser.ok) {
        if (targetUser.error.kind === 'infrastructure') {
          return err(targetUser.error);
        }
        return err(UNAUTHORIZED_ERROR);
      }

      isPartOfSameBusiness =
        !!targetUser.value &&
        targetUser.value.businessId === this.securityContext.businessId;
    }

    if (!Session.canViewSessionsForUser(callerRole, isPartOfSameBusiness)) {
      return err(UNAUTHORIZED_ERROR);
    }

    return this.sessionRepository.findAllByUserId(userId);
  }
}
