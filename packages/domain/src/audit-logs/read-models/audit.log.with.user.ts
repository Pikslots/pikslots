import type { AuditLog } from '../audit.log.entity';

export interface AuditLogUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
}

export interface AuditLogWithUser {
  auditLog: AuditLog;
  user: AuditLogUser | null; // null for system actions or users that no longer exist
}
