import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  DeleteSessionResponse,
  GetSessionResponse,
  GetSessionsByUserIdResponse,
  SESSION_ENDPOINTS,
  SESSION_EXPIRED_MESSAGE,
} from '@pikslots/shared';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';
import { PikslotsBaseResponse } from 'src/shared/types/base.response';
import { RolesGuard } from 'src/shared/security/guards/roles.guard';
import { Roles } from 'src/shared/security/guards/roles.decorator';
import {
  DeleteSessionDocs,
  GetCurrentSessionDocs,
  GetSessionDocs,
  GetSessionsByUserIdDocs,
} from './docs/session.controller.docs';
import { SessionUsecasesFactory } from './factory/session.usecases.factory';
import { mapSessionError } from './errors/session.error.map';
import { SessionResponseMapper } from './mappers/session.response.mapper';

@ApiTags('Sessions')
@Controller('')
export class SessionController {
  constructor(
    private readonly sessionUsecasesFactory: SessionUsecasesFactory,
  ) {}

  @GetCurrentSessionDocs()
  @Get(SESSION_ENDPOINTS.ME)
  async findCurrent(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<GetSessionResponse>
  > {
    const jidCookie: unknown = req.cookies?.jid;
    const sessionId = typeof jidCookie === 'string' ? jidCookie : undefined;

    if (!sessionId) {
      res.status(HttpStatus.UNAUTHORIZED);
      return new PikslotsBaseErrorResponse(
        SESSION_EXPIRED_MESSAGE,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const result =
      await this.sessionUsecasesFactory.getSessionUsecase.execute(sessionId);

    if (!result.ok) {
      if (result.error.kind === 'session_not_found') {
        res.status(HttpStatus.UNAUTHORIZED);
        return new PikslotsBaseErrorResponse(
          SESSION_EXPIRED_MESSAGE,
          HttpStatus.UNAUTHORIZED,
        );
      }

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

  @GetSessionsByUserIdDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @Get(SESSION_ENDPOINTS.FIND_BY_USER)
  async findByUserId(
    @Res({ passthrough: true }) res: Response,
    @Param('userId') userId: string,
  ): Promise<
    | PikslotsBaseErrorResponse
    | PikslotsBaseResponse<GetSessionsByUserIdResponse>
  > {
    const result =
      await this.sessionUsecasesFactory.getSessionsByUserIdUsecase.execute(
        userId,
      );

    if (!result.ok) {
      const errorResponse = mapSessionError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<GetSessionsByUserIdResponse>(
      result.value.map((session) => SessionResponseMapper.toResponse(session)),
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
