import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { IAuditLogRepository } from '@pikslots/domain';
import { AuditLogRepositoryImpl } from './repository/audit.log.repository.impl';
import { AUDIT_LOG_USECASES } from './usecases';
import { AUDIT_LOG_EVENTS } from './events';
import { AuditLogController } from './audit.log.controller';
import { AuditLogUsecasesFactory } from './factory/audit.log.usecases.factory';
import { AuditLogInterceptor } from './interceptors/audit.log.interceptor';

@Module({
  imports: [],
  controllers: [AuditLogController],
  providers: [
    { useClass: AuditLogRepositoryImpl, provide: IAuditLogRepository },
    ...AUDIT_LOG_USECASES,
    ...AUDIT_LOG_EVENTS,
    AuditLogUsecasesFactory,
    // Global, metadata-gated interceptor: only handlers decorated with
    // @AuditLog() publish events, everything else passes through untouched.
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
  exports: [IAuditLogRepository],
})
export class AuditLogModule {}
