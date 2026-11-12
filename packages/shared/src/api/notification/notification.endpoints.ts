export const NOTIFICATION_ENDPOINTS = {
  FIND_ALL: '/notifications',
  MARK_AS_READ: '/notifications/:notificationId/read',
  MARK_ALL_AS_READ: '/notifications/read-all',
} as const;
