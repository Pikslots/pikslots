import type {
	GetUsersByRoleInput,
	InviteUserInput,
	InviteUserResponse,
	LoginUserInput,
	LoginUserResponse,
	LogoutUserResponse,
	UpdateUserAvatarInput,
	UpdateUserAvatarResponse,
	UpdateUserProfileInput,
	UpdateUserProfileResponse,
	UpdateUserWorkingHoursInput,
	UpdateUserWorkingHoursResponse,
	UserSummary
} from '@pikslots/shared';

export type UserProfileModel = UserSummary;
export type UserInviteInput = InviteUserInput;
export type UserInviteResult = InviteUserResponse;
export type UserLoginInput = LoginUserInput;
export type UserLoginResult = LoginUserResponse;
export type UserLogoutResult = LogoutUserResponse;
export type UserByRoleInput = GetUsersByRoleInput;
export type UserByRoleResult = UserSummary[];
export type UserModel = UserSummary;
export type BusinessUserModel = UserSummary;
export type BusinessUsersResult = UserSummary[];
export type UpdateWorkingHoursInput = UpdateUserWorkingHoursInput & { userId: string };
export type UpdateWorkingHoursResult = UpdateUserWorkingHoursResponse;
export type UpdateAvatarInput = UpdateUserAvatarInput & { userId: string };
export type UpdateAvatarResult = UpdateUserAvatarResponse;
export type UpdateProfileInput = UpdateUserProfileInput;
export type UpdateProfileResult = UpdateUserProfileResponse;
