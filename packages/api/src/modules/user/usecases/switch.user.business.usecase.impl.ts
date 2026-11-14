import { Inject, Injectable } from '@nestjs/common';
import {
  BusinessNotFoundError,
  IBusinessRepository,
  InfrastructureError,
  ISessionRepository,
  IUserRepository,
  Result,
  SwitchUserBusinessCommand,
  SwitchUserBusinessUseCase,
  UnauthorizedError,
  User,
  UserNotFoundError,
  err,
  ok,
} from '@pikslots/domain';
import type {
  BusinessRepository,
  SessionRepository,
  UserRepository,
} from '@pikslots/domain';
import { SessionCacheService } from 'src/shared/cache/session/session.cache.service';
import { SecurityContext } from 'src/shared/security/context/security.context';

@Injectable()
export class SwitchUserBusinessUseCaseImpl implements SwitchUserBusinessUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: UserRepository,
    @Inject(IBusinessRepository)
    private readonly businessRepository: BusinessRepository,
    @Inject(ISessionRepository)
    private readonly sessionRepository: SessionRepository,
    private readonly sessionCacheService: SessionCacheService,
    private readonly securityContext: SecurityContext,
  ) {}

  async execute(
    command: SwitchUserBusinessCommand,
  ): Promise<
    Result<
      User,
      | UserNotFoundError
      | BusinessNotFoundError
      | UnauthorizedError
      | InfrastructureError
    >
  > {
    if (
      this.securityContext.role !== 'Platform Owner' ||
      this.securityContext.userId !== command.userId
    ) {
      return err<UnauthorizedError>({
        kind: 'unauthorized',
        message: 'Only a authorized can switch businesses!',
        timestamp: new Date(),
      });
    }

    const userResult = await this.userRepository.findById(command.userId);

    if (!userResult.ok) {
      return err(userResult.error as InfrastructureError);
    }

    if (!userResult.value) {
      return err<UserNotFoundError>({
        kind: 'user_not_found',
        by: 'id',
        value: command.userId,
        message: `User not found against ${command.userId}`,
        timestamp: new Date(),
      });
    }

    const user = userResult.value;

    if (user.role !== 'Platform Owner') {
      return err<UnauthorizedError>({
        kind: 'unauthorized',
        message: 'Only a authorized can switch businesses',
        timestamp: new Date(),
      });
    }

    const businessResult = await this.businessRepository.findById(
      command.businessId,
    );

    if (!businessResult.ok) {
      return err(businessResult.error as InfrastructureError);
    }

    if (!businessResult.value) {
      return err<BusinessNotFoundError>({
        kind: 'business_not_found',
        by: 'id',
        value: command.businessId,
        message: `Business not found against ${command.businessId}`,
        timestamp: new Date(),
      });
    }

    const updated = user.assignBusiness(
      command.businessId,
      this.securityContext.userId,
    );

    const userUpdateResult = await this.userRepository.update(updated);

    if (!userUpdateResult.ok) return err(userUpdateResult.error);

    const sessionsResult = await this.sessionRepository.findAllByUserId(
      updated.id,
    );

    if (!sessionsResult.ok) return err(sessionsResult.error);

    for (const session of sessionsResult.value) {
      if (session.isExpired()) continue;

      const updatedSession = session.assignBusiness(command.businessId);
      const sessionUpdateResult =
        await this.sessionRepository.update(updatedSession);

      if (!sessionUpdateResult.ok) {
        if (sessionUpdateResult.error.kind === 'infrastructure') {
          return err(sessionUpdateResult.error);
        }
        continue;
      }

      await this.sessionCacheService.save(updatedSession);
    }

    return ok(updated);
  }
}
