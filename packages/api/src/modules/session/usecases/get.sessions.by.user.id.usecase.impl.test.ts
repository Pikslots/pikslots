import { Test, TestingModule } from '@nestjs/testing';
import {
  InfrastructureError,
  ISessionRepository,
  IUserRepository,
  Result,
  Session,
  UnauthorizedError,
  ok,
} from '@pikslots/domain';
import { UserRepositoryTestImpl } from 'src/modules/user/repository/user.repository.fake.impl';
import { SecurityContext } from 'src/shared/security/context/security.context';
import { GetSessionsByUserIdUseCaseImpl } from './get.sessions.by.user.id.usecase.impl';

describe('GetSessionsByUserIdUseCaseImpl', () => {
  let useCase: GetSessionsByUserIdUseCaseImpl;
  let sessionRepository: {
    findAllByUserId: jest.Mock<
      Promise<Result<Session[], InfrastructureError>>,
      [string]
    >;
  };

  async function build(context: SecurityContext): Promise<void> {
    sessionRepository = {
      findAllByUserId: jest
        .fn<Promise<Result<Session[], InfrastructureError>>, [string]>()
        .mockResolvedValue(ok([])),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GetSessionsByUserIdUseCaseImpl,
        { provide: ISessionRepository, useValue: sessionRepository },
        { provide: IUserRepository, useClass: UserRepositoryTestImpl },
        { provide: SecurityContext, useValue: context },
      ],
    }).compile();

    useCase = moduleRef.get(GetSessionsByUserIdUseCaseImpl);
  }

  it('allows a Platform Owner to view sessions for any user', async () => {
    await build({
      userId: 'user-platform-owner-1',
      role: 'Platform Owner',
      businessId: null,
    });

    const result = await useCase.execute('user-admin-1');

    expect(result.ok).toBe(true);
    expect(sessionRepository.findAllByUserId).toHaveBeenCalledWith(
      'user-admin-1',
    );
  });

  it('allows a Business Owner to view sessions for a user in their own business', async () => {
    await build({
      userId: 'user-business-owner-1',
      role: 'Business Owner',
      businessId: 'business-1',
    });

    const result = await useCase.execute('user-admin-1');

    expect(result.ok).toBe(true);
    expect(sessionRepository.findAllByUserId).toHaveBeenCalledWith(
      'user-admin-1',
    );
  });

  it('allows an Admin to view sessions for a user in their own business', async () => {
    await build({
      userId: 'user-admin-1',
      role: 'Admin',
      businessId: 'business-1',
    });

    const result = await useCase.execute('user-standard-1');

    expect(result.ok).toBe(true);
  });

  it('denies a Business Owner viewing sessions for a user in another business', async () => {
    await build({
      userId: 'user-business-owner-1',
      role: 'Business Owner',
      businessId: 'some-other-business',
    });

    const result = await useCase.execute('user-admin-1');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
    }
    expect(sessionRepository.findAllByUserId).not.toHaveBeenCalled();
  });

  it('denies a Standard user from viewing sessions', async () => {
    await build({
      userId: 'user-standard-1',
      role: 'Standard',
      businessId: 'business-1',
    });

    const result = await useCase.execute('user-admin-1');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
    }
  });

  it('denies viewing sessions for a non-existent user', async () => {
    await build({
      userId: 'user-admin-1',
      role: 'Admin',
      businessId: 'business-1',
    });

    const result = await useCase.execute('does-not-exist');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
    }
  });
});
