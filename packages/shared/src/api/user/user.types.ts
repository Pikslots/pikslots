import type { SessionDeviceContext } from '../base.types';

export type UserRole =
  | 'Platform Owner'
  | 'Business Owner'
  | 'No Access'
  | 'Standard'
  | 'Enhanced'
  | 'Admin';

// --- Requests ---

export interface FullNameInput {
  firstName: string;
  lastName: string;
}

export interface InviteUserInput {
  username: string;
  email: string;
  name: FullNameInput;
  role: UserRole;
  phone?: string;
  businessId?: string;
  businessName?: string;
}

export interface LoginUserInput extends SessionDeviceContext {
  usernameOrEmail: string;
  password: string;
}

// --- Responses ---

export interface InviteUserResponse {
  message: 'success';
}

export interface LogoutUserResponse {
  message: 'success';
}

export interface LoginUserResponse {
  message: 'success';
}

export type UserStatus = 'invited' | 'active' | 'inactive' | 'suspended';

export type SupportedSoundTypes = 'chime' | 'whistle';

export interface UserNotificationPreferences {
  notificationMode: 'all' | 'focus' | 'none';
  soundEnabled: boolean;
  soundType: SupportedSoundTypes;
}

export interface UserAppointmentReminders {
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
  reminderSoundType: SupportedSoundTypes;
}

export interface UserWorkingHoursResponse {
  monday: UserDayHours;
  tuesday: UserDayHours;
  wednesday: UserDayHours;
  thursday: UserDayHours;
  friday: UserDayHours;
  saturday: UserDayHours;
  sunday: UserDayHours;
}

export interface UserSummary {
  id: string;
  username: string;
  email: string;
  name: FullNameInput;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  emailVerified: boolean;
  bookingUrl: string;
  businessId: string | null;
  lastLoginAt: string | null;
  suspendedReason: string | null;
  notificationPreferences: UserNotificationPreferences;
  appointmentReminders: UserAppointmentReminders;
  userWorkingHours: UserWorkingHoursResponse;
}

export interface GetUsersByRoleInput {
  role: UserRole;
}

// --- Avatar ---

export interface UpdateUserAvatarInput {
  avatarKey: string;
}

export interface UpdateUserAvatarResponse {
  message: 'success';
}

// --- Update Profile ---

export interface UpdateUserProfileInput {
  userId?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email: string;
  role?: UserRole;
}

export interface UpdateUserProfileResponse {
  message: 'success';
}

// --- Working Hours ---

export interface UserDayHours {
  enabled: boolean;
  openTime: string; // 'HH:mm' 24-hour
  closeTime: string; // 'HH:mm' 24-hour
}

export interface UpdateUserWorkingHoursInput {
  monday: UserDayHours;
  tuesday: UserDayHours;
  wednesday: UserDayHours;
  thursday: UserDayHours;
  friday: UserDayHours;
  saturday: UserDayHours;
  sunday: UserDayHours;
}

export type UpdateUserWorkingHoursResponse = UpdateUserWorkingHoursInput;

// --- Invite acceptance ---

export interface RequestInviteOtpInput {
  token: string;
}

export interface AcceptInviteInput {
  token: string;
  otp: string;
  newPassword: string;
}

export type RequestInviteOtpResponse = { message: 'success' };
export type AcceptInviteResponse = { message: 'success' };

// --- Free Slots ---

export interface SlotResponse {
  startTime: string; // ISO 8601 UTC
  endTime: string; // ISO 8601 UTC
}

export interface GetFreeSlotsForUserInput {
  businessId: string;
  date: string; // 'YYYY-MM-DD'
  durationInMins: number;
  bufferTimeInMins: number;
  businessTimezone: string; // IANA timezone
}

export type GetFreeSlotsForUserResponse = SlotResponse[];

// --- Available Dates ----

export interface GetAvailableDatesForBookingInput {
  businessId: string;
  serviceId: string;
  businessTimezone: string; // IANA timezone, e.g. 'America/New_York' — needed to convert HH:mm working hours to UTC
}

export interface GetAvailableDatesForBookingResponse {
  dates: string[];
}
