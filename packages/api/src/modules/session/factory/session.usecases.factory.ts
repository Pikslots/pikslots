import { Inject, Injectable } from '@nestjs/common';
import {
  IDeleteSessionUseCase,
  IGetSessionUseCase,
  IRegisterSessionUseCase,
} from '@pikslots/domain';
import type {
  DeleteSessionUseCase,
  GetSessionUseCase,
  RegisterSessionUseCase,
} from '@pikslots/domain';

@Injectable()
export class SessionUsecasesFactory {
  @Inject(IRegisterSessionUseCase)
  public readonly registerSessionUsecase: RegisterSessionUseCase;

  @Inject(IGetSessionUseCase)
  public readonly getSessionUsecase: GetSessionUseCase;

  @Inject(IDeleteSessionUseCase)
  public readonly deleteSessionUsecase: DeleteSessionUseCase;
}
