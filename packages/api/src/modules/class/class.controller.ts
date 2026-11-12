import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
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
import { mapClassError } from './errors/class.errors.map';
import { CLASS_ENDPOINTS } from '@pikslots/shared';
import { RegisterClassDto } from './dto/register.class.dto';
import { EditClassDto } from './dto/edit.class.dto';
import {
  DeleteClassDocs,
  EditClassDocs,
  FindAllClassesByBusinessDocs,
  RegisterClassDocs,
} from './docs/class.controller.docs';
import { ClassUseCasesFactory } from './factory/class.usecases.factory';
import {
  DeleteClassResponse,
  FindAllClassesByBusinessResponse,
  RegisterClassResponse,
  UpdateClassResponse,
} from '@pikslots/shared';

@ApiTags('Classes')
@Controller('')
@UseInterceptors(AuditLogInterceptor)
export class ClassController {
  constructor(
    private readonly classUseCasesFactory: ClassUseCasesFactory,
    private readonly securityContext: SecurityContext,
  ) {}

  @RegisterClassDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @Post(CLASS_ENDPOINTS.REGISTER)
  async registerClass(
    @Res({ passthrough: true }) res: Response,
    @Body() dto: RegisterClassDto,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<RegisterClassResponse>
  > {
    const result = await this.classUseCasesFactory.registerClassUseCase.execute(
      {
        title: dto.title,
        description: dto.description,
        imagesUrls: dto.imagesUrls,
        durationInMins: dto.durationInMins,
        seats: dto.seats,
        cost: dto.cost,
        isHiddenFromBookingPage: dto.isHiddenFromBookingPage,
        associatedClassGroupIds: dto.associatedClassGroupIds,
        businessId: dto.businessId,
        createdBy: this.securityContext.userId,
      },
    );

    if (!result.ok) {
      const errorResponse = mapClassError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.CREATED);
    return new PikslotsBaseResponse<RegisterClassResponse>(
      { message: 'success' },
      HttpStatus.CREATED,
    );
  }

  @EditClassDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @Patch(CLASS_ENDPOINTS.UPDATE)
  async editClass(
    @Res({ passthrough: true }) res: Response,
    @Param('classId') classId: string,
    @Body() dto: EditClassDto,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<UpdateClassResponse>
  > {
    const result = await this.classUseCasesFactory.editClassUseCase.execute({
      id: classId,
      title: dto.title,
      description: dto.description,
      imagesUrls: dto.imagesUrls,
      durationInMins: dto.durationInMins,
      seats: dto.seats,
      cost: dto.cost,
      isHiddenFromBookingPage: dto.isHiddenFromBookingPage,
      associatedClassGroupIds: dto.associatedClassGroupIds,
      businessId: dto.businessId,
      updatedBy: this.securityContext.userId,
    });

    if (!result.ok) {
      const errorResponse = mapClassError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<UpdateClassResponse>(
      { message: 'success' },
      HttpStatus.OK,
    );
  }

  @DeleteClassDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @Delete(CLASS_ENDPOINTS.DELETE)
  async deleteClass(
    @Res({ passthrough: true }) res: Response,
    @Param('classId') classId: string,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<DeleteClassResponse>
  > {
    const result =
      await this.classUseCasesFactory.deleteClassUseCase.execute(classId);

    if (!result.ok) {
      const errorResponse = mapClassError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<DeleteClassResponse>(
      { message: 'success' },
      HttpStatus.OK,
    );
  }

  @FindAllClassesByBusinessDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin', 'Enhanced', 'Standard')
  @Get(CLASS_ENDPOINTS.FIND_ALL_BY_BUSINESS)
  async findAllByBusiness(
    @Res({ passthrough: true }) res: Response,
    @Param('businessId') businessId: string,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<FindAllClassesByBusinessResponse>
  > {
    const result =
      await this.classUseCasesFactory.findAllClassesByBusinessUseCase.execute(
        businessId,
      );

    if (!result.ok) {
      const errorResponse = mapClassError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<FindAllClassesByBusinessResponse>(
      result.value.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        images: c.images,
        durationInMins: c.durationInMins,
        seats: c.seats,
        cost: c.cost,
        isHiddenFromBookingPage: c.isHiddenFromBookingPage,
        businessId: c.businessId,
      })),
      HttpStatus.OK,
    );
  }
}
