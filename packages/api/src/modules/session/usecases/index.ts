import { Provider } from '@nestjs/common';
import {
  IDeleteSessionUseCase,
  IGetSessionUseCase,
  IRegisterSessionUseCase,
} from '@pikslots/domain';
import { DeleteSessionUseCaseImpl } from './delete.session.usecase.impl';
import { GetSessionUseCaseImpl } from './get.session.usecase.impl';
import { RegisterSessionUseCaseImpl } from './register.session.usecase.impl';

export const SESSION_USECASES: Provider[] = [
  {
    useClass: RegisterSessionUseCaseImpl,
    provide: IRegisterSessionUseCase,
  },
  {
    useClass: GetSessionUseCaseImpl,
    provide: IGetSessionUseCase,
  },
  {
    useClass: DeleteSessionUseCaseImpl,
    provide: IDeleteSessionUseCase,
  },
];
