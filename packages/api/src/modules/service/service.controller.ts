import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Res,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';
import { PikslotsBaseResponse } from 'src/shared/types/base.response';
import { SecurityContext } from 'src/shared/security/context/security.context';
import { AuditLogInterceptor } from '../audit-log/interceptors/audit.log.interceptor';
import { RolesGuard } from 'src/shared/security/guards/roles.guard';
import { Roles } from 'src/shared/security/guards/roles.decorator';
import { mapServiceError } from './errors/service.errors.map';
import { SERVICE_ENDPOINTS, ServiceResponse } from '@pikslots/shared';
import { RegisterServiceDto } from './dto/register.service.dto';
import {
  RegisterServiceDocs,
  FindAllServicesByBusinessDocs,
  EditServiceDocs,
  DeleteServiceDocs,
  UpdateServiceAvatarDocs,
} from './docs/service.controller.docs';
import { ServiceUseCasesFactory } from './factory/service.usecases.factory';
import {
  RegisterServiceResponse,
  FindAllServicesByBusinessResponse,
  UpdateServiceResponse,
  DeleteServiceResponse,
  UpdateServiceAvatarResponse,
} from '@pikslots/shared';
import { EditServiceDto } from './dto/edit.service.dto';
import { UpdateServiceAvatarDto } from './dto/update.service.avatar.dto';
import { ResponseMapper } from './mappers/service.response.mapper';
import {
  IPikslotS3Service,
  type PikslotS3Service,
} from 'src/shared/s3/s3.service';

@ApiTags('Services')
@Controller('')
@UseInterceptors(AuditLogInterceptor)
export class ServiceController {
  constructor(
    private readonly serviceUseCasesFactory: ServiceUseCasesFactory,
    private readonly securityContext: SecurityContext,
    @Inject(IPikslotS3Service) private readonly s3Service: PikslotS3Service,
  ) {}

  @RegisterServiceDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @Post(SERVICE_ENDPOINTS.REGISTER)
  async registerService(
    @Res({ passthrough: true }) res: Response,
    @Body() dto: RegisterServiceDto,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<RegisterServiceResponse>
  > {
    const result =
      await this.serviceUseCasesFactory.registerServiceUseCase.execute({
        title: dto.title,
        description: dto.description,
        serviceAvatar: dto.serviceAvatar,
        durationInMins: dto.durationInMins,
        bufferTimeInMins: dto.bufferTimeInMins,
        isHiddenFromBookingPage: dto.isHiddenFromBookingPage,
        associatedServiceGroups: dto.associatedServiceGroups,
        associatedUsers: dto.associatedUsers,
        cost: dto.cost,
        businessId: dto.businessId,
        colorCode: dto.colorCode,
        createdBy: this.securityContext.userId,
      });

    if (!result.ok) {
      const errorResponse = mapServiceError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.CREATED);

    return new PikslotsBaseResponse({ message: 'success' }, HttpStatus.CREATED);
  }

  @EditServiceDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @Patch(SERVICE_ENDPOINTS.UPDATE)
  async editService(
    @Res({ passthrough: true }) res: Response,
    @Param('serviceId') serviceId: string,
    @Body() dto: EditServiceDto,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<UpdateServiceResponse>
  > {
    const result = await this.serviceUseCasesFactory.editServiceUseCase.execute(
      {
        id: serviceId,
        title: dto.title,
        description: dto.description,
        serviceAvatar: dto.serviceAvatar,
        durationInMins: dto.durationInMins,
        bufferTimeInMins: dto.bufferTimeInMins,
        cost: dto.cost,
        isHiddenFromBookingPage: dto.isHiddenFromBookingPage,
        associatedServiceGroups: dto.associatedServiceGroups,
        associatedUsers: dto.associatedUsers,
        businessId: dto.businessId,
        colorCode: dto.colorCode,
        updatedBy: this.securityContext.userId,
      },
    );

    if (!result.ok) {
      const errorResponse = mapServiceError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<UpdateServiceResponse>(
      { message: 'success' },
      HttpStatus.OK,
    );
  }

  @DeleteServiceDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @Delete(SERVICE_ENDPOINTS.DELETE)
  async deleteService(
    @Res({ passthrough: true }) res: Response,
    @Param('serviceId') serviceId: string,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<DeleteServiceResponse>
  > {
    const result =
      await this.serviceUseCasesFactory.deleteServiceUseCase.execute(serviceId);

    if (!result.ok) {
      const errorResponse = mapServiceError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);

    return new PikslotsBaseResponse<DeleteServiceResponse>(
      { message: 'success' },
      HttpStatus.OK,
    );
  }

  @FindAllServicesByBusinessDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin', 'Enhanced', 'Standard')
  @Get(SERVICE_ENDPOINTS.FIND_ALL_BY_BUSINESS)
  async findAllByBusiness(
    @Res({ passthrough: true }) res: Response,
    @Param('businessId') businessId: string,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<FindAllServicesByBusinessResponse>
  > {
    const result =
      await this.serviceUseCasesFactory.findAllServicesByBusinessUsecase.execute(
        businessId,
      );

    if (!result.ok) {
      const errorResponse = mapServiceError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    const service: ServiceResponse[] = await Promise.all(
      result.value.map((value) =>
        ResponseMapper.toServiceResponse(this.s3Service, value),
      ),
    );

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<FindAllServicesByBusinessResponse>(
      service.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        serviceAvatar: s.serviceAvatar,
        durationInMins: s.durationInMins,
        bufferTimeInMins: s.bufferTimeInMins,
        cost: s.cost,
        isHiddenFromBookingPage: s.isHiddenFromBookingPage,
        businessId: s.businessId,
        colorCode: s.colorCode,
      })),
      HttpStatus.OK,
    );
  }

  @UpdateServiceAvatarDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @Patch(SERVICE_ENDPOINTS.UPDATE_SERVICE_AVATAR)
  async UpdateServiceAvatar(
    @Res({ passthrough: true }) res: Response,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceAvatarDto,
  ) {
    const result =
      await this.serviceUseCasesFactory.UpdatedServiceAvatarUsecase.execute({
        serviceId,
        avatarKey: dto.avatarKey,
      });

    if (!result.ok) {
      const errorResponse = mapServiceError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }
    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<UpdateServiceAvatarResponse>(
      { message: 'success' },
      HttpStatus.OK,
    );
  }
}
