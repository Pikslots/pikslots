import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IUserRepository, UserRole } from '@pikslots/domain';
import { UserRepositoryTestImpl } from '../repository/user.repository.fake.impl';

// Mock uuid to avoid ESM parsing issues
jest.mock('uuid', () => ({
  v7: jest.fn(() => crypto.randomUUID()),
}));

import { SecurityContext } from 'src/shared/security/context/security.context';
import { PikslotEmailService } from 'src/shared/email/pikslot.email.service';
import { JwtInviteService } from 'src/shared/security/jwt/jwt.invite.service';
import { AUDIT_LOG_QUEUE } from 'src/shared/queue/jobs/pikslot.events';
import { InviteUserUsecaseImpl } from './invite.user.usecase.impl';

describe('InviteUserUsecaseImpl', () => {
  const createUseCase = async (
    role: UserRole,
    userId: string,
    businessId: string | null = null,
  ): Promise<InviteUserUsecaseImpl> => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        InviteUserUsecaseImpl,
        {
          provide: IUserRepository,
          useClass: UserRepositoryTestImpl,
        },
        {
          provide: SecurityContext,
          useValue: {
            role,
            userId,
            businessId,
          },
        },
        {
          provide: PikslotEmailService,
          useValue: {
            sendEmail: jest.fn().mockResolvedValue({ ok: true }),
          },
        },
        {
          provide: JwtInviteService,
          useValue: {
            signInviteToken: jest.fn().mockReturnValue('token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('http://frontend'),
          },
        },
        {
          provide: getQueueToken(AUDIT_LOG_QUEUE),
          useValue: { add: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    return moduleRef.get(InviteUserUsecaseImpl);
  };

  const buildCommand = (role: UserRole) => {
    const safeRole = role.toLowerCase().replace(/\s+/g, '-');

    return {
      username: `${safeRole}-${Date.now()}`,
      name: {
        firstName: 'John',
        lastName: 'Doe',
      },
      email: `${safeRole}-${Date.now()}@test.com`,
      phone: '+1000000000',
      role,
      businessId: 'business-1',
      businessName: 'Acme',
    };
  };

  describe('business resolution', () => {
    it("falls back to the inviter's business when none is provided", async () => {
      const useCase = await createUseCase(
        'Platform Owner',
        'user-platform-owner-1',
        'business-1',
      );
      const command = {
        ...buildCommand('Business Owner'),
        businessId: undefined,
      };

      const result = await useCase.execute(command);

      expect(result.ok).toBe(true);
    });

    it('rejects when neither the command nor inviter has a business', async () => {
      const useCase = await createUseCase(
        'Platform Owner',
        'user-platform-owner-1',
      );
      const command = {
        ...buildCommand('Business Owner'),
        businessId: undefined,
      };

      const result = await useCase.execute(command);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe('inviter_not_authorized');
      }
    });
  });

  describe('Platform Owner permissions', () => {
    it.each([
      'Business Owner',
      'Admin',
      'Enhanced',
      'Standard',
      'No Access',
    ] as UserRole[])('can invite %s', async (role) => {
      const useCase = await createUseCase(
        'Platform Owner',
        'user-platform-owner-1',
      );

      const result = await useCase.execute(buildCommand(role));
      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.value.message).toBe('success');
      }
    });
  });

  describe('Business Owner permissions', () => {
    it('cannot invite Platform Owner', async () => {
      const useCase = await createUseCase(
        'Business Owner',
        'user-business-owner-1',
      );

      const result = await useCase.execute(buildCommand('Platform Owner'));

      expect(result.ok).toBe(false);

      if (!result.ok && result.error.kind === 'inviter_not_authorized') {
        expect(result.error.inviterRole).toBe('Business Owner');
        expect(result.error.attemptedRole).toBe('Platform Owner');
      } else {
        throw new Error('Expected inviter_not_authorized error');
      }
    });
  });

  describe('Admin permissions', () => {
    it.each(['Platform Owner', 'Business Owner'] as UserRole[])(
      'cannot invite %s',
      async (role) => {
        const useCase = await createUseCase('Admin', 'user-admin-1');

        const result = await useCase.execute(buildCommand(role));

        expect(result.ok).toBe(false);

        if (!result.ok && result.error.kind === 'inviter_not_authorized') {
          expect(result.error.inviterRole).toBe('Admin');
          expect(result.error.attemptedRole).toBe(role);
        } else {
          throw new Error('Expected inviter_not_authorized error');
        }
      },
    );
  });

  describe('Enhanced, Standard and No Access permissions', () => {
    it.each(['Enhanced', 'Standard', 'No Access'] as UserRole[])(
      '%s cannot invite anyone',
      async (callerRole) => {
        const userId =
          callerRole === 'Enhanced'
            ? 'user-enhanced-1'
            : callerRole === 'Standard'
              ? 'user-standard-1'
              : 'user-no-access-1';

        const useCase = await createUseCase(callerRole, userId);

        const result = await useCase.execute(buildCommand('Standard'));

        expect(result.ok).toBe(false);

        if (!result.ok && result.error.kind === 'inviter_not_authorized') {
          expect(result.error.inviterRole).toBe(callerRole);
          expect(result.error.attemptedRole).toBe('Standard');
        } else {
          throw new Error('Expected inviter_not_authorized error');
        }
      },
    );
  });

  describe('Duplicate user validation', () => {
    it('returns user_already_exists when email exists', async () => {
      const useCase = await createUseCase(
        'Platform Owner',
        'user-platform-owner-1',
      );

      const result = await useCase.execute({
        ...buildCommand('Standard'),
        email: 'alice@pikslots.com',
      });

      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.error.kind).toBe('user_already_exists');
      }
    });

    it('returns user_already_exists when username exists', async () => {
      const useCase = await createUseCase(
        'Platform Owner',
        'user-platform-owner-1',
      );

      const result = await useCase.execute({
        ...buildCommand('Standard'),
        username: 'platform_owner',
      });

      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.error.kind).toBe('user_already_exists');
      }
    });
  });
});
