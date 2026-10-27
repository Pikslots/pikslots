import { Inject, Injectable } from '@nestjs/common';
import {
  IAcceptInviteUseCase,
  IFindAllUsersInsideBusinessUseCase,
  IFindUserByIdUseCase,
  IGetAllBusinessOwnersUseCase,
  IGetAllUsersByRole,
  IGetFreeSlotsForUser,
  IGetUserProfileUseCase,
  IInviteUserUseCase,
  ILoginUserUseCase,
  ILogoutUserUseCase,
  IRequestInviteOtpUseCase,
  IUpdateUserWorkingHoursUseCase,
  IUpdateUserAvatarUseCase,
  IGetAvailableDatesForBookingUseCase,
  IUpdateUserProfileUseCase,
} from '@pikslots/domain';
import type {
  AcceptInviteUseCase,
  FindAllUsersInsideBusinessUseCase,
  FindUserByIdUseCase,
  GetAllBusinessOwnersUseCase,
  GetAllUsersByRoleUseCase,
  GetFreeSlotsForUser,
  GetUserProfileUseCase,
  InviteUserUseCase,
  LoginUserUseCase,
  LogoutUserUseCase,
  RequestInviteOtpUseCase,
  UpdateUserWorkingHoursUseCase,
  UpdateUserAvatarUseCase,
  GetAvailableDatesForBookingUseCase,
  UpdateUserProfileUseCase,
} from '@pikslots/domain';

@Injectable()
export class UserUsecasesFactory {
  @Inject(IInviteUserUseCase)
  public readonly inviteUserUseCase: InviteUserUseCase;

  @Inject(IFindUserByIdUseCase)
  public readonly findUserByIdUseCase: FindUserByIdUseCase;

  @Inject(IGetUserProfileUseCase)
  public readonly getUserProfileUseCase: GetUserProfileUseCase;

  @Inject(IGetAllBusinessOwnersUseCase)
  public readonly getAllBusinessOwnersUseCase: GetAllBusinessOwnersUseCase;

  @Inject(IGetAllUsersByRole)
  public readonly getAllUsersByRoleUseCase: GetAllUsersByRoleUseCase;

  @Inject(ILoginUserUseCase)
  public readonly loginUserUseCase: LoginUserUseCase;

  @Inject(ILogoutUserUseCase)
  public readonly logoutUserUseCase: LogoutUserUseCase;

  @Inject(IUpdateUserWorkingHoursUseCase)
  public readonly updateUserWorkingHoursUseCase: UpdateUserWorkingHoursUseCase;

  @Inject(IRequestInviteOtpUseCase)
  public readonly requestInviteOtpUseCase: RequestInviteOtpUseCase;

  @Inject(IAcceptInviteUseCase)
  public readonly acceptInviteUseCase: AcceptInviteUseCase;

  @Inject(IFindAllUsersInsideBusinessUseCase)
  public readonly findAllUsersInsideBusinessUseCase: FindAllUsersInsideBusinessUseCase;

  @Inject(IGetFreeSlotsForUser)
  public readonly getFreeSlotsForUserUseCase: GetFreeSlotsForUser;

  @Inject(IGetAvailableDatesForBookingUseCase)
  public readonly getAvailableDatesForBookingUseCase: GetAvailableDatesForBookingUseCase;

  @Inject(IUpdateUserAvatarUseCase)
  public readonly updateUserAvatarUseCase: UpdateUserAvatarUseCase;

  @Inject(IUpdateUserProfileUseCase)
  public readonly updateUserProfileUseCase: UpdateUserProfileUseCase;
}
