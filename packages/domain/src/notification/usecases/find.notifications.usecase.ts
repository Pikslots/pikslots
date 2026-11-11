import type { InfrastructureError, Result } from '../../shared';
import type { FindNotificationsFilter } from '../repository';
import type { Notification } from '../notification.entity';

export type FindNotificationsCommand = FindNotificationsFilter;

export const IFindNotificationsUseCase = Symbol('IFindNotificationsUseCase');

export interface FindNotificationsUseCase {
  execute(command: FindNotificationsCommand): Promise<Result<Notification[], InfrastructureError>>;
}
