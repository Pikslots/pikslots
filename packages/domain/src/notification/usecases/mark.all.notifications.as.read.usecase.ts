import type { InfrastructureError, Result } from '../../shared';
import type { FindNotificationsFilter } from '../repository';

export type MarkAllNotificationsAsReadCommand = Omit<FindNotificationsFilter, 'onlyUnread'>;

export const IMarkAllNotificationsAsReadUseCase = Symbol('IMarkAllNotificationsAsReadUseCase');

export interface MarkAllNotificationsAsReadUseCase {
  execute(command: MarkAllNotificationsAsReadCommand): Promise<Result<void, InfrastructureError>>;
}
