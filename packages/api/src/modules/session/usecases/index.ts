import { Provider } from '@nestjs/common';
import {
  IDeleteSessionUseCase,
  IGetSessionUseCase,
  IGetSessionsByUserIdUseCase,
} from '@pikslots/domain';
import { DeleteSessionUseCaseImpl } from './delete.session.usecase.impl';
import { GetSessionUseCaseImpl } from './get.session.usecase.impl';
import { GetSessionsByUserIdUseCaseImpl } from './get.sessions.by.user.id.usecase.impl';

export const SESSION_USECASES: Provider[] = [
  {
    useClass: GetSessionUseCaseImpl,
    provide: IGetSessionUseCase,
  },
  {
    useClass: GetSessionsByUserIdUseCaseImpl,
    provide: IGetSessionsByUserIdUseCase,
  },
  {
    useClass: DeleteSessionUseCaseImpl,
    provide: IDeleteSessionUseCase,
  },
];
