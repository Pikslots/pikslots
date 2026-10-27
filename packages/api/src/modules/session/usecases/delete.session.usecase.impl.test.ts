import { Test, TestingModule } from '@nestjs/testing';
import { ISessionRepository, Session, SessionNotFound } from '@pikslots/domain';
import { SessionCacheService } from 'src/shared/cache/session/session.cache.service';
import { SessionRepositoryTestImpl } from '../repository/session.repository.fake.impl';
import { SESSION_TEST_DATA } from '../repository/session.test.data';
import { DeleteSessionUseCaseImpl } from './delete.session.usecase.impl';

describe('DeleteSessionUseCaseImpl', () => {
  let useCase: DeleteSessionUseCaseImpl;
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
      get: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteSessionUseCaseImpl,
        { provide: ISessionRepository, useClass: SessionRepositoryTestImpl },
        { provide: SessionCacheService, useValue: cacheService },
      ],
    }).compile();

    useCase = moduleRef.get(DeleteSessionUseCaseImpl);
    repository = moduleRef.get(ISessionRepository);
  });

  it('deletes an existing session', async () => {
    const deleteSpy = jest.spyOn(repository, 'delete');

    const result = await useCase.execute(
      '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
    );

    expect(result.ok).toBe(true);
    expect(deleteSpy).toHaveBeenCalledWith(
      '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
    );
    expect(cacheService.remove).toHaveBeenCalledWith(
      '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
    );
    expect(
      SESSION_TEST_DATA.some(
        (session) => session.id === '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
      ),
    ).toBe(false);
  });

  it('returns session_not_found when the session does not exist', async () => {
    const result = await useCase.execute(
      '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a99',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as SessionNotFound).kind).toBe('session_not_found');
    }
  });
});
