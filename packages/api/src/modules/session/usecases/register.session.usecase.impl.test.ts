import { Test, TestingModule } from '@nestjs/testing';
import { ISessionRepository, Session } from '@pikslots/domain';
import { SessionCacheService } from 'src/shared/cache/otp/session.cache.service';
import { SessionRepositoryTestImpl } from '../repository/session.repository.fake.impl';
import { SESSION_TEST_DATA } from '../repository/session.test.data';
import { RegisterSessionUseCaseImpl } from './register.session.usecase.impl';

jest.mock('uuid', () => ({
  v7: () => '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a92',
}));

describe('RegisterSessionUseCaseImpl', () => {
  let useCase: RegisterSessionUseCaseImpl;
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
        RegisterSessionUseCaseImpl,
        { provide: ISessionRepository, useClass: SessionRepositoryTestImpl },
        { provide: SessionCacheService, useValue: cacheService },
      ],
    }).compile();

    useCase = moduleRef.get(RegisterSessionUseCaseImpl);
    repository = moduleRef.get(ISessionRepository);
  });

  it('creates a session with the supplied security context', async () => {
    const result = await useCase.execute({
      userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a90',
      role: 'Admin',
      businessId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a91',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.userId).toBe('01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a90');
    expect(result.value.role).toBe('Admin');
    expect(result.value.businessId).toBe(
      '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a91',
    );
  });

  it('uses the generated uuid v7 as the session id', async () => {
    const result = await useCase.execute({
      userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a90',
      role: 'Standard',
      businessId: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.id).toBe('01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a92');
  });

  it('sets expiresAt using the configured TTL', async () => {
    const result = await useCase.execute({
      userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a90',
      role: 'Admin',
      businessId: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(
      result.value.expiresAt.getTime() - result.value.issuedAt.getTime(),
    ).toBe(604800 * 1000);
  });

  it('persists the session through the repository and caches it', async () => {
    const saveSpy = jest.spyOn(repository, 'save');

    const result = await useCase.execute({
      userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a90',
      role: 'Admin',
      businessId: null,
    });

    expect(result.ok).toBe(true);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    if (result.ok) {
      expect(SESSION_TEST_DATA).toContain(result.value);
      expect(cacheService.save).toHaveBeenCalledWith(result.value);
    }
  });
});
