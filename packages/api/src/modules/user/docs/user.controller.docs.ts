import { HttpStatus, applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';
import { LoginUserDto } from '../dto/login.user.dto';
import { InviteUserDto } from '../dto/invite.user.dto';
import { UpdateUserWorkingHoursDto } from '../dto/update.user.working.hours.dto';
import { UpdateUserAvatarDto } from '../dto/update.user.avatar.dto';
import { UpdateUserProfileDto } from '../dto/update.user.profile.dto';

export const InviteUserDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Invite a new user to the platform' }),
    ApiBody({ type: InviteUserDto }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'User invited successfully',
      schema: {
        example: {
          data: { message: 'success' },
          statusCode: 201,
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'User with this email or username already exists',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description:
        'Inviter does not have permission to assign the requested role',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Validation error',
      type: PikslotsBaseErrorResponse,
    }),
  );

export const GetUserProfileDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get the authenticated user profile' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'User profile returned successfully',
      schema: {
        example: {
          data: {
            id: 'uuid',
            username: 'afaqjaved',
            email: 'afaq@afaqjaved.com',
            phone: null,
            name: { firstName: 'Afaq', lastName: 'Javed' },
            role: 'Platform Owner',
            avatarUrl: null,
            bookingUrl: 'platform-owner',
          },
          statusCode: 200,
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'User not found',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Account is suspended or inactive',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Missing or invalid access token',
      type: PikslotsBaseErrorResponse,
    }),
  );

export const LoginUserDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Login with username/email and password' }),
    ApiBody({ type: LoginUserDto }),
    ApiResponse({
      status: HttpStatus.OK,
      description:
        'Login successful — session id is set as an httpOnly "jid" cookie',
      schema: {
        example: {
          data: {
            message: 'success',
          },
          statusCode: 200,
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Invalid credentials',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'User not found',
      type: PikslotsBaseErrorResponse,
    }),
  );

export const GetAllBusinessOwnersDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get all users with the Business Owner role' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'List of business owners returned successfully',
      schema: {
        example: {
          data: [
            {
              id: 'uuid',
              username: 'john_doe',
              email: 'john@example.com',
              name: { firstName: 'John', lastName: 'Doe' },
            },
          ],
          statusCode: 200,
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Missing or invalid access token',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Caller is not a Platform Owner',
      type: PikslotsBaseErrorResponse,
    }),
  );

export const GetUsersByRoleDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get all users with a specific role' }),
    ApiQuery({
      name: 'role',
      required: true,
      enum: [
        'Platform Owner',
        'Business Owner',
        'No Access',
        'Standard',
        'Enhanced',
        'Admin',
      ],
      description: 'The role to query users by',
      example: 'Business Owner',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'List of users with the requested role',
      schema: {
        example: {
          data: [
            {
              id: 'uuid',
              username: 'john_doe',
              email: 'john@example.com',
              name: { firstName: 'John', lastName: 'Doe' },
            },
          ],
          statusCode: 200,
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description:
        'Caller does not have permission to query the requested role',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Missing or invalid access token',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid role value',
      type: PikslotsBaseErrorResponse,
    }),
  );

export const LogoutUserDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Logout, delete the session, and clear the session cookie',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Logged out successfully',
      schema: {
        example: {
          data: { message: 'success' },
          statusCode: 200,
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
  );

export const GetBusinessUsersDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get all users belonging to a business' }),
    ApiParam({
      name: 'businessId',
      description: 'Business ID',
      example: 'uuid',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'List of users in the business returned successfully',
      schema: {
        example: {
          data: [
            {
              id: 'uuid',
              username: 'john_doe',
              email: 'john@example.com',
              name: { firstName: 'John', lastName: 'Doe' },
              role: 'Standard',
              phone: '+12025551234',
              bookingUrl: 'https://pikslots.com/john_doe',
              status: 'active',
            },
          ],
          statusCode: 200,
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Caller does not have permission to list business users',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Infrastructure failure',
      type: PikslotsBaseErrorResponse,
    }),
  );

export const UpdateUserWorkingHoursDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Update working hours for a user' }),
    ApiParam({
      name: 'userId',
      description: 'Target user ID',
      example: 'uuid',
    }),
    ApiBody({ type: UpdateUserWorkingHoursDto }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Working hours updated successfully',
      schema: {
        example: {
          data: {
            monday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
            tuesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
            wednesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
            thursday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
            friday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
            saturday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
            sunday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
          },
          statusCode: 200,
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'User not found',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Validation error',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Missing or invalid access token',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Infrastructure failure',
      type: PikslotsBaseErrorResponse,
    }),
  );

export const GetFreeSlotsForUserDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get available booking slots for a user on a given day',
    }),
    ApiParam({
      name: 'userId',
      description: 'Target user ID',
      example: 'uuid',
    }),
    ApiQuery({
      name: 'businessId',
      required: true,
      description: 'Business ID',
      example: 'uuid',
    }),
    ApiQuery({
      name: 'date',
      required: true,
      description: 'Date in YYYY-MM-DD format',
      example: '2026-06-26',
    }),
    ApiQuery({
      name: 'durationInMins',
      required: true,
      description: 'Slot duration in minutes',
      example: 30,
    }),
    ApiQuery({
      name: 'bufferTimeInMins',
      required: true,
      description: 'Buffer time around each booking in minutes',
      example: 10,
    }),
    ApiQuery({
      name: 'businessTimezone',
      required: true,
      description: 'IANA timezone of the caller',
      example: 'Asia/Karachi',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Available slots returned successfully',
      schema: {
        example: {
          data: [
            {
              startTime: '2026-06-26T13:00:00.000Z',
              endTime: '2026-06-26T13:30:00.000Z',
            },
            {
              startTime: '2026-06-26T14:00:00.000Z',
              endTime: '2026-06-26T14:30:00.000Z',
            },
          ],
          statusCode: 200,
          timestamp: '2026-06-26T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'User not found',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Validation error',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Missing or invalid access token',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Infrastructure failure',
      type: PikslotsBaseErrorResponse,
    }),
  );

export const UpdateUserAvatarDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Update avatar image key for a user' }),
    ApiParam({
      name: 'userId',
      description: 'Target user ID',
      example: 'usr_01j...',
    }),
    ApiBody({ type: UpdateUserAvatarDto }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Avatar updated successfully',
      schema: {
        example: {
          data: { message: 'success' },
          statusCode: 200,
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'User not found',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Validation error',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Infrastructure failure',
      type: PikslotsBaseErrorResponse,
    }),
  );

export const UpdateUserProfileDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Update the authenticated user profile' }),
    ApiBody({ type: UpdateUserProfileDto }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Profile updated successfully',
      schema: {
        example: {
          data: { message: 'success' },
          statusCode: 200,
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'User not found',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Validation error',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Missing or invalid access token',
      type: PikslotsBaseErrorResponse,
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Infrastructure failure',
      type: PikslotsBaseErrorResponse,
    }),
  );
