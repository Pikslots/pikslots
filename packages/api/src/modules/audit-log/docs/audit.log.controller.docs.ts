import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';

export const FindAllAuditLogsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List audit log entries',
      description:
        'Platform Owners may query across businesses (or filter to one). Business Owner/Admin callers must pass their own businessId.',
    }),
    ApiQuery({
      name: 'businessId',
      required: false,
      description: 'Business to scope results to',
      example: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7d',
    }),
    ApiQuery({
      name: 'entityType',
      required: false,
      description: 'Filter by entity type',
      example: 'user',
    }),
    ApiQuery({
      name: 'entityId',
      required: false,
      description: 'Filter by entity ID',
      example: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7c',
    }),
    ApiQuery({
      name: 'userId',
      required: false,
      description: 'Filter by the user who performed the action',
      example: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7c',
    }),
    ApiQuery({
      name: 'action',
      required: false,
      description: 'Filter by action name',
      example: 'audit.log.user.login',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Audit logs retrieved successfully',
      schema: {
        example: {
          data: [
            {
              id: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
              businessId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7d',
              userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7c',
              userType: 'user',
              action: 'audit.log.user.login',
              description: 'John Doe (john@example.com) logged in',
              entityType: 'user',
              entityId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7c',
              occurredAt: '2026-01-01T09:00:00.000Z',
              ipAddress: '10.0.0.1',
              metadata: null,
              createdAt: '2026-01-01T09:00:00.000Z',
              user: {
                id: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7c',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                username: 'johndoe',
              },
            },
          ],
          statusCode: 200,
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Validation error',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Caller is not authorized to view these audit logs',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Caller role is not permitted to view audit logs',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Infrastructure failure',
      type: PikslotsBaseErrorResponse,
    }),
  );
