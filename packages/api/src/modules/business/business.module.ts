import { Module } from '@nestjs/common';
import { IBusinessRepository } from '@pikslots/domain';
import { BUSINESS_USECASES } from './usecases';
import { BusinessUseCaseFactory } from './factroy/business.usecases.factory';
import { BusinessController } from './business.controller';
import { BusinessRepositoryImpl } from './repository/business.repository.impl';
import { BUSINESS_EVENTS } from './events';
import { AuditLogInterceptor } from '../audit-log/interceptors/audit.log.interceptor';

@Module({
  providers: [
    { useClass: BusinessRepositoryImpl, provide: IBusinessRepository },
    ...BUSINESS_USECASES,
    ...BUSINESS_EVENTS,
    AuditLogInterceptor,
    BusinessUseCaseFactory,
  ],
  controllers: [BusinessController],
  exports: [IBusinessRepository],
})
export class BusinessModule {}
