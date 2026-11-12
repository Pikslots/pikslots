import { Test, TestingModule } from '@nestjs/testing';
import { INotificationRepository } from '@pikslots/domain';
import { NOTIFICATION_TEST_DATA } from '../repository/notification.test.data';
import { NotificationRepositoryTestImpl } from '../repository/notification.repository.fake.impl';
import { MarkAllNotificationsAsReadUseCaseImpl } from './mark.all.notifications.as.read.usecase.impl';

describe('MarkAllNotificationsAsReadUseCaseImpl', () => {
  let useCase: MarkAllNotificationsAsReadUseCaseImpl;
  let originalData: typeof NOTIFICATION_TEST_DATA;

  beforeEach(async () => {
    if (!originalData) originalData = [...NOTIFICATION_TEST_DATA];
    NOTIFICATION_TEST_DATA.length = 0;
    NOTIFICATION_TEST_DATA.push(...originalData);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MarkAllNotificationsAsReadUseCaseImpl,
        {
          provide: INotificationRepository,
          useClass: NotificationRepositoryTestImpl,
        },
      ],
    }).compile();

    useCase = moduleRef.get(MarkAllNotificationsAsReadUseCaseImpl);
  });

  it('marks every notification visible to the caller as read, leaving others untouched', async () => {
    const result = await useCase.execute({
      callerUserId: 'user-standard-1',
      callerBusinessId: 'business-1',
    });

    expect(result.ok).toBe(true);

    const visibleIds = ['notification-1', 'notification-2', 'notification-3'];
    expect(
      NOTIFICATION_TEST_DATA.filter((n) => visibleIds.includes(n.id)).every(
        (n) => n.isRead,
      ),
    ).toBe(true);

    const untouched = NOTIFICATION_TEST_DATA.find(
      (n) => n.id === 'notification-4',
    );
    expect(untouched?.isRead).toBe(false);
  });
});
