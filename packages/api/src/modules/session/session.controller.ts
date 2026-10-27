import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  DeleteSessionResponse,
  GetSessionResponse,
  RegisterSessionResponse,
  SESSION_ENDPOINTS,
} from '@pikslots/shared';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';
import { PikslotsBaseResponse } from 'src/shared/types/base.response';
import { SecurityContext } from 'src/shared/security/context/security.context';
import { RolesGuard } from 'src/shared/security/guards/roles.guard';
import { Roles } from 'src/shared/security/guards/roles.decorator';
import {
  DeleteSessionDocs,
  GetSessionDocs,
  RegisterSessionDocs,
} from './docs/session.controller.docs';
import { SessionUsecasesFactory } from './factory/session.usecases.factory';
import { mapSessionError } from './errors/session.error.map';
import { SessionResponseMapper } from './mappers/session.response.mapper';

@ApiTags('Sessions')
@Controller('')
export class SessionController {
  constructor(
    private readonly sessionUsecasesFactory: SessionUsecasesFactory,
    private readonly securityContext: SecurityContext,
  ) {}

  @RegisterSessionDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin', 'Enhanced', 'Standard')
  @Post(SESSION_ENDPOINTS.REGISTER)
  async register(
    @Res({ passthrough: true }) res: Response,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<RegisterSessionResponse>
  > {
    const result =
      await this.sessionUsecasesFactory.registerSessionUsecase.execute({
        userId: this.securityContext.userId,
        role: this.securityContext.role,
        businessId: this.securityContext.businessId,
      });

    if (!result.ok) {
      const errorResponse = mapSessionError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.CREATED);
    return new PikslotsBaseResponse<RegisterSessionResponse>(
      SessionResponseMapper.toResponse(result.value),
      HttpStatus.CREATED,
    );
  }

  @GetSessionDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin', 'Enhanced', 'Standard')
  @Get(SESSION_ENDPOINTS.FIND)
  async findById(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<GetSessionResponse>
  > {
    const result =
      await this.sessionUsecasesFactory.getSessionUsecase.execute(id);

    if (!result.ok) {
      const errorResponse = mapSessionError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<GetSessionResponse>(
      SessionResponseMapper.toResponse(result.value),
      HttpStatus.OK,
    );
  }

  @DeleteSessionDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin', 'Enhanced', 'Standard')
  @Delete(SESSION_ENDPOINTS.DELETE)
  async delete(
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<DeleteSessionResponse>
  > {
    const result =
      await this.sessionUsecasesFactory.deleteSessionUsecase.execute(id);

    if (!result.ok) {
      const errorResponse = mapSessionError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<DeleteSessionResponse>(
      { message: 'success' },
      HttpStatus.OK,
    );
  }
}
