import { Test, TestingModule } from '@nestjs/testing';
import {
  IBusinessRepository,
  ISessionRepository,
  IUserRepository,
  Session,
  User,
} from '@pikslots/domain';
import { SessionCacheService } from 'src/shared/cache/session/session.cache.service';
import { BusinessRepositoryTestImpl } from '../../business/repository/business.repository.fake.impl';
import { SessionRepositoryTestImpl } from '../../session/repository/session.repository.fake.impl';
import { SESSION_TEST_DATA } from '../../session/repository/session.test.data';
import { UserRepositoryTestImpl } from '../repository/user.repository.fake.impl';
import { USER_TEST_DATA } from '../repository/user.test.data';
import { SwitchBusinessUseCaseImpl } from './switch.business.usecase.impl';

jest.mock('uuid', () => ({
  v7: () => '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6b00',
}));

const PLATFORM_OWNER_ID = 'user-platform-owner-1';
const BUSINESS_OWNER_ID = 'user-business-owner-1';

const makeSession = (id: string, userId: string, role: User['role']) =>
  Session.reconstitute({
    id,
    userId,
    role,
    os: 'macOS',
    browser: 'Chrome',
    country: 'PK',
    businessId: 'business-1',
    issuedAt: new Date('2026-10-27T12:00:00.000Z'),
    expiresAt: new Date('2099-10-27T12:00:00.000Z'),
  });

describe('SwitchBusinessUseCaseImpl', () => {
  let useCase: SwitchBusinessUseCaseImpl;
  let cacheService: {
    save: jest.Mock;
    remove: jest.Mock;
    removeMany: jest.Mock;
    get: jest.Mock;
  };
  let originalSessions: Session[];
  let originalUsers: User[];

  beforeEach(async () => {
    if (!originalSessions) originalSessions = [...SESSION_TEST_DATA];
    if (!originalUsers) originalUsers = [...USER_TEST_DATA];
    SESSION_TEST_DATA.length = 0;
    SESSION_TEST_DATA.push(
      ...originalSessions,
      makeSession('po-session-1', PLATFORM_OWNER_ID, 'Platform Owner'),
      makeSession('po-session-2', PLATFORM_OWNER_ID, 'Platform Owner'),
      makeSession('po-session-3', PLATFORM_OWNER_ID, 'Platform Owner'),
      makeSession('bo-session-1', BUSINESS_OWNER_ID, 'Business Owner'),
    );
    USER_TEST_DATA.length = 0;
    USER_TEST_DATA.push(...originalUsers);

    cacheService = {
      save: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      removeMany: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        SwitchBusinessUseCaseImpl,
        { provide: IUserRepository, useClass: UserRepositoryTestImpl },
        { provide: IBusinessRepository, useClass: BusinessRepositoryTestImpl },
        { provide: ISessionRepository, useClass: SessionRepositoryTestImpl },
        { provide: SessionCacheService, useValue: cacheService },
      ],
    }).compile();

    useCase = moduleRef.get(SwitchBusinessUseCaseImpl);
  });

  it('revokes every session of the user and issues one new session for the new business', async () => {
    const result = await useCase.execute({
      sessionId: 'po-session-1',
      businessId: 'business-2',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.id).toBe('01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6b00');
    expect(result.value.businessId).toBe('business-2');
    expect(result.value.userId).toBe(PLATFORM_OWNER_ID);
    expect(result.value.os).toBe('macOS');

    const remaining = SESSION_TEST_DATA.filter(
      (session) => session.userId === PLATFORM_OWNER_ID,
    );
    expect(remaining.map((session) => session.id)).toEqual([
      '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6b00',
    ]);

    expect(cacheService.removeMany).toHaveBeenCalledWith([
      'po-session-1',
      'po-session-2',
      'po-session-3',
    ]);
    expect(cacheService.save).toHaveBeenCalledWith(result.value);
  });

  it('persists the selected business on the user', async () => {
    await useCase.execute({
      sessionId: 'po-session-1',
      businessId: 'business-2',
    });

    const user = USER_TEST_DATA.find((item) => item.id === PLATFORM_OWNER_ID);
    expect(user?.businessId).toBe('business-2');
  });

  it('does not touch sessions of other users', async () => {
    await useCase.execute({
      sessionId: 'po-session-1',
      businessId: 'business-2',
    });

    expect(
      SESSION_TEST_DATA.some((session) => session.id === 'bo-session-1'),
    ).toBe(true);
  });

  it('rejects callers that are not the platform owner', async () => {
    const result = await useCase.execute({
      sessionId: 'bo-session-1',
      businessId: 'business-2',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('unauthorized');
    expect(
      SESSION_TEST_DATA.some((session) => session.id === 'bo-session-1'),
    ).toBe(true);
  });

  it('returns business_not_found for an unknown business and keeps the sessions', async () => {
    const result = await useCase.execute({
      sessionId: 'po-session-1',
      businessId: 'business-does-not-exist',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('business_not_found');
    expect(
      SESSION_TEST_DATA.filter(
        (session) => session.userId === PLATFORM_OWNER_ID,
      ),
    ).toHaveLength(3);
    expect(cacheService.removeMany).not.toHaveBeenCalled();
  });

  it('returns session_not_found when the current session does not exist', async () => {
    const result = await useCase.execute({
      sessionId: 'missing-session',
      businessId: 'business-2',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('session_not_found');
  });
});
