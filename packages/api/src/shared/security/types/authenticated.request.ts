import type { Request } from 'express';
import type { UserRole } from '@pikslots/domain';

export interface AuthenticatedActor {
  userId: string;
  role: UserRole;
  businessId: string | null;
}

/**
 * Express request enriched by the session middleware once a session has been
 * verified. Used by cross-cutting concerns (e.g. auditing) that must stay
 * singleton-scoped and therefore cannot inject the request-scoped
 * SecurityContext.
 */
export type AuthenticatedRequest = Request & { actor?: AuthenticatedActor };
