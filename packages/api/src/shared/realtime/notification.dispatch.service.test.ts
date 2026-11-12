import { Test, TestingModule } from '@nestjs/testing';
import {
  err,
  INotificationRepository,
  InfrastructureError,
} from '@pikslots/domain';
import { NOTIFICATION_TEST_DATA } from '../../modules/notification/repository/notification.test.data';
import { NotificationRepositoryTestImpl } from '../../modules/notification/repository/notification.repository.fake.impl';
import { NotificationDispatchService } from './notification.dispatch.service';
import { NotificationEmitterService } from './notification.emitter.service';

jest.mock('uuid', () => ({
  v7: () => 'mock-generated-id',
}));

describe('NotificationDispatchService', () => {
  let service: NotificationDispatchService;
  let repository: NotificationRepositoryTestImpl;
  let emit: jest.Mock;
  let originalData: typeof NOTIFICATION_TEST_DATA;

  beforeEach(async () => {
    if (!originalData) originalData = [...NOTIFICATION_TEST_DATA];
    NOTIFICATION_TEST_DATA.length = 0;
    NOTIFICATION_TEST_DATA.push(...originalData);

    emit = jest.fn();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDispatchService,
        {
          provide: INotificationRepository,
          useClass: NotificationRepositoryTestImpl,
        },
        { provide: NotificationEmitterService, useValue: { emit } },
      ],
    }).compile();

    service = moduleRef.get(NotificationDispatchService);
    repository = moduleRef.get(INotificationRepository);
  });

  it('persists the notification and emits it to the targeted user', async () => {
    await service.dispatch({
      userId: 'user-standard-1',
      kind: 'booking',
      iconClassName: 'calendar-check',
      title: 'New booking confirmed',
      message: 'Haircut booked for 2024-09-05.',
      body: ['Booking ABC123 has been created.'],
    });

    const persisted = NOTIFICATION_TEST_DATA.find(
      (n) => n.id === 'mock-generated-id',
    );
    expect(persisted).toBeDefined();
    expect(persisted?.userId).toBe('user-standard-1');

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(
      { type: 'user', userId: 'user-standard-1' },
      expect.objectContaining({
        id: 'mock-generated-id',
        title: 'New booking confirmed',
        message: 'Haircut booked for 2024-09-05.',
      }),
    );
  });

  it('emits to the business room when no userId is set', async () => {
    await service.dispatch({
      businessId: 'business-1',
      kind: 'system',
      iconClassName: 'bell',
      title: 'New customer added',
      message: 'Jane Doe was added as a customer.',
    });

    expect(emit).toHaveBeenCalledWith(
      { type: 'business', businessId: 'business-1' },
      expect.objectContaining({ title: 'New customer added' }),
    );
  });

  it('logs and swallows the error instead of throwing when persistence fails', async () => {
    const infraError: InfrastructureError = {
      kind: 'infrastructure',
      message: 'Failed to save notification',
      timestamp: new Date(),
      cause: new Error('boom'),
    };
    jest.spyOn(repository, 'save').mockResolvedValueOnce(err(infraError));

    await expect(
      service.dispatch({
        userId: 'user-standard-1',
        kind: 'booking',
        iconClassName: 'calendar-check',
        title: 'New booking confirmed',
        message: 'Haircut booked for 2024-09-05.',
      }),
    ).resolves.toBeUndefined();

    expect(emit).not.toHaveBeenCalled();
  });
});
