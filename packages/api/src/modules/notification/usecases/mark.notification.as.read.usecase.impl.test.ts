import { Test, TestingModule } from '@nestjs/testing';
import {
  INotificationRepository,
  NotificationNotFoundError,
  UnauthorizedError,
} from '@pikslots/domain';
import { NOTIFICATION_TEST_DATA } from '../repository/notification.test.data';
import { NotificationRepositoryTestImpl } from '../repository/notification.repository.fake.impl';
import { MarkNotificationAsReadUseCaseImpl } from './mark.notification.as.read.usecase.impl';

describe('MarkNotificationAsReadUseCaseImpl', () => {
  let useCase: MarkNotificationAsReadUseCaseImpl;
  let originalData: typeof NOTIFICATION_TEST_DATA;

  beforeEach(async () => {
    if (!originalData) originalData = [...NOTIFICATION_TEST_DATA];
    NOTIFICATION_TEST_DATA.length = 0;
    NOTIFICATION_TEST_DATA.push(...originalData);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MarkNotificationAsReadUseCaseImpl,
        {
          provide: INotificationRepository,
          useClass: NotificationRepositoryTestImpl,
        },
      ],
    }).compile();

    useCase = moduleRef.get(MarkNotificationAsReadUseCaseImpl);
  });

  it('marks an unread notification belonging to the caller as read', async () => {
    const result = await useCase.execute({
      id: 'notification-1',
      callerUserId: 'user-standard-1',
      callerBusinessId: null,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.isRead).toBe(true);
      expect(result.value.readAt).not.toBeNull();
    }

    const persisted = NOTIFICATION_TEST_DATA.find(
      (n) => n.id === 'notification-1',
    );
    expect(persisted?.isRead).toBe(true);
  });

  it('denies a different user from marking a user-targeted notification as read', async () => {
    const result = await useCase.execute({
      id: 'notification-1',
      callerUserId: 'someone-else',
      callerBusinessId: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok)
      expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
  });

  it('allows any caller in the business to mark a business-targeted notification as read', async () => {
    const result = await useCase.execute({
      id: 'notification-3',
      callerUserId: 'some-team-member',
      callerBusinessId: 'business-1',
    });

    expect(result.ok).toBe(true);
  });

  it('returns notification_not_found when the notification does not exist', async () => {
    const result = await useCase.execute({
      id: 'does-not-exist',
      callerUserId: 'user-standard-1',
      callerBusinessId: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as NotificationNotFoundError).kind).toBe(
        'notification_not_found',
      );
    }
  });
});
