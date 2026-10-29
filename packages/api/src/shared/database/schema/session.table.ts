import { Insertable, Selectable, Updateable } from 'kysely';
import type { UserRole } from '@pikslots/domain';

export interface SessionTable {
  id: string;
  user_id: string;
  business_id: string | null;
  role: UserRole;
  os: string;
  browser: string;
  country: string;
  issued_at: Date;
  expires_at: Date;
}

export type SessionTableSelect = Selectable<SessionTable>;
export type SessionTableInsert = Insertable<SessionTable>;
export type SessionTableUpdate = Updateable<SessionTable>;
