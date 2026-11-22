import type { InfrastructureError, Result } from '../../shared';
import type { BusinessAlreadyExistsError } from '../errors';
import type { BusinessIndustry } from '../types/';

// The owner is the authenticated caller, resolved from the security context in the use case
export interface CreateBusinessCommand {
  slug: string;
  name: string;
  industry: BusinessIndustry;
  defaultTimeZone: string;
}

export const IRegisterBusinessUseCase = Symbol('IRegisterBusinessUseCase');

export interface RegisterBusinessUseCase {
  execute(
    command: CreateBusinessCommand,
  ): Promise<Result<{ message: 'success' }, BusinessAlreadyExistsError | InfrastructureError>>;
}
