import type { UserRole } from '../user';

export interface SessionSecurityContext {
  userId: string;
  role: UserRole;
  businessId: string | null;
}

// ______Requests____________________
export interface RegisterSessionInput extends SessionSecurityContext {}

// --- Responses ---

export interface SessionResponse extends SessionSecurityContext {
  id: string;
  issuedAt: string;
  expiresAt: string;
}

export type RegisterSessionResponse = SessionResponse;

export type GetSessionResponse = SessionResponse;

export interface DeleteSessionResponse {
  message: 'success';
}
