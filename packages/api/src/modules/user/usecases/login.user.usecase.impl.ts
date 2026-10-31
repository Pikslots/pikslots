import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import {
  err,
  InfrastructureError,
  ISessionRepository,
  IUserRepository,
  LoginUserUseCase,
  ok,
  Result,
  Session,
} from '@pikslots/domain';
import type {
  AuditLogJobDataShape,
  LoginUserCommand,
  SessionRepository,
  UnauthorizedError,
  User,
  UserInactiveError,
  UserInvitedError,
  UserNoAccessError,
  UserRepository,
  UserSuspendedError,
} from '@pikslots/domain';
import { Queue } from 'bullmq';
import { v7 as uuidv7 } from 'uuid';
import { PasswordHashingService } from 'src/shared/security/hashing/password.hashing.service';
import { SessionCacheService } from 'src/shared/cache/session/session.cache.service';
import {
  AUDIT_LOG_QUEUE,
  PIKSLOT_EVENTS,
} from 'src/shared/queue/jobs/pikslot.events';
import type { AuditLogJobName } from 'src/shared/queue/jobs';

const SESSION_TTL_SECONDS = 604800;

type LoginError =
  | UnauthorizedError
  | InfrastructureError
  | UserSuspendedError
  | UserInactiveError
  | UserInvitedError
  | UserNoAccessError;

type LoginResult = Result<{ sessionId: string }, LoginError>;

const ACCESS_DENIED = (): UnauthorizedError => ({
  kind: 'unauthorized',
  message: 'Access denied : please provide valid credentials',
  timestamp: new Date(),
});

const USER_INACTIVE = (): UserInactiveError => ({
  kind: 'user_inactive',
  message: 'User is inactive',
  status: 'inactive',
  timestamp: new Date(),
});

const USER_SUSPENDED = (reason: string): UserSuspendedError => ({
  kind: 'user_suspended',
  reason,
  message: 'User is suspended',
  timestamp: new Date(),
});

const USER_NO_ACCESS = (): UserNoAccessError => ({
  kind: 'user_no_access',
  message:
    'Your account does not have access. Please contact your administrator.',
  timestamp: new Date(),
});

const USER_INVITED_ERROR = (): UserInvitedError => ({
  kind: 'user_invited',
  status: 'invited',
  timestamp: new Date(),
  message: 'You are invited. Please check the email and login from there',
});

@Injectable()
export class LoginUserUseCaseImpl implements LoginUserUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: UserRepository,
    @Inject(ISessionRepository)
    private readonly sessionRepository: SessionRepository,
    private readonly sessionCacheService: SessionCacheService,
    private readonly passwordHashingService: PasswordHashingService,
    @InjectQueue(AUDIT_LOG_QUEUE)
    private readonly auditLogQueue: Queue<
      AuditLogJobDataShape,
      void,
      AuditLogJobName
    >,
  ) {}

  async execute(command: LoginUserCommand): Promise<LoginResult> {
    const user = await this.findUser(command.usernameOrEmail);
    if (!user.ok) return user;

    const passwordMatches = await this.passwordHashingService.compare(
      command.password,
      user.value.password,
    );

    if (!passwordMatches) return err(ACCESS_DENIED());
    if (user.value.role === 'No Access') return err(USER_NO_ACCESS());
    if (user.value.status === 'inactive') return err(USER_INACTIVE());
    if (user.value.status === 'invited') return err(USER_INVITED_ERROR());
    if (user.value.status === 'suspended' && user.value.suspendedReason)
      return err(USER_SUSPENDED(user.value.suspendedReason));

    const session = await this.createSession(user.value, command);

    if (!session.ok) return session;

    await this.logUserLoginAudit(user.value);

    return ok({ sessionId: session.value.id });
  }

  private async createSession(
    user: User,
    command: LoginUserCommand,
  ): Promise<Result<Session, InfrastructureError>> {
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_SECONDS * 1000);

    const session = Session.create({
      id: uuidv7(),
      userId: user.id,
      role: user.role,
      businessId: user.businessId,
      os: command.os,
      browser: command.browser,
      country: command.country,
      issuedAt,
      expiresAt,
    });

    const saved = await this.sessionRepository.save(session);
    if (!saved.ok) return err(saved.error);

    await this.sessionCacheService.save(session);

    return ok(session);
  }

  private async logUserLoginAudit(user: User): Promise<void> {
    const payload: AuditLogJobDataShape = {
      businessId: user.businessId,
      userId: user.id,
      userType: 'user',
      action: PIKSLOT_EVENTS.AUDIT_LOG.USER_LOGIN,
      description: `${user.name.firstName} ${user.name.lastName} (${user.email}) logged in`,
      entityType: 'user',
      entityId: user.id,
      occurredAt: new Date().toISOString(),
    };

    await this.auditLogQueue.add(PIKSLOT_EVENTS.AUDIT_LOG.USER_LOGIN, payload);
  }

  private async findUser(
    usernameOrEmail: string,
  ): Promise<Result<User, LoginError>> {
    const isEmail = usernameOrEmail.includes('@');

    const result = isEmail
      ? await this.userRepository.findByEmail(usernameOrEmail)
      : await this.userRepository.findByUsername(usernameOrEmail);

    // for security should be access denied rather user not found
    if (!result.ok) return err(ACCESS_DENIED());
    if (!result.value) return err(ACCESS_DENIED());

    return ok(result.value);
  }
}
