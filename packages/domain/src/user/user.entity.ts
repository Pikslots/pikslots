// ── Props ─────────────────────────────────────────────────────────────────────

import type { FullName } from '../shared';
import type { UserRole, UserStatus } from './types';
import type { AppointmentReminders, NotificationPreferences } from './value-objects';
import type { UserWorkingHours } from './value-objects/user.working.hours.vo';

export interface UserProps {
  readonly id: string;
  readonly username: string;
  readonly password: string;
  readonly name: FullName;
  readonly email: string;
  readonly phone: string | null;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly avatarUrl: string | null;
  readonly emailVerified: boolean;
  readonly bookingUrl: string;
  readonly notificationPreferences: NotificationPreferences;
  readonly appointmentReminders: AppointmentReminders;
  readonly userWorkingHours: UserWorkingHours;
  readonly lastLoginAt: Date | null;
  readonly suspendedReason: string | null;

  readonly businessId: string;
  // audit
  readonly createdAt: Date;
  readonly createdBy: string;
  readonly updatedAt: Date;
  readonly updatedBy: string;
  readonly deletedAt: Date | null;
  readonly deletedBy: string | null;
  readonly isDeleted: boolean;
}

// ── Create input ──────────────────────────────────────────────────────────────

export interface CreateUserInput {
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

// ── Entity ────────────────────────────────────────────────────────────────────

export class User {
  private readonly props: UserProps;

  private constructor(props: UserProps) {
    this.props = props;
  }

  /**
   * Creates a brand-new User with business defaults applied.
   * Use this in application use-cases, never for rehydrating persisted data.
   */
  static create(input: CreateUserInput): User {
    const now = new Date();
    return new User({
      id: input.id,
      username: input.username,
      password: input.password,
      businessId: input.businessId,
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      role: input.role,
      status: input.status ?? 'invited',
      bookingUrl: input.bookingUrl,
      avatarUrl: null,
      emailVerified: false,
      notificationPreferences: { notificationMode: 'all', soundEnabled: true, soundType: 'chime' },
      appointmentReminders: {
        reminderEnabled: true,
        reminderMinutesBefore: 10,
        reminderSoundType: 'chime',
      },
      userWorkingHours: {
        monday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
        tuesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
        wednesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
        thursday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
        friday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
        saturday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
        sunday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
      },
      lastLoginAt: null,
      suspendedReason: null,
      createdAt: now,
      createdBy: input.createdBy,
      updatedAt: now,
      updatedBy: input.createdBy,
      deletedAt: null,
      deletedBy: null,
      isDeleted: false,
    });
  }

  /**
   * Reconstitutes a User from already-validated data (e.g. a database row
   * decoded through UserSchema). Never call with raw untrusted input.
   */
  static reconstitute(props: UserProps): User {
    return new User(props);
  }

  // ── Business rules ─────────────────────────────────────────────────────────

  private static readonly INVITE_PERMISSIONS: Record<UserRole, UserRole[]> = {
    'Platform Owner': ['Business Owner', 'Admin', 'Enhanced', 'Standard', 'No Access'],
    'Business Owner': ['Admin', 'Enhanced', 'Standard', 'No Access'],
    Admin: ['Enhanced', 'Standard', 'No Access'],
    Enhanced: [],
    Standard: [],
    'No Access': [],
  };

  static canInviteRole(inviterRole: UserRole, targetRole: UserRole): boolean {
    return User.INVITE_PERMISSIONS[inviterRole].includes(targetRole);
  }

  private static readonly QUERY_PERMISSIONS: Record<UserRole, UserRole[]> = {
    'Platform Owner': [
      'Platform Owner',
      'Business Owner',
      'Admin',
      'Enhanced',
      'Standard',
      'No Access',
    ],
    'Business Owner': ['Admin', 'Enhanced', 'Standard', 'No Access'],
    Admin: ['Enhanced', 'Standard', 'No Access'],
    Enhanced: [],
    Standard: [],
    'No Access': [],
  };

  static canQueryRole(callerRole: UserRole, targetRole: UserRole): boolean {
    return User.QUERY_PERMISSIONS[callerRole].includes(targetRole);
  }

  static canUpdateWorkingHours(
    updaterRole: UserRole,
    isSelf: boolean,
    isPartOfSameBusiness: boolean,
  ): boolean {
    if (updaterRole === 'Platform Owner') return true;
    if ((updaterRole === 'Business Owner' || updaterRole === 'Admin') && isPartOfSameBusiness)
      return true;
    if (isSelf && (updaterRole === 'Enhanced' || updaterRole === 'Standard')) return true;
    return false;
  }

  static canUpdateAvatar(
    updaterRole: UserRole,
    isSelf: boolean,
    isPartOfSameBusiness: boolean,
  ): boolean {
    if (updaterRole === 'Platform Owner') return true;
    if ((updaterRole === 'Business Owner' || updaterRole === 'Admin') && isPartOfSameBusiness)
      return true;
    if (isSelf && (updaterRole === 'Enhanced' || updaterRole === 'Standard')) return true;
    return false;
  }

  static canUpdateProfile(
    updaterRole: UserRole,
    isSelf: boolean,
    isPartOfSameBusiness: boolean,
  ): boolean {
    if (updaterRole === 'Platform Owner') return true;
    if ((updaterRole === 'Business Owner' || updaterRole === 'Admin') && isPartOfSameBusiness)
      return true;
    if (isSelf && (updaterRole === 'Enhanced' || updaterRole === 'Standard')) return true;
    return false;
  }

  // ── Identity ───────────────────────────────────────────────────────────────

  get id(): string {
    return this.props.id;
  }

  equals(other: User): boolean {
    return this.props.id === other.props.id;
  }

  // ── Core fields ────────────────────────────────────────────────────────────

  get username(): string {
    return this.props.username;
  }
  get businessId(): string {
    return this.props.businessId;
  }
  get password(): string {
    return this.props.password;
  }
  get name(): FullName {
    return this.props.name;
  }
  get email(): string {
    return this.props.email;
  }
  get phone(): string | null {
    return this.props.phone;
  }
  get role(): UserRole {
    return this.props.role;
  }
  get status(): UserStatus {
    return this.props.status;
  }
  get avatarUrl(): string | null {
    return this.props.avatarUrl;
  }
  get emailVerified(): boolean {
    return this.props.emailVerified;
  }
  get bookingUrl(): string {
    return this.props.bookingUrl;
  }
  get notificationPreferences(): NotificationPreferences {
    return this.props.notificationPreferences;
  }
  get appointmentReminders(): AppointmentReminders {
    return this.props.appointmentReminders;
  }
  get lastLoginAt(): Date | null {
    return this.props.lastLoginAt;
  }
  get suspendedReason(): string | null {
    return this.props.suspendedReason;
  }
  get userWorkingHours(): UserWorkingHours {
    return this.props.userWorkingHours;
  }

  // ── Audit fields ───────────────────────────────────────────────────────────

  get createdAt(): Date {
    return this.props.createdAt;
  }
  get createdBy(): string {
    return this.props.createdBy;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
  get updatedBy(): string {
    return this.props.updatedBy;
  }
  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }
  get deletedBy(): string | null {
    return this.props.deletedBy;
  }
  get isDeleted(): boolean {
    return this.props.isDeleted;
  }

  acceptInvite(hashedPassword: string, updatedBy: string): User {
    return new User({
      ...this.props,
      password: hashedPassword,
      status: 'active',
      emailVerified: true,
      updatedAt: new Date(),
      updatedBy,
    });
  }

  assignBusiness(businessId: string, updatedBy: string): User {
    return new User({ ...this.props, businessId, updatedAt: new Date(), updatedBy });
  }

  updateWorkingHours({
    userWorkingHours,
    updatedBy,
  }: {
    userWorkingHours: UserWorkingHours;
    updatedBy: string;
  }): User {
    return new User({ ...this.props, userWorkingHours, updatedAt: new Date(), updatedBy });
  }

  updateAvatarUrl(avatarUrl: string): User {
    return new User({ ...this.props, avatarUrl });
  }

  updateProfile({
    name,
    phone,
    email,
    role,
    updatedBy,
  }: {
    name: FullName;
    phone: string | null;
    email: string;
    role?: UserRole;
    updatedBy: string;
  }): User {
    return new User({
      ...this.props,
      name,
      phone,
      email,
      ...(role !== undefined ? { role } : {}),
      updatedAt: new Date(),
      updatedBy,
    });
  }
}
