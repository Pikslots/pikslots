// Mirrors @pikslots/domain's NotificationKind.
export type NotificationKind = 'booking' | 'team' | 'payment' | 'system';

// --- Request types ---

export interface FindNotificationsQuery {
  onlyUnread?: boolean;
}

// --- Response types ---

export interface NotificationResponse {
  id: string;
  kind: NotificationKind;
  iconClassName: string;
  title: string;
  message: string;
  body: string[];
  href: string | null;
  isRead: boolean;
  readAt: string | null;
  userId: string | null;
  businessId: string | null;
  createdAt: string;
}

export type FindNotificationsResponse = NotificationResponse[];

export interface MarkNotificationAsReadResponse {
  message: 'success';
}

export interface MarkAllNotificationsAsReadResponse {
  message: 'success';
}
