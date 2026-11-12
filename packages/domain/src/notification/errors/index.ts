import type { ErrorShape } from '../../shared';

/**
 * No notification was found for the given lookup value.
 * @example { kind: 'notification_not_found', by: 'id', value: '...' }
 */
export type NotificationNotFoundError = ErrorShape & {
  kind: 'notification_not_found';
  by: 'id';
  value: string;
};
