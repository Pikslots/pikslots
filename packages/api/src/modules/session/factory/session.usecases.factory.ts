import { Inject, Injectable } from '@nestjs/common';
import {
  IDeleteSessionUseCase,
  IGetSessionUseCase,
  IGetSessionsByUserIdUseCase,
} from '@pikslots/domain';
import type {
  DeleteSessionUseCase,
  GetSessionUseCase,
  GetSessionsByUserIdUseCase,
} from '@pikslots/domain';

@Injectable()
export class SessionUsecasesFactory {
  @Inject(IGetSessionUseCase)
  public readonly getSessionUsecase: GetSessionUseCase;

  @Inject(IGetSessionsByUserIdUseCase)
  public readonly getSessionsByUserIdUsecase: GetSessionsByUserIdUseCase;

  @Inject(IDeleteSessionUseCase)
  public readonly deleteSessionUsecase: DeleteSessionUseCase;
}
