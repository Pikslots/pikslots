import { Test, TestingModule } from '@nestjs/testing';
import { ISessionRepository, Session, SessionNotFound } from '@pikslots/domain';
import { SessionCacheService } from 'src/shared/cache/session/session.cache.service';
import { SessionRepositoryTestImpl } from '../repository/session.repository.fake.impl';
import {
  EXPIRED_SESSION,
  SESSION_TEST_DATA,
} from '../repository/session.test.data';
import { GetSessionUseCaseImpl } from './get.session.usecase.impl';

describe('GetSessionUseCaseImpl', () => {
  let useCase: GetSessionUseCaseImpl;
  let repository: SessionRepositoryTestImpl;
  let cacheService: { save: jest.Mock; remove: jest.Mock; get: jest.Mock };
  let originalData: Session[];

  beforeEach(async () => {
    if (!originalData) originalData = [...SESSION_TEST_DATA];
    SESSION_TEST_DATA.length = 0;
    SESSION_TEST_DATA.push(...originalData);

    cacheService = {
      save: jest.fn(),
      remove: jest.fn(),
      get: jest.fn().mockResolvedValue(null),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GetSessionUseCaseImpl,
        { provide: ISessionRepository, useClass: SessionRepositoryTestImpl },
        { provide: SessionCacheService, useValue: cacheService },
      ],
    }).compile();

    useCase = moduleRef.get(GetSessionUseCaseImpl);
    repository = moduleRef.get(ISessionRepository);
  });

  it('returns a cached session without hitting the repository', async () => {
    const cached = SESSION_TEST_DATA[0];
    cacheService.get.mockResolvedValue(cached);
    const findSpy = jest.spyOn(repository, 'findById');

    const result = await useCase.execute(cached.id);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(cached.id);
    }
    expect(findSpy).not.toHaveBeenCalled();
  });

  it('returns an existing session by id and caches it on a miss', async () => {
    const result = await useCase.execute(
      '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b');
      expect(cacheService.save).toHaveBeenCalledWith(result.value);
    }
  });

  it('returns session_not_found when the session does not exist', async () => {
    const result = await useCase.execute(
      '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a99',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as SessionNotFound).kind).toBe('session_not_found');
    }
    expect(cacheService.save).not.toHaveBeenCalled();
  });

  it('returns session_not_found for an expired session', async () => {
    SESSION_TEST_DATA.push(EXPIRED_SESSION);

    const result = await useCase.execute(EXPIRED_SESSION.id);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as SessionNotFound).kind).toBe('session_not_found');
    }
    expect(cacheService.save).not.toHaveBeenCalled();
  });
});
