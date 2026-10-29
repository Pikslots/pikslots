import type { UserRole } from '../user';
import type { SessionDeviceContext } from '../base.types';

export interface SessionSecurityContext {
  userId: string;
  role: UserRole;
  businessId: string | null;
}

export type { SessionDeviceContext };

// --- Responses ---

export interface SessionResponse extends SessionSecurityContext, SessionDeviceContext {
  id: string;
  issuedAt: string;
  expiresAt: string;
  isExpired: boolean;
}

export type GetSessionResponse = SessionResponse;

export type GetSessionsByUserIdResponse = SessionResponse[];

export interface DeleteSessionResponse {
  message: 'success';
}
