import { Module } from '@nestjs/common';
import { IAuditLogRepository } from '@pikslots/domain';
import { AuditLogRepositoryImpl } from './repository/audit.log.repository.impl';
import { AUDIT_LOG_USECASES } from './usecases';
import { AUDIT_LOG_EVENTS } from './events';
import { AuditLogController } from './audit.log.controller';
import { AuditLogUsecasesFactory } from './factory/audit.log.usecases.factory';

@Module({
  imports: [],
  controllers: [AuditLogController],
  providers: [
    { useClass: AuditLogRepositoryImpl, provide: IAuditLogRepository },
    ...AUDIT_LOG_USECASES,
    ...AUDIT_LOG_EVENTS,
    AuditLogUsecasesFactory,
  ],
  exports: [IAuditLogRepository],
})
export class AuditLogModule {}
