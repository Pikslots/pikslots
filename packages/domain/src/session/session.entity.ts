import type { UserRole } from '../user';

// _________props___________________________________
export interface SessionProps {
  readonly id: string;
  readonly userId: string;
  readonly role: UserRole;
  readonly os: string;
  readonly browser: string;
  readonly country: string;
  readonly businessId: string | null;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
}

// ____createSessionInput____________________________________
export interface CreateSessionInput {
  id: string;
  userId: string;
  role: UserRole;
  os: string;
  browser: string;
  country: string;
  businessId: string | null;
  issuedAt: Date;
  expiresAt: Date;
}

export class Session {
  private readonly props: SessionProps;

  constructor(props: SessionProps) {
    this.props = props;
  }

  static create(input: CreateSessionInput): Session {
    return new Session({
      id: input.id,
      userId: input.userId,
      role: input.role,
      os: input.os,
      browser: input.browser,
      country: input.country,
      businessId: input.businessId,
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
    });
  }

  static reconstitute(props: SessionProps): Session {
    return new Session(props);
  }

  // ── Business rules ───────────────────────────────────────────────────────────

  static canViewSessionsForUser(callerRole: UserRole, isPartOfSameBusiness: boolean): boolean {
    if (callerRole === 'Platform Owner') return true;
    if ((callerRole === 'Business Owner' || callerRole === 'Admin') && isPartOfSameBusiness)
      return true;

    return false;
  }

  static canRemoveSession(
    callerRole: UserRole,
    isSelf: boolean,
    isPartOfSameBusiness: boolean,
  ): boolean {
    if (isSelf) return false;
    if (callerRole === 'Platform Owner') return true;
    if ((callerRole === 'Business Owner' || callerRole === 'Admin') && isPartOfSameBusiness)
      return true;
    return false;
  }

  isExpired(now: Date = new Date()): boolean {
    return this.props.expiresAt.getTime() <= now.getTime();
  }

  // ── Identity ───────────────────────────────────────────────────────────────

  get id(): string {
    return this.props.id;
  }

  equals(other: Session): boolean {
    return this.props.id === other.props.id;
  }

  // _______ core fields ___________________________________________________

  get userId(): string {
    return this.props.userId;
  }
  get role(): UserRole {
    return this.props.role;
  }
  get os(): string {
    return this.props.os;
  }
  get browser(): string {
    return this.props.browser;
  }
  get country(): string {
    return this.props.country;
  }
  get businessId(): string | null {
    return this.props.businessId;
  }
  get issuedAt(): Date {
    return this.props.issuedAt;
  }
  get expiresAt(): Date {
    return this.props.expiresAt;
  }
}
