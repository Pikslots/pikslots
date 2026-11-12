// Mirrors packages/ui/src/modules/notifications/data.ts's NotificationKind/NotificationItem
// (minus `read`, which stays client-managed) so the frontend store integration is a near drop-in.
export type NotificationKind = 'booking' | 'team' | 'payment' | 'system';

export interface NotificationPayload {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  body: string[];
  createdAt: string;
  href?: string;
}

export type NotificationTarget =
  | { type: 'user'; userId: string }
  | { type: 'business'; businessId: string };
