import type { UserRole } from '../user';

// _________props___________________________________
export interface SessionProps {
  readonly id: string;
  readonly userId: string;
  readonly role: UserRole;
  readonly businessId: string | null;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
}

// ____createSessionInput____________________________________
export interface CreateSessionInput {
  id: string;
  userId: string;
  role: UserRole;
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
      businessId: input.businessId,
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
    });
  }

  static reconstitute(props: SessionProps): Session {
    return new Session(props);
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
