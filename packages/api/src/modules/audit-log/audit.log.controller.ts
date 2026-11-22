import {
  Controller,
  Get,
  HttpStatus,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FindAllAuditLogsDocs } from './docs/audit.log.controller.docs';
import {
  AUDIT_LOG_ENDPOINTS,
  FindAllAuditLogsResponse,
} from '@pikslots/shared';
import { RolesGuard } from 'src/shared/security/guards/roles.guard';
import { Roles } from 'src/shared/security/guards/roles.decorator';
import type { Response } from 'express';
import { FindAllAuditLogsDto } from './dto/find.all.audit.logs.dto';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';
import { PikslotsBaseResponse } from 'src/shared/types/base.response';
import { AuditLogUsecasesFactory } from './factory/audit.log.usecases.factory';
import { mapAuditLogError } from './errors/audit.log.error.map';

@Controller('')
export class AuditLogController {
  constructor(
    private readonly auditLogUsecasesFactory: AuditLogUsecasesFactory,
  ) {}

  @FindAllAuditLogsDocs()
  @UseGuards(RolesGuard)
  @Roles('Platform Owner', 'Business Owner', 'Admin')
  @Get(AUDIT_LOG_ENDPOINTS.FINDALL)
  async findAll(
    @Res({ passthrough: true }) res: Response,
    @Query() query: FindAllAuditLogsDto,
  ): Promise<
    PikslotsBaseErrorResponse | PikslotsBaseResponse<FindAllAuditLogsResponse>
  > {
    const result =
      await this.auditLogUsecasesFactory.findAuditLogsUsecase.execute({
        businessId: query.businessId,
        entityType: query.entityType,
        entityId: query.entityId,
        userId: query.userId,
        action: query.action,
      });

    if (!result.ok) {
      const errorResponse = mapAuditLogError(result.error);
      res.status(errorResponse.statusCode);
      return errorResponse;
    }

    res.status(HttpStatus.OK);
    return new PikslotsBaseResponse<FindAllAuditLogsResponse>(
      result.value.map(({ auditLog: log, user }) => ({
        id: log.id,
        businessId: log.businessId,
        userId: log.userId,
        userType: log.userType,
        action: log.action,
        description: log.description,
        entityType: log.entityType,
        entityId: log.entityId,
        occurredAt: log.occurredAt,
        ipAddress: log.ipAddress,
        metadata: log.metadata,
        createdAt: log.createdAt,
        user,
      })),
      HttpStatus.OK,
    );
  }
}
