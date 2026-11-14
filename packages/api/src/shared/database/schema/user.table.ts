import { Selectable, Insertable, Updateable } from 'kysely';
import type { AuditFields } from './audit.table';
import {
  UserRole,
  UserStatus,
  SupportedSoundTypes,
  UserWorkingHours,
} from '@pikslots/domain';

export interface UserTable extends AuditFields {
  id: string; // uuid primary key
  username: string; // unique login handle
  password: string; // bcrypt-hashed password
  business_id: string; // every user belongs to a business
  first_name: string; // given name
  last_name: string; // family name
  email: string; // unique email address
  phone: string | null; // E.164 phone number; optional
  role: UserRole;
  status: UserStatus;
  avatar_url: string | null; // profile picture URL; optional
  email_verified: boolean; // whether the email has been confirmed
  booking_url: string; // public booking page URL
  notification_mode: 'all' | 'focus' | 'none';
  notification_sound_enabled: boolean;
  notification_sound_type: SupportedSoundTypes;
  reminder_enabled: boolean;
  reminder_mins_before: number;
  reminder_sound_type: SupportedSoundTypes;
  user_working_hours: UserWorkingHours;
  last_login_at: Date | null; // timestamp of most recent login
  suspended_reason: string | null; // reason given when account was suspended
}

export type UserTableSelect = Selectable<UserTable>;
export type UserTableInsert = Insertable<UserTable>;
export type UserTableUpdate = Updateable<UserTable>;
