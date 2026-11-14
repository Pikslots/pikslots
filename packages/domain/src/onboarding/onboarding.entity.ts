// ── Props ─────────────────────────────────────────────────────────────────────

import { Business, type BusinessIndustry } from '../business';
import type { FullName } from '../shared';
import { User, type UserRole, type UserStatus } from '../user';

export interface OnboardingProps {
  readonly platformOwner: User;
  readonly businessOwner: User;
  readonly business: Business;
}

// ── Create input ──────────────────────────────────────────────────────────────

export interface CreateUser {
  id: string;
  username: string;
  password: string;
  businessId: string;
  name: FullName;
  email: string;
  phone?: string;
  status?: UserStatus;
  role: UserRole;
  bookingUrl: string;
  createdBy: string;
}

export interface CreateOnboarding {
  platformOwner: CreateUser;
  businessOwner: CreateUser;
  business: {
    id: string;
    ownerId: string;
    slug: string;
    name: string;
    industry: BusinessIndustry;
    defaultTimeZone: string;
    createdBy: string;
  };
}

// ── Entity ────────────────────────────────────────────────────────────────────

export class Onboarding {
  private readonly props: OnboardingProps;

  private constructor(props: OnboardingProps) {
    this.props = props;
  }

  static create(input: CreateOnboarding): Onboarding {
    return new Onboarding({
      platformOwner: User.create(input.platformOwner),
      businessOwner: User.create(input.businessOwner),
      business: Business.create(input.business),
    });
  }

  static reconstitute(props: OnboardingProps): Onboarding {
    return new Onboarding(props);
  }

  get platformOwner(): User {
    return this.props.platformOwner;
  }
  get businessOwner(): User {
    return this.props.businessOwner;
  }
  get business(): Business {
    return this.props.business;
  }
}
