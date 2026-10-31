import type { UserRole } from './user';

export interface BaseResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export interface BaseErrorResponse {
  message: string;
  statusCode: number;
  timestamp: string;
}

export interface LoginJwtPayload {
  userId: string;
  role: UserRole;
  businessId: string | null; // incase of platfrom owner no businessId
}

export interface InviteJwtPayload {
  userId: string;
  businessId: string;
}

export interface SessionDeviceContext {
  os: string;
  browser: string;
  country: string;
}

/**
 * Exact message the API sends on a 401 caused by a missing/invalid/expired
 * session (as opposed to a 401 from a business-rule authorization denial).
 * The frontend matches on this to distinguish "log in again" from other 401s.
 */
export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please log in again.';
