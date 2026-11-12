import type { NotificationKind } from '@pikslots/domain';

export interface NotificationDispatchInput {
  kind: NotificationKind;
  iconClassName: string; // Tabler icon name, e.g. "calendar-check" (see @tabler/icons-svelte/icons/<name>)
  title: string;
  message: string;
  userId?: string | null;
  businessId?: string | null;
  body?: string[];
  href?: string | null;
}

// Mirrors packages/ui/src/modules/notifications/data.ts's notificationMeta icon choices,
// so callers don't have to repeat the icon name.
export const NOTIFICATION_ICON_CLASS_NAMES: Record<NotificationKind, string> = {
  booking: 'calendar-check',
  team: 'users',
  payment: 'cash',
  system: 'bell',
};
