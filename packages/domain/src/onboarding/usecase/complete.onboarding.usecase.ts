import type { BusinessIndustry, BusinessAlreadyExistsError } from '../../business';
import type { FullName, InfrastructureError, Result } from '../../shared';
import type { UserAlreadyExistsError, UserRole } from '../../user';
import type { businessOwnerAlreadyExist, PlatformOwnerAlreadyExist } from '../errors';

export interface OnboardingUserInput {
  username: string;
  password: string;
  name: FullName;
  email: string;
  phone?: string;
  role: UserRole;
}

export interface OnboardingBusinessInput {
  slug: string;
  name: string;
  industry: BusinessIndustry;
  defaultTimeZone: string;
}

export interface CompleteOnBoardingCommand {
  platformOwner: OnboardingUserInput;
  business: OnboardingBusinessInput;
}

export const ICompleteOnBoardingUseCase = Symbol('ICompleteOnBoardingUseCase');

export interface CompleteOnBoardingUseCase {
  execute(
    command: CompleteOnBoardingCommand,
  ): Promise<
    Result<
      { message: 'success' },
      | PlatformOwnerAlreadyExist
      | businessOwnerAlreadyExist
      | BusinessAlreadyExistsError
      | UserAlreadyExistsError
      | InfrastructureError
    >
  >;
}
