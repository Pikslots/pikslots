import { Module } from '@nestjs/common';
import { ServiceController } from './service.controller';
import { ServiceUseCasesFactory } from './factory/service.usecases.factory';
import { SERVICE_USECASES } from './usecases';
import { ServiceRepositoryImpl } from './repository/service.repository.impl';
import { IServiceRepository } from '@pikslots/domain';
import { AuditLogInterceptor } from '../audit-log/interceptors/audit.log.interceptor';

@Module({
  imports: [],
  controllers: [ServiceController],
  providers: [
    ServiceUseCasesFactory,
    ...SERVICE_USECASES,
    { useClass: ServiceRepositoryImpl, provide: IServiceRepository },
    AuditLogInterceptor,
  ],
  exports: [IServiceRepository],
})
export class ServiceModule {}
