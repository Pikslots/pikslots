import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';

export const GetCurrentSessionDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get the caller's own session, resolved from the jid cookie",
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Session retrieved successfully',
      schema: {
        example: {
          data: {
            id: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
            userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7c',
            role: 'Admin',
            os: 'macOS',
            browser: 'Chrome',
            country: 'PK',
            businessId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7d',
            issuedAt: '2026-10-27T12:00:00.000Z',
            expiresAt: '2026-11-03T12:00:00.000Z',
            isExpired: false,
          },
          statusCode: 200,
          timestamp: '2026-10-27T12:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Missing, invalid, or expired session cookie',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Infrastructure failure',
      type: PikslotsBaseErrorResponse,
    }),
  );

export const GetSessionDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get a session by ID' }),
    ApiParam({
      name: 'id',
      description: 'Session ID',
      example: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Session retrieved successfully',
      schema: {
        example: {
          data: {
            id: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
            userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7c',
            role: 'Admin',
            os: 'macOS',
            browser: 'Chrome',
            country: 'PK',
            businessId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7d',
            issuedAt: '2026-10-27T12:00:00.000Z',
            expiresAt: '2026-11-03T12:00:00.000Z',
            isExpired: false,
          },
          statusCode: 200,
          timestamp: '2026-10-27T12:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Session not found or expired',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Infrastructure failure',
      type: PikslotsBaseErrorResponse,
    }),
  );

export const GetSessionsByUserIdDocs = () =>
  applyDecorators(
    ApiOperation({
      summary:
        'List all sessions for a user. Platform Owner can view any user; Business Owner/Admin only for users in their own business.',
    }),
    ApiParam({
      name: 'userId',
      description: 'User ID',
      example: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7c',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Sessions retrieved successfully',
      schema: {
        example: {
          data: [
            {
              id: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
              userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7c',
              role: 'Admin',
              os: 'macOS',
              browser: 'Chrome',
              country: 'PK',
              businessId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7d',
              issuedAt: '2026-10-27T12:00:00.000Z',
              expiresAt: '2026-11-03T12:00:00.000Z',
              isExpired: false,
            },
          ],
          statusCode: 200,
          timestamp: '2026-10-27T12:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Caller is not allowed to view sessions for this user',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Infrastructure failure',
      type: PikslotsBaseErrorResponse,
    }),
  );

export const DeleteSessionDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Delete a session by ID' }),
    ApiParam({
      name: 'id',
      description: 'Session ID',
      example: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Session deleted successfully',
      schema: {
        example: {
          data: { message: 'success' },
          statusCode: 200,
          timestamp: '2026-10-27T12:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Session not found',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Infrastructure failure',
      type: PikslotsBaseErrorResponse,
    }),
  );
