import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  err,
  InfrastructureError,
  InviteUserCommand,
  InviteUserUseCase,
  InviterNotAuthorizedError,
  IUserRepository,
  ok,
  Result,
  User,
  UserAlreadyExistsError,
} from '@pikslots/domain';
import type { AuditLogJobDataShape, UserRepository } from '@pikslots/domain';
import { InviteJwtPayload } from '@pikslots/shared';
import { Queue } from 'bullmq';
import { Env } from 'src/shared/config/env';
import { PikslotEmailService } from 'src/shared/email/pikslot.email.service';
import { SecurityContext } from 'src/shared/security/context/security.context';
import { JwtInviteService } from 'src/shared/security/jwt/jwt.invite.service';
import {
  AUDIT_LOG_QUEUE,
  PIKSLOT_EVENTS,
} from 'src/shared/queue/jobs/pikslot.events';
import type { AuditLogJobName } from 'src/shared/queue/jobs';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class InviteUserUsecaseImpl implements InviteUserUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: UserRepository,
    private readonly securityContext: SecurityContext,
    private readonly emailService: PikslotEmailService,
    private readonly jwtInviteService: JwtInviteService,
    private readonly configService: ConfigService<Env, true>,
    @InjectQueue(AUDIT_LOG_QUEUE)
    private readonly auditLogQueue: Queue<
      AuditLogJobDataShape,
      void,
      AuditLogJobName
    >,
  ) {}

  async execute(
    command: InviteUserCommand,
  ): Promise<
    Result<
      { message: 'success' },
      UserAlreadyExistsError | InviterNotAuthorizedError | InfrastructureError
    >
  > {
    const inviterRole = this.securityContext.role;

    if (!User.canInviteRole(inviterRole, command.role))
      return err<InviterNotAuthorizedError>({
        kind: 'inviter_not_authorized',
        message: `Role '${inviterRole}' is not allowed to invite users with role '${command.role}'`,
        inviterRole: this.securityContext.role,
        attemptedRole: command.role,
        timestamp: new Date(),
      });

    const businessId = command.businessId ?? this.securityContext.businessId;

    if (!businessId) {
      return err<InviterNotAuthorizedError>({
        kind: 'inviter_not_authorized',
        message: 'The inviter is not attached to a business',
        inviterRole,
        attemptedRole: command.role,
        timestamp: new Date(),
      });
    }

    const emailExists = await this.userRepository.existsByEmail(command.email);

    if (!emailExists.ok) return err(emailExists.error);

    if (emailExists.value) {
      return err<UserAlreadyExistsError>({
        kind: 'user_already_exists',
        message: 'A user with this email already exists',
        field: 'email',
        timestamp: new Date(),
      });
    }

    const usernameExists = await this.userRepository.existsByUsername(
      command.username,
    );
    if (!usernameExists.ok) return err(usernameExists.error);
    if (usernameExists.value) {
      return err<UserAlreadyExistsError>({
        kind: 'user_already_exists',
        message: 'A user with this username already exists',
        field: 'username',
        timestamp: new Date(),
      });
    }

    const user: User = User.create({
      id: uuidv7(),
      username: command.username,
      password: '', // set by the user when accepting the invite
      name: command.name,
      email: command.email,
      phone: command.phone,
      role: command.role,
      businessId,
      bookingUrl: '', // contruct the booking url later
      createdBy: this.securityContext.userId, // the id of the logged in user acting as inviter
    });

    const saved = await this.userRepository.save(user);

    if (!saved.ok) return err(saved.error);

    // send invite only when not following roles : business owner ,no access
    if (
      command.businessName &&
      (user.role === 'Enhanced' ||
        user.role === 'Admin' ||
        user.role === 'Standard')
    ) {
      const result = await this.emailService.sendEmail({
        to: user.email,
        subject: 'Welcome to Pikslots',
        template: 'user-invite',
        context: {
          firstName: user.name.firstName,
          businessName: command.businessName,
          acceptUrl: this.buildInviteUrl(user.id, businessId),
        },
      });

      if (!result.ok) throw new Error(result.error.message);
    }

    await this.logUserInvitedAudit(user);

    return ok({ message: 'success' });
  }

  private async logUserInvitedAudit(user: User): Promise<void> {
    const payload: AuditLogJobDataShape = {
      businessId: user.businessId,
      userId: this.securityContext.userId,
      userType: 'user',
      action: PIKSLOT_EVENTS.AUDIT_LOG.USER_INVITED,
      description: `${user.name.firstName} ${user.name.lastName} (${user.email}) was invited`,
      entityType: 'user',
      entityId: user.id,
      occurredAt: new Date().toISOString(),
    };

    await this.auditLogQueue.add(
      PIKSLOT_EVENTS.AUDIT_LOG.USER_INVITED,
      payload,
    );
  }

  private buildInviteUrl(userId: string, businessId: string): string {
    const token = this.jwtInviteService.signInviteToken<InviteJwtPayload>({
      userId,
      businessId,
    });

    const frontendUrl = this.configService.getOrThrow('FRONTEND_PUBLIC_URL', {
      infer: true,
    });
    return `${frontendUrl}/user-invite?jid=${token}`;
  }
}
