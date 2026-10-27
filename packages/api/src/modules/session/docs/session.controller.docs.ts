import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';

export const RegisterSessionDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Register a server-side session for the authenticated user',
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Session created successfully',
      schema: {
        example: {
          data: {
            id: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
            userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7c',
            role: 'Admin',
            businessId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7d',
            issuedAt: '2026-10-27T12:00:00.000Z',
            expiresAt: '2026-11-03T12:00:00.000Z',
          },
          statusCode: 201,
          timestamp: '2026-10-27T12:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Caller is not authenticated',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Infrastructure failure',
      type: PikslotsBaseErrorResponse,
    }),
  );

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
            businessId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7d',
            issuedAt: '2026-10-27T12:00:00.000Z',
            expiresAt: '2026-11-03T12:00:00.000Z',
          },
          statusCode: 200,
          timestamp: '2026-10-27T12:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Missing session cookie',
      type: PikslotsBaseErrorResponse,
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
            businessId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7d',
            issuedAt: '2026-10-27T12:00:00.000Z',
            expiresAt: '2026-11-03T12:00:00.000Z',
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
