import { Provider } from '@nestjs/common';
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
import { RegisterCustomerUseCaseImpl } from './register.customer.usecase.impl';
import { EditCustomerUseCaseImpl } from './edit.customer.usecase.impl';
import { DeleteCustomerUseCaseImpl } from './delete.customer.usecase.impl';
import { FindAllCustomersByBusinessUseCaseImpl } from './find.all.customers.by.business.usecase.impl';
import { FindCustomerByIdUseCaseImpl } from './find.customer.by.id.usecase.impl';
import { UpdateCustomerProfileImageUseCaseImpl } from './update.customer.profile.image.usecase.impl';
import { DebounceCustomerSearchByBusinessIdUseCaseImpl } from './debounce.customer.search.by.business.id.usecase.impl';
import { ExportCustomersByBusinessUseCaseImpl } from './export.customers.by.business.usecase.impl';

export const CUSTOMER_USECASES: Provider[] = [
  { useClass: RegisterCustomerUseCaseImpl, provide: IRegisterCustomerUseCase },
  { useClass: EditCustomerUseCaseImpl, provide: IEditCustomerUseCase },
  { useClass: DeleteCustomerUseCaseImpl, provide: IDeleteCustomerUseCase },
  {
    useClass: FindAllCustomersByBusinessUseCaseImpl,
    provide: IFindAllCustomersByBusinessUseCase,
  },
  { useClass: FindCustomerByIdUseCaseImpl, provide: IFindCustomerByIdUseCase },
  {
    useClass: UpdateCustomerProfileImageUseCaseImpl,
    provide: IUpdateCustomerProfileImageUseCase,
  },
  {
    useClass: DebounceCustomerSearchByBusinessIdUseCaseImpl,
    provide: IDebounceCustomerSearchByBusinessIdUseCase,
  },
  {
    useClass: ExportCustomersByBusinessUseCaseImpl,
    provide: IExportCustomersByBusinessUseCase,
  },
];
