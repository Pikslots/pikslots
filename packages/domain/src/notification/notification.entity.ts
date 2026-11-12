// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationKind = 'booking' | 'team' | 'payment' | 'system';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface NotificationProps {
  readonly id: string;
  readonly kind: NotificationKind;
  readonly iconClassName: string; // Tabler icon name, e.g. "calendar-check" (see @tabler/icons-svelte/icons/<name>)
  readonly title: string;
  readonly message: string;
  readonly body: string[];
  readonly href: string | null;
  readonly isRead: boolean;
  readonly readAt: Date | null;

  // relations — at least one must be set (see Notification.create)
  readonly userId: string | null; // recipient when targeted at a single user
  readonly businessId: string | null; // owning business, set when broadcast business-wide or to scope a user-targeted notification to its business

  // audit — notifications are never edited or deleted, only read/unread
  readonly createdAt: Date;
}

// ── Create input ──────────────────────────────────────────────────────────────

export interface CreateNotificationInput {
  id: string;
  kind: NotificationKind;
  iconClassName: string;
  title: string;
  message: string;
  userId?: string | null;
  businessId?: string | null;
  body?: string[];
  href?: string | null;
}

// ── Entity ────────────────────────────────────────────────────────────────────

export class Notification {
  private readonly props: NotificationProps;

  private constructor(props: NotificationProps) {
    this.props = props;
  }

  /**
   * Creates a brand-new, unread Notification.
   * Use this in application use-cases, never for rehydrating persisted data.
   */
  static create(input: CreateNotificationInput): Notification {
    const userId = input.userId ?? null;
    const businessId = input.businessId ?? null;
    if (!userId && !businessId) {
      throw new Error('Notification must have a userId, a businessId, or both');
    }

    return new Notification({
      id: input.id,
      kind: input.kind,
      iconClassName: input.iconClassName,
      title: input.title,
      message: input.message,
      body: input.body ?? [],
      href: input.href ?? null,
      isRead: false,
      readAt: null,
      userId,
      businessId,
      createdAt: new Date(),
    });
  }

  /**
   * Reconstitutes a Notification from already-validated data (e.g. a database
   * row). Never call with raw untrusted input.
   */
  static reconstitute(props: NotificationProps): Notification {
    return new Notification(props);
  }

  // ── Business rules ───────────────────────────────────────────────────────────

  /** A notification addressed to a specific user is visible only to that
   * user. Otherwise it's a business-wide notification, visible to any caller
   * within that business. */
  isVisibleTo(callerUserId: string, callerBusinessId: string | null): boolean {
    if (this.props.userId) return this.props.userId === callerUserId;
    return this.props.businessId !== null && this.props.businessId === callerBusinessId;
  }

  // ── Mutation methods ────────────────────────────────────────────────────────

  markAsRead(): Notification {
    if (this.props.isRead) return this;
    return new Notification({
      ...this.props,
      isRead: true,
      readAt: new Date(),
    });
  }

  // ── Identity ────────────────────────────────────────────────────────────────

  get id(): string {
    return this.props.id;
  }

  equals(other: Notification): boolean {
    return this.props.id === other.props.id;
  }

  // ── Snapshot ──────────────────────────────────────────────────────────────

  toProps(): NotificationProps {
    return this.props;
  }

  // ── Core fields ─────────────────────────────────────────────────────────────

  get kind(): NotificationKind {
    return this.props.kind;
  }
  get iconClassName(): string {
    return this.props.iconClassName;
  }
  get title(): string {
    return this.props.title;
  }
  get message(): string {
    return this.props.message;
  }
  get body(): string[] {
    return this.props.body;
  }
  get href(): string | null {
    return this.props.href;
  }
  get isRead(): boolean {
    return this.props.isRead;
  }
  get readAt(): Date | null {
    return this.props.readAt;
  }

  // ── Relations ─────────────────────────────────────────────────────────────

  get userId(): string | null {
    return this.props.userId;
  }
  get businessId(): string | null {
    return this.props.businessId;
  }

  // ── Audit fields ─────────────────────────────────────────────────────────────

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
