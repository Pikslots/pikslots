import { Insertable, Selectable, Updateable } from 'kysely';
import type { NotificationKind } from '@pikslots/domain';

export interface NotificationTable {
  id: string;
  user_id: string | null; // fk → users.id, set when addressed to a single user
  business_id: string | null; // fk → businesses.id, set when broadcast business-wide (or to scope a user-targeted notification)
  kind: NotificationKind;
  icon_class_name: string;
  title: string;
  message: string;
  body: string[]; // jsonb
  href: string | null;
  is_read: boolean;
  read_at: Date | null;
  created_at: Date;
}

export type NotificationTableSelect = Selectable<NotificationTable>;
export type NotificationTableInsert = Insertable<NotificationTable>;
export type NotificationTableUpdate = Updateable<NotificationTable>;
