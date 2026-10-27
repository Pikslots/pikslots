import { randomUUID } from 'node:crypto';
import type { UserRole } from '@pikslots/domain';
import { Session } from '@pikslots/domain';
import type { SessionCacheService } from '../../src/shared/cache/session/session.cache.service';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Mints a real cache-backed session via the real SessionCacheService, for
 * role-gated real-infra tests. The app's global SessionVerifcationMiddleware
 * resolves the caller's security context from the `jid` cookie by looking
 * the session up in this same cache, so writing it here is what makes the
 * synthetic actor pass as "authenticated" on the next request.
 *
 * `userId` defaults to a fresh random uuid (unchanged behavior for every
 * existing Business/Customer call site that only passes 2-3 args). The
 * Timeoff suite needs to control it explicitly: its authorization rules
 * check `securityContext.userId === <the timeoff's userId>` (an "isSelf"
 * check), which the Business/Customer suites never needed since neither of
 * their domains authorize based on caller identity, only role + business.
 */
export async function tokenFor(
  sessionCacheService: SessionCacheService,
  role: UserRole,
  businessId: string | null = null,
  userId?: string | null,
): Promise<string> {
  const issuedAt = new Date();
  const session = Session.create({
    id: randomUUID(),
    // Several usecases persist securityContext.userId as a real
    // audit_fields.updated_by uuid column, so this must be a real uuid.
    userId: userId ?? randomUUID(),
    role,
    businessId,
    issuedAt,
    expiresAt: new Date(issuedAt.getTime() + SESSION_TTL_MS),
  });

  await sessionCacheService.save(session);

  return session.id;
}

/** Mints a real cache-backed session via the real SessionCacheService, for role-gated real-infra tests. */
export async function tokenForBreak(
  sessionCacheService: SessionCacheService,
  role: UserRole,
  businessId: string | null = null,
  // Some use cases (e.g. Break's canCreateBreak/canUpdateBreak/...) grant
  // access via `isSelf` — the caller's own userId matching the resource's
  // userId — rather than just role/business. Passing a specific userId lets
  // tests sign a token *as* an existing row's owner to exercise that path.
  userId: string = randomUUID(),
): Promise<string> {
  return tokenFor(sessionCacheService, role, businessId, userId);
}

export function authHeader(sessionId: string): Record<string, string> {
  return { Cookie: `jid=${sessionId}` };
}
