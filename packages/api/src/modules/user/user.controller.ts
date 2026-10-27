import { InjectQueue } from '@nestjs/bullmq';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Queue } from 'bullmq';
import type { AuditLogJobDataShape } from '@pikslots/domain';
import {
  AUDIT_LOG_QUEUE,
  PIKSLOT_EVENTS,
} from 'src/shared/queue/jobs/pikslot.events';
import type { AuditLogJobName } from 'src/shared/queue/jobs';
import { mapUserError } from './errors/user.errors.map';
import { USER_ENDPOINTS } from '@pikslots/shared';
import { LoginUserDto } from './dto/login.user.dto';
import { InviteUserDto } from './dto/invite.user.dto';
import { UserUsecasesFactory } from './factory/user.usecases.factory';
import {
  GetAllBusinessOwnersDocs,
  GetBusinessUsersDocs,
  GetUsersByRoleDocs,
  GetUserProfileDocs,
  InviteUserDocs,
  LoginUserDocs,
  LogoutUserDocs,
  UpdateUserWorkingHoursDocs,
  GetFreeSlotsForUserDocs,
  UpdateUserAvatarDocs,
  UpdateUserProfileDocs,
} from './docs/user.controller.docs';
import { GetUsersByRoleDto } from './dto/get.users.by.role.dto';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';
import { PikslotsBaseResponse } from 'src/shared/types/base.response';
import type {
  AcceptInviteResponse,
  GetAvailableDatesForBookingResponse,
  GetFreeSlotsForUserResponse,
  InviteUserResponse,
  LoginUserResponse,
  LogoutUserResponse,
  RequestInviteOtpResponse,
  UpdateUserAvatarResponse,
  UpdateUserProfileResponse,
  UpdateUserWorkingHoursResponse,
  UserSummary,
} from '@pikslots/shared';
import { UserResponseMapper } from './mappers/user.response.mapper';
import { UpdateUserWorkingHoursDto } from './dto/update.user.working.hours.dto';
import { UpdateUserAvatarDto } from './dto/update.user.avatar.dto';
import { UpdateUserProfileDto } from './dto/update.user.profile.dto';
import { RequestInviteOtpDto } from './dto/request.invite.otp.dto';
import { AcceptInviteDto } from './dto/accept.invite.dto';
import { GetFreeSlotsForUserDto } from './dto/get.free.slots.for.user.dto';
import { SecurityContext } from 'src/shared/security/context/security.context';
import { JwtInviteService } from 'src/shared/security/jwt/jwt.invite.service';
import { InviteJwtPayload } from '@pikslots/shared';
import { ConfigService } from '@nestjs/config';
import { Env } from 'src/shared/config/env';
import { RolesGuard } from 'src/shared/security/guards/roles.guard';
import { Roles } from 'src/shared/security/guards/roles.decorator';
import {
  IPikslotS3Service,
  type PikslotS3Service,
} from 'src/shared/s3/s3.service';
import { GetAvailableDatesDto } from './dto/get.available.dates.for.booking.dto';

@ApiTags('Users')
@Controller('')
export class UserController {
  constructor(
    private readonly userUseCaseFactory: UserUsecasesFactory,
    private readonly configService: ConfigService<Env, true>,
    private readonly securityContext: SecurityContext,
    private readonly jwtInviteService: JwtInviteService,
    @Inject(IPikslotS3Service) private readonly s3Service: PikslotS3Service,
    @InjectQueue(AUDIT_LOG_QUEUE)
    private readonly auditLogQueue: Queue<
      AuditLogJobDataShape,
      void,
      AuditLogJobName
    >,
  ) {}

  @GetAllBusinessOwnersDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner')
  @Get(USER_ENDPOINTS.BUSINESS_OWNERS)
  async getAllBusinessOwners(
    @Res({ passthrough: true }) res: Response,
  ): Promise<PikslotsBaseErrorResponse | PikslotsBaseResponse<UserSummary[]>> {
    const result =
      await this.userUseCaseFactory.getAllUsersByRoleUseCase.execute(
        this.securityContext.role,
        'Business Owner',
      );

    if (!result.ok) {
      const errorResponse = mapUserError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(
      await Promise.all(
        result.value.map((u) =>
          UserResponseMapper.toUserSummary(u, this.s3Service),
        ),
      ),
      HttpStatus.OK,
    );
  }

  @GetUsersByRoleDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @Get(USER_ENDPOINTS.BY_ROLE)
  async getUsersByRole(
    @Query() query: GetUsersByRoleDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PikslotsBaseErrorResponse | PikslotsBaseResponse<UserSummary[]>> {
    const result =
      await this.userUseCaseFactory.getAllUsersByRoleUseCase.execute(
        this.securityContext.role,
        query.role,
      );

    if (!result.ok) {
      const errorResponse = mapUserError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(
      await Promise.all(
        result.value.map((u) =>
          UserResponseMapper.toUserSummary(u, this.s3Service),
        ),
      ),
      HttpStatus.OK,
    );
  }

  @GetBusinessUsersDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin', 'Standard', 'Enhanced')
  @Get(USER_ENDPOINTS.BUSINESS_USERS)
  async getBusinessUsers(
    @Param('businessId') businessId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PikslotsBaseErrorResponse | PikslotsBaseResponse<UserSummary[]>> {
    const result =
      await this.userUseCaseFactory.findAllUsersInsideBusinessUseCase.execute(
        businessId,
      );

    if (!result.ok) {
      const errorResponse = mapUserError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse(
      await Promise.all(
        result.value.map((u) =>
          UserResponseMapper.toUserSummary(u, this.s3Service),
        ),
      ),
      HttpStatus.OK,
    );
  }

  @GetUserProfileDocs()
  @Get(USER_ENDPOINTS.ME)
  async getUserProfile(
    @Res({ passthrough: true }) res: Response,
  ): Promise<PikslotsBaseErrorResponse | PikslotsBaseResponse<UserSummary>> {
    const result = await this.userUseCaseFactory.getUserProfileUseCase.execute(
      this.securityContext.userId,
    );

    if (!result.ok) {
      const errorResponse = mapUserError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<UserSummary>(
      await UserResponseMapper.toUserSummary(result.value, this.s3Service),
      HttpStatus.OK,
    );
  }

  @UpdateUserProfileDocs()
  @Patch(USER_ENDPOINTS.UPDATE_PROFILE)
  async updateUserProfile(
    @Res({ passthrough: true }) res: Response,
    @Body() dto: UpdateUserProfileDto,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<UpdateUserProfileResponse>
  > {
    const result =
      await this.userUseCaseFactory.updateUserProfileUseCase.execute({
        userId: dto.userId ?? this.securityContext.userId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        email: dto.email,
        role: dto.role,
      });

    if (!result.ok) {
      const errorResponse = mapUserError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<UpdateUserProfileResponse>(
      { message: 'success' },
      HttpStatus.OK,
    );
  }

  @InviteUserDocs()
  @Post(USER_ENDPOINTS.INVITE)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  async inviteUser(
    @Res({ passthrough: true }) res: Response,
    @Body() inviteUserDto: InviteUserDto,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<InviteUserResponse>
  > {
    const result =
      await this.userUseCaseFactory.inviteUserUseCase.execute(inviteUserDto);

    if (!result.ok) {
      const errorResponse = mapUserError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.CREATED);
    return new PikslotsBaseResponse(result.value, HttpStatus.CREATED);
  }

  @LoginUserDocs()
  @Post(USER_ENDPOINTS.LOGIN)
  async loginUser(
    @Res({ passthrough: true }) res: Response,
    @Body()
    loginUserDto: LoginUserDto,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<LoginUserResponse>
  > {
    const result =
      await this.userUseCaseFactory.loginUserUseCase.execute(loginUserDto);

    if (!result.ok) {
      const errorResponse = mapUserError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.cookie('jid', result.value.sessionId, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/',
    });

    res.status(HttpStatus.OK);

    return new PikslotsBaseResponse<LoginUserResponse>(
      { message: 'success' },
      HttpStatus.OK,
    );
  }

  @UpdateUserWorkingHoursDocs()
  @Patch(USER_ENDPOINTS.UPDATE_WORKING_HOURS)
  async updateWorkingHours(
    @Res({ passthrough: true }) res: Response,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserWorkingHoursDto,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<UpdateUserWorkingHoursResponse>
  > {
    const result =
      await this.userUseCaseFactory.updateUserWorkingHoursUseCase.execute({
        userId,
        userWorkingHours: dto,
      });

    if (!result.ok) {
      const errorResponse = mapUserError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const user = result.value;
    const wh = user.userWorkingHours;
    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<UpdateUserWorkingHoursResponse>(
      {
        monday: wh.monday,
        tuesday: wh.tuesday,
        wednesday: wh.wednesday,
        thursday: wh.thursday,
        friday: wh.friday,
        saturday: wh.saturday,
        sunday: wh.sunday,
      },
      HttpStatus.OK,
    );
  }

  @UpdateUserAvatarDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin', 'Enhanced', 'Standard')
  @Patch(USER_ENDPOINTS.UPDATE_AVATAR)
  async updateUserAvatar(
    @Res({ passthrough: true }) res: Response,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserAvatarDto,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<UpdateUserAvatarResponse>
  > {
    const result =
      await this.userUseCaseFactory.updateUserAvatarUseCase.execute({
        userId,
        avatarKey: dto.avatarKey,
      });

    if (!result.ok) {
      const errorResponse = mapUserError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<UpdateUserAvatarResponse>(
      { message: 'success' },
      HttpStatus.OK,
    );
  }

  @Post(USER_ENDPOINTS.REQUEST_INVITE_OTP)
  async requestInviteOtp(
    @Res({ passthrough: true }) res: Response,
    @Body() dto: RequestInviteOtpDto,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<RequestInviteOtpResponse>
  > {
    const result =
      await this.userUseCaseFactory.requestInviteOtpUseCase.execute({
        token: dto.token,
      });

    if (!result.ok) {
      const errorResponse = mapUserError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<RequestInviteOtpResponse>(
      result.value,
      HttpStatus.OK,
    );
  }

  @Post(USER_ENDPOINTS.ACCEPT_INVITE)
  async acceptInvite(
    @Res({ passthrough: true }) res: Response,
    @Body() dto: AcceptInviteDto,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<AcceptInviteResponse>
  > {
    const tokenResult =
      this.jwtInviteService.verifyInviteToken<InviteJwtPayload>(dto.token);
    if (!tokenResult.ok) {
      const errorResponse = mapUserError(tokenResult.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const result = await this.userUseCaseFactory.acceptInviteUseCase.execute({
      userId: tokenResult.value.userId,
      businessId: tokenResult.value.businessId,
      otp: dto.otp,
      newPassword: dto.newPassword,
    });

    if (!result.ok) {
      const errorResponse = mapUserError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<AcceptInviteResponse>(
      result.value,
      HttpStatus.OK,
    );
  }

  @GetFreeSlotsForUserDocs()
  @Get(USER_ENDPOINTS.FREE_SLOTS)
  async getFreeSlotsForUser(
    @Param('userId') userId: string,
    @Query() query: GetFreeSlotsForUserDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<GetFreeSlotsForUserResponse>
  > {
    const result =
      await this.userUseCaseFactory.getFreeSlotsForUserUseCase.execute({
        userId,
        businessId: query.businessId,
        date: query.date,
        durationInMins: query.durationInMins,
        bufferTimeInMins: query.bufferTimeInMins,
        businessTimezone: query.businessTimezone,
      });

    if (!result.ok) {
      const errorResponse = mapUserError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<GetFreeSlotsForUserResponse>(
      result.value,
      HttpStatus.OK,
    );
  }

  @Post(USER_ENDPOINTS.AVAILABLE_DATES)
  async getAvailableDatesForBooking(
    @Param('userId') userId: string,
    @Body() query: GetAvailableDatesDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<GetAvailableDatesForBookingResponse>
  > {
    const result =
      await this.userUseCaseFactory.getAvailableDatesForBookingUseCase.execute({
        userId,
        businessId: query.businessId,
        serviceId: query.serviceId,
        businessTimezone: query.businessTimezone,
      });

    if (!result.ok) {
      const errorResponse = mapUserError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);

    return new PikslotsBaseResponse<GetAvailableDatesForBookingResponse>(
      result.value,
      HttpStatus.OK,
    );
  }

  @LogoutUserDocs()
  @HttpCode(HttpStatus.OK)
  @Post(USER_ENDPOINTS.LOGOUT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PikslotsBaseResponse<LogoutUserResponse>> {
    const jidCookie: unknown = req.cookies?.jid;
    const sessionId = typeof jidCookie === 'string' ? jidCookie : undefined;

    if (sessionId) {
      await this.userUseCaseFactory.logoutUserUseCase.execute({ sessionId });
    }

    res.clearCookie('jid', { path: '/' });

    await this.logUserLogoutAudit();

    return new PikslotsBaseResponse<LogoutUserResponse>(
      { message: 'success' },
      HttpStatus.OK,
    );
  }

  private async logUserLogoutAudit(): Promise<void> {
    const payload: AuditLogJobDataShape = {
      businessId: this.securityContext.businessId,
      userId: this.securityContext.userId,
      userType: 'user',
      action: PIKSLOT_EVENTS.AUDIT_LOG.USER_LOGOUT,
      description: `User ${this.securityContext.userId} logged out`,
      entityType: 'user',
      entityId: this.securityContext.userId,
      occurredAt: new Date().toISOString(),
    };

    await this.auditLogQueue.add(PIKSLOT_EVENTS.AUDIT_LOG.USER_LOGOUT, payload);
  }
}
