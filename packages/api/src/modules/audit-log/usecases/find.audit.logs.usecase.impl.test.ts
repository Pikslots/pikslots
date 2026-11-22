import { Test, TestingModule } from '@nestjs/testing';
import {
  AuditLog,
  IAuditLogRepository,
  IUserRepository,
  UnauthorizedError,
} from '@pikslots/domain';
import { AUDIT_LOG_TEST_DATA } from '../repository/audit.log.test.data';
import { AuditLogRepositoryTestImpl } from '../repository/audit.log.repository.fake.impl';
import { UserRepositoryTestImpl } from 'src/modules/user/repository/user.repository.fake.impl';
import { FindAuditLogsUseCaseImpl } from './find.audit.logs.usecase.impl';
import { SecurityContext } from 'src/shared/security/context/security.context';

describe('FindAuditLogsUseCaseImpl', () => {
  let useCase: FindAuditLogsUseCaseImpl;
  let repository: AuditLogRepositoryTestImpl;
  let securityContext: SecurityContext;
  let originalData: typeof AUDIT_LOG_TEST_DATA;

  beforeEach(async () => {
    if (!originalData) originalData = [...AUDIT_LOG_TEST_DATA];
    AUDIT_LOG_TEST_DATA.length = 0;
    AUDIT_LOG_TEST_DATA.push(...originalData);

    securityContext = {
      userId: 'user-platform-owner-1',
      role: 'Platform Owner',
      businessId: null,
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        FindAuditLogsUseCaseImpl,
        { provide: IAuditLogRepository, useClass: AuditLogRepositoryTestImpl },
        { provide: IUserRepository, useClass: UserRepositoryTestImpl },
        { provide: SecurityContext, useValue: securityContext },
      ],
    }).compile();

    useCase = moduleRef.get(FindAuditLogsUseCaseImpl);
    repository = moduleRef.get(IAuditLogRepository);
  });

  describe('authorization', () => {
    it('allows a Platform Owner to view audit logs for any business', async () => {
      const result = await useCase.execute({ businessId: 'business-1' });

      expect(result.ok).toBe(true);
    });

    it('allows a Platform Owner to view audit logs across all businesses', async () => {
      const result = await useCase.execute({});

      expect(result.ok).toBe(true);
    });

    it.each(['Business Owner', 'Admin'] as const)(
      'allows a %s to view audit logs for their own business',
      async (role) => {
        Object.assign(securityContext, { role, businessId: 'business-1' });

        const result = await useCase.execute({ businessId: 'business-1' });

        expect(result.ok).toBe(true);
      },
    );

    it.each(['Business Owner', 'Admin'] as const)(
      'denies a %s from viewing audit logs for a different business',
      async (role) => {
        Object.assign(securityContext, { role, businessId: 'business-1' });
        const findAllSpy = jest.spyOn(repository, 'findAll');

        const result = await useCase.execute({ businessId: 'business-2' });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
        }
        expect(findAllSpy).not.toHaveBeenCalled();
      },
    );

    it.each(['Enhanced', 'Standard', 'No Access'] as const)(
      'denies a %s from viewing audit logs even for their own business',
      async (role) => {
        Object.assign(securityContext, { role, businessId: 'business-1' });
        const findAllSpy = jest.spyOn(repository, 'findAll');

        const result = await useCase.execute({ businessId: 'business-1' });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
        }
        expect(findAllSpy).not.toHaveBeenCalled();
      },
    );
  });

  describe('filtering', () => {
    it('returns logs matching the given filter', async () => {
      const result = await useCase.execute({ userId: 'user-standard-1' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(
          result.value.every((a) => a.auditLog.userId === 'user-standard-1'),
        ).toBe(true);
      }
    });

    it('returns all logs when no filter is given', async () => {
      const result = await useCase.execute({});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(AUDIT_LOG_TEST_DATA.length);
      }
    });
  });

  describe('user details', () => {
    it('attaches the acting user to each audit log', async () => {
      const result = await useCase.execute({ userId: 'user-standard-1' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        for (const { user } of result.value) {
          expect(user).toEqual({
            id: 'user-standard-1',
            firstName: 'Eve',
            lastName: 'Davis',
            email: 'eve@acme.com',
            username: 'standard_user',
          });
        }
      }
    });

    it('returns a null user when the actor cannot be found', async () => {
      AUDIT_LOG_TEST_DATA.push(
        AuditLog.reconstitute({
          id: 'audit-log-unknown-user',
          businessId: 'business-1',
          userId: 'user-does-not-exist',
          userType: 'user',
          action: 'audit.log.user.login',
          description: 'Deleted user logged in',
          entityType: 'user',
          entityId: 'user-does-not-exist',
          occurredAt: new Date('2024-06-01T09:00:00Z'),
          ipAddress: null,
          metadata: null,
          createdAt: new Date('2024-06-01T09:00:00Z'),
        }),
      );

      const result = await useCase.execute({ userId: 'user-does-not-exist' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].user).toBeNull();
      }
    });
  });
});
