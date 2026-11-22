// ______Requests____________________

/**
 * Non-Platform-Owner callers must pass their own businessId (enforced
 * server-side); omitting it lets a Platform Owner query across businesses.
 */
export interface FindAllAuditLogsQuery {
  businessId?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
}

// --- Responses ---

export interface AuditLogUserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
}

export interface AuditLogResponse {
  id: string;
  businessId: string | null;
  userId: string;
  userType: 'user' | 'system';
  action: string;
  description: string;
  entityType: string;
  entityId: string;
  occurredAt: Date;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  user: AuditLogUserResponse | null; // null for system actions or users that no longer exist
}

export type FindAllAuditLogsResponse = AuditLogResponse[];
