import { forwardRef, Module } from '@nestjs/common';
import { UserRepositoryImpl } from './repository/user.repository.impl';
import { IUserRepository } from '@pikslots/domain';
import { UserController } from './user.controller';
import { USER_USECASES } from './usecases';
import { UserUsecasesFactory } from './factory/user.usecases.factory';
import { USER_EVENTS } from './events';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [forwardRef(() => SessionModule)],
  controllers: [UserController],
  providers: [
    { useClass: UserRepositoryImpl, provide: IUserRepository },
    ...USER_USECASES,
    UserUsecasesFactory,
    ...USER_EVENTS,
  ],
  exports: [IUserRepository],
})
export class UserModule {}
