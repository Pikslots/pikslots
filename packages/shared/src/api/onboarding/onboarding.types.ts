import type { BusinessIndustry } from '../business';
import type { UserRole } from '../user';

interface FullNameInput {
  firstName: string;
  lastName: string;
}

export interface OnboardingUserInput {
  username: string;
  password: string;
  name: FullNameInput;
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

// ____Onboarding Input __________________________________

export interface OnboardingCompleteInput {
  platformOwner: OnboardingUserInput;
  business: OnboardingBusinessInput;
}

// ________ Onboarding Response______________________________

export interface OnboardingCompleteResponse {
  message: 'success';
}

export interface OnboardingStatusResponse {
  isOnboardingComplete: boolean;
}
