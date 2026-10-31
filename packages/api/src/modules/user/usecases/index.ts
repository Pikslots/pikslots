import { Provider } from '@nestjs/common';
import { InviteUserUsecaseImpl } from './invite.user.usecase.impl';
import { FindUserByIdUseCaseImpl } from './find.user.by.id.usecase.impl';
import { GetUserProfileUseCaseImpl } from './get.user.profile.usecase.impl';
import { GetAllBusinessOwnersUseCaseImpl } from './get.all.business.owners.usecase.impl';
import { GetAllUsersByRoleUseCaseImpl } from './get.all.users.by.role.usecase.impl';
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

import { LoginUserUseCaseImpl } from './login.user.usecase.impl';
import { LogoutUserUseCaseImpl } from './logout.user.usecase.impl';
import { UpdateUserWorkingHoursUseCaseImpl } from './update.user.working.hours.usecase.impl';
import { RequestInviteOtpUseCaseImpl } from './request.invite.otp.usecase.impl';
import { AcceptInviteUseCaseImpl } from './accept.invite.usecase.impl';
import { FindAllUsersInsideBusinessUseCaseImpl } from './find.all.users.inside.business.usecase.impl';
import { GetFreeSlotsForUserUseCaseImpl } from './get.free.slots.for.user.usecase.impl';
import { GetAvailableDatesForBookingUseCaseImpl } from './get.available.dates.for.booking.usecase.impl';
import { UpdateUserAvatarUseCaseImpl } from './update.user.avatar.usecase.impl';
import { UpdateUserProfileUseCaseImpl } from './update.user.profile.usecase.impl';

export const USER_USECASES: Provider[] = [
  { useClass: InviteUserUsecaseImpl, provide: IInviteUserUseCase },
  { useClass: FindUserByIdUseCaseImpl, provide: IFindUserByIdUseCase },
  { useClass: GetUserProfileUseCaseImpl, provide: IGetUserProfileUseCase },
  {
    useClass: GetAllBusinessOwnersUseCaseImpl,
    provide: IGetAllBusinessOwnersUseCase,
  },
  { useClass: GetAllUsersByRoleUseCaseImpl, provide: IGetAllUsersByRole },
  { useClass: LoginUserUseCaseImpl, provide: ILoginUserUseCase },
  { useClass: LogoutUserUseCaseImpl, provide: ILogoutUserUseCase },
  {
    useClass: UpdateUserWorkingHoursUseCaseImpl,
    provide: IUpdateUserWorkingHoursUseCase,
  },
  { useClass: RequestInviteOtpUseCaseImpl, provide: IRequestInviteOtpUseCase },
  { useClass: AcceptInviteUseCaseImpl, provide: IAcceptInviteUseCase },
  {
    useClass: FindAllUsersInsideBusinessUseCaseImpl,
    provide: IFindAllUsersInsideBusinessUseCase,
  },
  {
    useClass: GetFreeSlotsForUserUseCaseImpl,
    provide: IGetFreeSlotsForUser,
  },
  {
    useClass: GetAvailableDatesForBookingUseCaseImpl,
    provide: IGetAvailableDatesForBookingUseCase,
  },
  {
    useClass: UpdateUserAvatarUseCaseImpl,
    provide: IUpdateUserAvatarUseCase,
  },
  {
    useClass: UpdateUserProfileUseCaseImpl,
    provide: IUpdateUserProfileUseCase,
  },
];
