import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import {
  err,
  IBusinessRepository,
  ISessionRepository,
  IUserRepository,
  ok,
  Result,
  Session,
  SwitchBusinessUseCase,
  User,
} from '@pikslots/domain';
import type {
  AuditLogJobDataShape,
  BusinessNotFoundError,
  BusinessRepository,
  SessionRepository,
  SwitchBusinessCommand,
  SwitchBusinessError,
  UnauthorizedError,
  UserNotFoundError,
  UserRepository,
} from '@pikslots/domain';
import { Queue } from 'bullmq';
import { v7 as uuidv7 } from 'uuid';
import { SessionCacheService } from 'src/shared/cache/session/session.cache.service';
import {
  AUDIT_LOG_QUEUE,
  PIKSLOT_EVENTS,
} from 'src/shared/queue/jobs/pikslot.events';
import type { AuditLogJobName } from 'src/shared/queue/jobs';
import { SESSION_TTL_SECONDS } from 'src/shared/security/session.constants';

const SWITCH_NOT_ALLOWED = (): UnauthorizedError => ({
  kind: 'unauthorized',
  message: 'Only the platform owner can switch business',
  timestamp: new Date(),
});

const USER_NOT_FOUND = (id: string): UserNotFoundError => ({
  kind: 'user_not_found',
  message: `User not found against ${id}`,
  by: 'id',
  value: id,
  timestamp: new Date(),
});

const BUSINESS_NOT_FOUND = (id: string): BusinessNotFoundError => ({
  kind: 'business_not_found',
  message: `Business not found against ${id}`,
  by: 'id',
  value: id,
  timestamp: new Date(),
});

@Injectable()
export class SwitchBusinessUseCaseImpl implements SwitchBusinessUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: UserRepository,
    @Inject(IBusinessRepository)
    private readonly businessRepository: BusinessRepository,
    @Inject(ISessionRepository)
    private readonly sessionRepository: SessionRepository,
    private readonly sessionCacheService: SessionCacheService,
  ) {}

  async execute(
    command: SwitchBusinessCommand,
  ): Promise<Result<Session, SwitchBusinessError>> {
    const current = await this.sessionRepository.findById(command.sessionId);
    if (!current.ok) return current;

    const user = await this.userRepository.findById(current.value.userId);
    if (!user.ok) return user;
    if (!user.value) return err(USER_NOT_FOUND(current.value.userId));
    if (!User.canSwitchBusiness(user.value.role))
      return err(SWITCH_NOT_ALLOWED());

    const business = await this.businessRepository.findById(command.businessId);
    if (!business.ok) return business;
    if (!business.value) return err(BUSINESS_NOT_FOUND(command.businessId));

    const updated = await this.userRepository.update(
      user.value.assignBusiness(command.businessId, user.value.id),
    );
    if (!updated.ok) return updated;

    // revoke every session of the user (all devices) before issuing the new one
    const existing = await this.sessionRepository.findAllByUserId(
      user.value.id,
    );
    if (!existing.ok) return existing;

    const deleted = await this.sessionRepository.deleteAllByUserId(
      user.value.id,
    );
    if (!deleted.ok) return deleted;

    await this.sessionCacheService.removeMany(
      existing.value.map((session) => session.id),
    );

    const issuedAt = new Date();

    const session = Session.create({
      id: uuidv7(),
      userId: user.value.id,
      role: user.value.role,
      businessId: command.businessId,
      os: current.value.os,
      browser: current.value.browser,
      country: current.value.country,
      issuedAt,
      expiresAt: new Date(issuedAt.getTime() + SESSION_TTL_SECONDS * 1000),
    });

    const saved = await this.sessionRepository.save(session);

    if (!saved.ok) return saved;

    await this.sessionCacheService.save(session);

    return ok(session);
  }
}
