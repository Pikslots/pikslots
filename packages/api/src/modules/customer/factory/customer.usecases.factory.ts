import { Inject, Injectable } from '@nestjs/common';
import {
  IRegisterCustomerUseCase,
  IEditCustomerUseCase,
  IDeleteCustomerUseCase,
  IFindAllCustomersByBusinessUseCase,
  IFindCustomerByIdUseCase,
  IUpdateCustomerProfileImageUseCase,
  IDebounceCustomerSearchByBusinessIdUseCase,
  IExportCustomersByBusinessUseCase,
} from '@pikslots/domain';
import type {
  RegisterCustomerUseCase,
  EditCustomerUseCase,
  DeleteCustomerUseCase,
  FindAllCustomersByBusinessUseCase,
  FindCustomerByIdUseCase,
  UpdateCustomerProfileImageUseCase,
  DebounceCustomerSearchByBusinessIdUseCase,
  ExportCustomersByBusinessUseCase,
} from '@pikslots/domain';

@Injectable()
export class CustomerUseCasesFactory {
  @Inject(IRegisterCustomerUseCase)
  public readonly registerCustomerUseCase: RegisterCustomerUseCase;

  @Inject(IEditCustomerUseCase)
  public readonly editCustomerUseCase: EditCustomerUseCase;

  @Inject(IDeleteCustomerUseCase)
  public readonly deleteCustomerUseCase: DeleteCustomerUseCase;

  @Inject(IFindAllCustomersByBusinessUseCase)
  public readonly findAllCustomersByBusinessUseCase: FindAllCustomersByBusinessUseCase;

  @Inject(IFindCustomerByIdUseCase)
  public readonly findCustomerByIdUseCase: FindCustomerByIdUseCase;

  @Inject(IUpdateCustomerProfileImageUseCase)
  public readonly updateCustomerProfileImageUseCase: UpdateCustomerProfileImageUseCase;

  @Inject(IDebounceCustomerSearchByBusinessIdUseCase)
  public readonly debounceCustomerSearchByBusinessIdUseCase: DebounceCustomerSearchByBusinessIdUseCase;

  @Inject(IExportCustomersByBusinessUseCase)
  public readonly exportCustomersByBusinessUseCase: ExportCustomersByBusinessUseCase;
}
