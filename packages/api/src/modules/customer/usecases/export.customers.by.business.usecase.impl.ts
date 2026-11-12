import { Inject, Injectable } from '@nestjs/common';
import {
  Customer,
  type CustomerRepository,
  err,
  ExportCustomersByBusinessUseCase,
  ICustomerRepository,
  InfrastructureError,
  Result,
  UnauthorizedError,
} from '@pikslots/domain';
import { SecurityContext } from 'src/shared/security/context/security.context';

const UNAUTHORIZED_ERROR: UnauthorizedError = {
  kind: 'unauthorized',
  message: 'Access Denied',
  timestamp: new Date(),
};

@Injectable()
export class ExportCustomersByBusinessUseCaseImpl implements ExportCustomersByBusinessUseCase {
  constructor(
    @Inject(ICustomerRepository)
    private readonly customerRepository: CustomerRepository,
    private readonly securityContext: SecurityContext,
  ) {}

  async execute(
    businessId: string,
  ): Promise<Result<Customer[], UnauthorizedError | InfrastructureError>> {
    const callerRole = this.securityContext.role;
    const callerBusinessId = this.securityContext.businessId;
    const isPartOfSameBusiness = callerBusinessId === businessId;

    if (!Customer.canViewCustomer(callerRole, isPartOfSameBusiness))
      return err(UNAUTHORIZED_ERROR);

    return await this.customerRepository.findAllByBusiness(businessId);
  }
}
