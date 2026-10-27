import type { ErrorShape } from '../../shared';

/**
 * No session was found for the given lookup value.
 * @example { kind: 'session_not_found', by: 'id', value: '...' }
 */
export type SessionNotFound = ErrorShape & {
  kind: 'session_not_found';
  by: 'id';
  value: string | null;
};
