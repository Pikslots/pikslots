import { Module } from '@nestjs/common';
import { ISessionRepository } from '@pikslots/domain';
import { SessionController } from './session.controller';
import { SessionRepositoryImpl } from './repository/session.repository.impl';
import { SessionUsecasesFactory } from './factory/session.usecases.factory';
import { SESSION_USECASES } from './usecases';

@Module({
  imports: [],
  controllers: [SessionController],
  providers: [
    SessionUsecasesFactory,
    ...SESSION_USECASES,
    {
      provide: ISessionRepository,
      useClass: SessionRepositoryImpl,
    },
  ],
  exports: [
    {
      provide: ISessionRepository,
      useClass: SessionRepositoryImpl,
    },
  ],
})
export class SessionModule {}
