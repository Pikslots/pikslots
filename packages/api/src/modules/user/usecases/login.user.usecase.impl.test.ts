import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import {
  InfrastructureError,
  ISessionRepository,
  IUserRepository,
  Result,
  Session,
  ok,
} from '@pikslots/domain';
import { UserRepositoryTestImpl } from '../repository/user.repository.fake.impl';
import { LoginUserUseCaseImpl } from './login.user.usecase.impl';
import { SessionCacheService } from 'src/shared/cache/session/session.cache.service';
import { PasswordHashingService } from 'src/shared/security/hashing/password.hashing.service';
import { AUDIT_LOG_QUEUE } from 'src/shared/queue/jobs/pikslot.events';

jest.mock('uuid', () => ({
  v7: () => '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a92',
}));

describe('LoginUserUseCaseImpl', () => {
  let useCase: LoginUserUseCaseImpl;
  let hash: jest.Mocked<PasswordHashingService>;
  let sessionRepository: {
    save: jest.Mock<Promise<Result<void, InfrastructureError>>, [Session]>;
  };
  let sessionCacheService: { save: jest.Mock };

  beforeEach(async () => {
    sessionRepository = {
      save: jest
        .fn<Promise<Result<void, InfrastructureError>>, [Session]>()
        .mockResolvedValue(ok(undefined)),
    };
    sessionCacheService = { save: jest.fn().mockResolvedValue(undefined) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUserUseCaseImpl,
        { provide: IUserRepository, useClass: UserRepositoryTestImpl },
        { provide: ISessionRepository, useValue: sessionRepository },
        { provide: SessionCacheService, useValue: sessionCacheService },
        { provide: PasswordHashingService, useValue: { compare: jest.fn() } },
        {
          provide: getQueueToken(AUDIT_LOG_QUEUE),
          useValue: { add: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    useCase = moduleRef.get(LoginUserUseCaseImpl);
    hash = moduleRef.get(PasswordHashingService);
  });

  it('returns a session id when credentials are valid (by username)', async () => {
    (hash.compare as jest.Mock).mockResolvedValue(true);

    const result = await useCase.execute({
      usernameOrEmail: 'admin_user_2',
      password: 'pw',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sessionId).toBeDefined();
    }
  });

  it('persists the session through the repository and caches it', async () => {
    (hash.compare as jest.Mock).mockResolvedValue(true);

    const result = await useCase.execute({
      usernameOrEmail: 'admin_user_2',
      password: 'pw',
    });

    expect(result.ok).toBe(true);
    expect(sessionRepository.save).toHaveBeenCalledTimes(1);
    expect(sessionCacheService.save).toHaveBeenCalledTimes(1);
    if (result.ok) {
      const savedSession = sessionRepository.save.mock.calls[0][0];
      expect(savedSession.id).toBe(result.value.sessionId);
    }
  });

  it('returns unauthorized when password mismatch', async () => {
    (hash.compare as jest.Mock).mockResolvedValue(false);

    const result = await useCase.execute({
      usernameOrEmail: 'admin_user',
      password: 'bad',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('unauthorized');
    if (!result.ok) {
      expect(result.error.kind).toBe('unauthorized');
      expect(result.error.message).toBeDefined();
    }
  });

  it('returns user_no_access when user role is No Access', async () => {
    (hash.compare as jest.Mock).mockResolvedValue(true);

    const result = await useCase.execute({
      usernameOrEmail: 'no_access_user',
      password: 'pw',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('user_no_access');
    if (!result.ok) {
      expect(result.error.kind).toBe('user_no_access');
      expect(result.error.message).toBeDefined();
    }
  });

  it('returns user_inactive when user is inactive', async () => {
    (hash.compare as jest.Mock).mockResolvedValue(true);

    const result = await useCase.execute({
      usernameOrEmail: 'inactive_user',
      password: 'pw',
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.kind).toBe('user_inactive');
    }
  });

  it('returns user_suspended when user is suspended', async () => {
    (hash.compare as jest.Mock).mockResolvedValue(true);

    const result = await useCase.execute({
      usernameOrEmail: 'suspended_user',
      password: 'pw',
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.kind).toBe('user_suspended');
    }
  });

  it('returns user_invited_error when user is invited', async () => {
    (hash.compare as jest.Mock).mockResolvedValue(true);

    const result = await useCase.execute({
      usernameOrEmail: 'invited_user',
      password: 'pw',
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.kind).toBe('user_invited');
    }
  });
});
