import type { InfrastructureError, Result, UnauthorizedError } from '../../shared';
import type { FindAuditLogsFilter } from '../repository';
import type { AuditLogWithUser } from '../read-models';

export type FindAuditLogsCommand = FindAuditLogsFilter;

export const IFindAuditLogsUseCase = Symbol('IFindAuditLogsUseCase');

export interface FindAuditLogsUseCase {
  execute(
    command: FindAuditLogsCommand,
  ): Promise<Result<AuditLogWithUser[], UnauthorizedError | InfrastructureError>>;
}
