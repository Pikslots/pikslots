import type { Customer } from '../customer.entity';
import type { InfrastructureError, Result, UnauthorizedError } from '../../shared';

export const IExportCustomersByBusinessUseCase = Symbol('IExportCustomersByBusinessUseCase');

export interface ExportCustomersByBusinessUseCase {
  execute(businessId: string): Promise<Result<Customer[], UnauthorizedError | InfrastructureError>>;
}
