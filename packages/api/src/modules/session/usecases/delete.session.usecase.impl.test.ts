import { Test, TestingModule } from '@nestjs/testing';
import {
  ISessionRepository,
  Session,
  SessionNotFound,
  UnauthorizedError,
} from '@pikslots/domain';
import { SessionCacheService } from 'src/shared/cache/session/session.cache.service';
import { SecurityContext } from 'src/shared/security/context/security.context';
import { SessionRepositoryTestImpl } from '../repository/session.repository.fake.impl';
import { SESSION_TEST_DATA } from '../repository/session.test.data';
import { DeleteSessionUseCaseImpl } from './delete.session.usecase.impl';

describe('DeleteSessionUseCaseImpl', () => {
  let useCase: DeleteSessionUseCaseImpl;
  let repository: SessionRepositoryTestImpl;
  let cacheService: { save: jest.Mock; remove: jest.Mock; get: jest.Mock };
  let securityContext: SecurityContext;
  let originalData: Session[];

  async function build(context: SecurityContext): Promise<void> {
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
        { provide: SecurityContext, useValue: context },
      ],
    }).compile();

    useCase = moduleRef.get(DeleteSessionUseCaseImpl);
    repository = moduleRef.get(ISessionRepository);
  }

  beforeEach(async () => {
    if (!originalData) originalData = [...SESSION_TEST_DATA];
    SESSION_TEST_DATA.length = 0;
    SESSION_TEST_DATA.push(...originalData);

    securityContext = {
      userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7f',
      role: 'Platform Owner',
      businessId: null,
    };

    await build(securityContext);
  });

  it('deletes an existing session as Platform Owner', async () => {
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

  it('denies a caller from deleting their own session', async () => {
    await build({
      userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7c',
      role: 'Standard',
      businessId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7d',
    });

    const result = await useCase.execute(
      '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
    }
  });

  it('denies a Platform Owner from deleting their own session', async () => {
    await build({
      userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7c',
      role: 'Platform Owner',
      businessId: null,
    });

    const result = await useCase.execute(
      '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
    }
  });

  it('allows a Business Owner to delete a session belonging to their business', async () => {
    await build({
      userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a90',
      role: 'Business Owner',
      businessId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7d',
    });

    const result = await useCase.execute(
      '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
    );

    expect(result.ok).toBe(true);
  });

  it('denies deleting another business’s session', async () => {
    await build({
      userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a90',
      role: 'Business Owner',
      businessId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a99',
    });

    const result = await useCase.execute(
      '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
    }
  });
});
