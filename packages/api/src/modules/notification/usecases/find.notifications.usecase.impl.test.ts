import { Test, TestingModule } from '@nestjs/testing';
import { INotificationRepository } from '@pikslots/domain';
import { NOTIFICATION_TEST_DATA } from '../repository/notification.test.data';
import { NotificationRepositoryTestImpl } from '../repository/notification.repository.fake.impl';
import { FindNotificationsUseCaseImpl } from './find.notifications.usecase.impl';

describe('FindNotificationsUseCaseImpl', () => {
  let useCase: FindNotificationsUseCaseImpl;
  let originalData: typeof NOTIFICATION_TEST_DATA;

  beforeEach(async () => {
    if (!originalData) originalData = [...NOTIFICATION_TEST_DATA];
    NOTIFICATION_TEST_DATA.length = 0;
    NOTIFICATION_TEST_DATA.push(...originalData);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        FindNotificationsUseCaseImpl,
        {
          provide: INotificationRepository,
          useClass: NotificationRepositoryTestImpl,
        },
      ],
    }).compile();

    useCase = moduleRef.get(FindNotificationsUseCaseImpl);
  });

  it('returns notifications addressed to the caller and to their business', async () => {
    const result = await useCase.execute({
      callerUserId: 'user-standard-1',
      callerBusinessId: 'business-1',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.map((n) => n.id).sort()).toEqual(
        ['notification-1', 'notification-2', 'notification-3'].sort(),
      );
    }
  });

  it('excludes business-wide notifications when the caller has no business', async () => {
    const result = await useCase.execute({
      callerUserId: 'user-standard-1',
      callerBusinessId: null,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.map((n) => n.id).sort()).toEqual(
        ['notification-1', 'notification-2'].sort(),
      );
    }
  });

  it('filters to unread only when onlyUnread is set', async () => {
    const result = await useCase.execute({
      callerUserId: 'user-standard-1',
      callerBusinessId: 'business-1',
      onlyUnread: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.every((n) => !n.isRead)).toBe(true);
      expect(result.value.map((n) => n.id).sort()).toEqual(
        ['notification-1', 'notification-3'].sort(),
      );
    }
  });
});
