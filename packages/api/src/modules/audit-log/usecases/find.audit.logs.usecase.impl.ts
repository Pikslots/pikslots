import { Inject, Injectable } from '@nestjs/common';
import {
  AuditLog,
  AuditLogUser,
  AuditLogWithUser,
  err,
  FindAuditLogsCommand,
  FindAuditLogsUseCase,
  IAuditLogRepository,
  InfrastructureError,
  IUserRepository,
  ok,
  Result,
  UnauthorizedError,
} from '@pikslots/domain';
import type { AuditLogRepository, UserRepository } from '@pikslots/domain';
import { SecurityContext } from 'src/shared/security/context/security.context';

const UNAUTHORIZED_ERROR: UnauthorizedError = {
  kind: 'unauthorized',
  message: 'Can not view audit logs : unauthorized!!!',
  timestamp: new Date(),
};

@Injectable()
export class FindAuditLogsUseCaseImpl implements FindAuditLogsUseCase {
  constructor(
    @Inject(IAuditLogRepository)
    private readonly auditLogRepository: AuditLogRepository,
    @Inject(IUserRepository)
    private readonly userRepository: UserRepository,
    private readonly securityContext: SecurityContext,
  ) {}

  async execute(
    command: FindAuditLogsCommand,
  ): Promise<
    Result<AuditLogWithUser[], UnauthorizedError | InfrastructureError>
  > {
    const callerRole = this.securityContext.role;

    const isPartOfSameBusiness =
      this.securityContext.businessId === command.businessId;

    if (!AuditLog.canViewAuditLogs(callerRole, isPartOfSameBusiness))
      return err(UNAUTHORIZED_ERROR);

    const auditLogsResult = await this.auditLogRepository.findAll(command);

    if (!auditLogsResult.ok) return auditLogsResult;

    const auditLogs = auditLogsResult.value;

    // fetch every distinct actor in one query instead of one per log
    const userIds = [...new Set(auditLogs.map((log) => log.userId))];

    const usersResult = await this.userRepository.findAllByIds(userIds);

    if (!usersResult.ok) return usersResult;

    const usersById = new Map<string, AuditLogUser>(
      usersResult.value.map((user) => [
        user.id,
        {
          id: user.id,
          firstName: user.name.firstName,
          lastName: user.name.lastName,
          email: user.email,
          username: user.username,
        },
      ]),
    );

    return ok(
      auditLogs.map((auditLog) => ({
        auditLog,
        user: usersById.get(auditLog.userId) ?? null,
      })),
    );
  }
}
