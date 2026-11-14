import { Test, TestingModule } from '@nestjs/testing';
import {
  BusinessNotFoundError,
  BusinessRepository,
  IBusinessRepository,
  ISessionRepository,
  IUserRepository,
  Session,
  SessionRepository,
  User,
  UserRepository,
  err,
  ok,
} from '@pikslots/domain';
import { SessionCacheService } from 'src/shared/cache/session/session.cache.service';
import { SecurityContext } from 'src/shared/security/context/security.context';
import { SwitchUserBusinessUseCaseImpl } from './switch.user.business.usecase.impl';

const OLD_BUSINESS_ID = '019f3a2d-4c7f-7b8e-a2d5-e9f1c3057b84';
const NEW_BUSINESS_ID = '019f3a2d-4c7f-7b8e-a2d5-e9f1c3057b85';

function buildUser(role: User['role'] = 'Platform Owner'): User {
  return User.create({
    id: '019f3a2d-4c7f-7b8e-a2d5-e9f1c3057b86',
    username: 'platform_owner',
    password: 'hashed_password',
    businessId: OLD_BUSINESS_ID,
    name: { firstName: 'Alice', lastName: 'Walker' },
    email: 'alice@pikslots.com',
    role,
    bookingUrl: 'alice-walker',
    createdBy: 'system',
  });
}

function buildSession(id: string, userId: string, expiresAt: Date): Session {
  return Session.create({
    id,
    userId,
    role: 'Platform Owner',
    os: 'macOS',
    browser: 'Chrome',
    country: 'PK',
    businessId: OLD_BUSINESS_ID,
    issuedAt: new Date('2026-01-01T00:00:00.000Z'),
    expiresAt,
  });
}

describe('SwitchUserBusinessUseCaseImpl', () => {
  const userRepository = {
    findById: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<UserRepository>;
  const businessRepository = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<BusinessRepository>;
  const sessionRepository = {
    findAllByUserId: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<SessionRepository>;
  const sessionCacheService = { save: jest.fn() };

  let securityContext: SecurityContext;
  let useCase: SwitchUserBusinessUseCaseImpl;

  beforeEach(async () => {
    jest.clearAllMocks();

    securityContext = {
      role: 'Platform Owner',
      userId: '019f3a2d-4c7f-7b8e-a2d5-e9f1c3057b86',
      businessId: OLD_BUSINESS_ID,
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        SwitchUserBusinessUseCaseImpl,
        { provide: IUserRepository, useValue: userRepository },
        { provide: IBusinessRepository, useValue: businessRepository },
        { provide: ISessionRepository, useValue: sessionRepository },
        { provide: SessionCacheService, useValue: sessionCacheService },
        { provide: SecurityContext, useValue: securityContext },
      ],
    }).compile();

    useCase = moduleRef.get(SwitchUserBusinessUseCaseImpl);
  });

  it('updates the platform owner and all active sessions', async () => {
    const user = buildUser();
    const activeSession = buildSession(
      'session-active',
      user.id,
      new Date('2099-01-01T00:00:00.000Z'),
    );
    const expiredSession = buildSession(
      'session-expired',
      user.id,
      new Date('2020-01-01T00:00:00.000Z'),
    );

    userRepository.findById.mockResolvedValue(ok(user));
    userRepository.update.mockResolvedValue(ok(undefined));
    businessRepository.findById.mockResolvedValue(
      ok({ name: 'New Business' } as never),
    );
    sessionRepository.findAllByUserId.mockResolvedValue(
      ok([activeSession, expiredSession]),
    );
    sessionRepository.update.mockResolvedValue(ok(undefined));

    const result = await useCase.execute({
      userId: user.id,
      businessId: NEW_BUSINESS_ID,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.businessId).toBe(NEW_BUSINESS_ID);
    }

    expect(userRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ businessId: NEW_BUSINESS_ID }),
    );
    expect(sessionRepository.update).toHaveBeenCalledTimes(1);
    expect(sessionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: activeSession.id,
        businessId: NEW_BUSINESS_ID,
      }),
    );
    expect(sessionCacheService.save).toHaveBeenCalledTimes(1);
    expect(sessionCacheService.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: activeSession.id,
        businessId: NEW_BUSINESS_ID,
      }),
    );
  });

  it('rejects callers that are not the Platform Owner', async () => {
    securityContext.role = 'Business Owner';

    const result = await useCase.execute({
      userId: securityContext.userId,
      businessId: NEW_BUSINESS_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('unauthorized');
    expect(userRepository.findById).not.toHaveBeenCalled();
  });

  it('returns user_not_found when the user does not exist', async () => {
    userRepository.findById.mockResolvedValue(ok(null));

    const result = await useCase.execute({
      userId: securityContext.userId,
      businessId: NEW_BUSINESS_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('user_not_found');
  });

  it('returns business_not_found when the target business does not exist', async () => {
    userRepository.findById.mockResolvedValue(ok(buildUser()));
    businessRepository.findById.mockResolvedValue(ok(null));

    const result = await useCase.execute({
      userId: securityContext.userId,
      businessId: NEW_BUSINESS_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as BusinessNotFoundError).kind).toBe(
        'business_not_found',
      );
    }
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('returns infrastructure errors from session updates', async () => {
    const user = buildUser();
    const activeSession = buildSession(
      'session-active',
      user.id,
      new Date('2099-01-01T00:00:00.000Z'),
    );

    userRepository.findById.mockResolvedValue(ok(user));
    userRepository.update.mockResolvedValue(ok(undefined));
    businessRepository.findById.mockResolvedValue(
      ok({ name: 'New Business' } as never),
    );
    sessionRepository.findAllByUserId.mockResolvedValue(ok([activeSession]));
    sessionRepository.update.mockResolvedValue(
      err({
        kind: 'infrastructure',
        message: 'Failed to update session',
        timestamp: new Date(),
        cause: new Error('session update failed'),
      }),
    );

    const result = await useCase.execute({
      userId: user.id,
      businessId: NEW_BUSINESS_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('infrastructure');
    expect(sessionCacheService.save).not.toHaveBeenCalled();
  });
});
