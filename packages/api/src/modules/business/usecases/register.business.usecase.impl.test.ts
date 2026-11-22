import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';
import {
  Business,
  BusinessAlreadyExistsError,
  CreateBusinessCommand,
  err,
  IBusinessRepository,
  InfrastructureError,
} from '@pikslots/domain';
import { RegisterBusinessUseCaseImpl } from './register.business.usecase.impl';
import { BusinessRepositoryTestImpl } from '../repository/business.repository.fake.impl';
import { SecurityContext } from 'src/shared/security/context/security.context';
import {
  AUDIT_LOG_QUEUE,
  PIKSLOT_EVENTS,
} from 'src/shared/queue/jobs/pikslot.events';
import { BUSINESS_TEST_DATA } from '../repository/business.fake.data';

jest.mock('uuid', () => ({
  v7: () => 'mock-generated-id',
}));

function buildCommand(
  overrides: Partial<CreateBusinessCommand> = {},
): CreateBusinessCommand {
  return {
    slug: 'jordans-new-studio',
    name: "Jordan's New Studio",
    industry: 'fitness',
    defaultTimeZone: 'America/New_York',
    ...overrides,
  };
}

describe('RegisterBusinessUseCaseImpl', () => {
  let useCase: RegisterBusinessUseCaseImpl;
  let repository: BusinessRepositoryTestImpl;
  let auditLogQueue: jest.Mocked<Queue>;
  let auditLogAddSpy: jest.SpyInstance;
  let securityContext: SecurityContext;
  let originalData: Business[];

  beforeEach(async () => {
    if (!originalData) originalData = [...BUSINESS_TEST_DATA];
    BUSINESS_TEST_DATA.length = 0;
    BUSINESS_TEST_DATA.push(...originalData);

    securityContext = {
      userId: 'user-platform-owner-1',
      role: 'Platform Owner',
      businessId: null,
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterBusinessUseCaseImpl,
        {
          provide: IBusinessRepository,
          useClass: BusinessRepositoryTestImpl,
        },
        { provide: SecurityContext, useValue: securityContext },
        {
          provide: getQueueToken(AUDIT_LOG_QUEUE),
          useValue: { add: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    useCase = moduleRef.get(RegisterBusinessUseCaseImpl);
    repository = moduleRef.get(IBusinessRepository);
    auditLogQueue = moduleRef.get(getQueueToken(AUDIT_LOG_QUEUE));
    // Captured once here so assertions reference plain variables instead of
    // bare `queue.add` property access, which trips
    // @typescript-eslint/unbound-method on jest mocks.
    auditLogAddSpy = jest.spyOn(auditLogQueue, 'add');
  });

  describe('repository failures', () => {
    it('propagates a BusinessAlreadyExistsError when the slug is already taken', async () => {
      // business-1's fixture slug is 'alices-salon-and-spa'
      const result = await useCase.execute(
        buildCommand({ slug: 'alices-salon-and-spa' }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as BusinessAlreadyExistsError).kind).toBe(
          'business_already_exists',
        );
      }
      expect(auditLogAddSpy).not.toHaveBeenCalled();
    });

    it('propagates an InfrastructureError from save', async () => {
      const infraError: InfrastructureError = {
        kind: 'infrastructure',
        message: 'Failed to save business',
        timestamp: new Date(),
        cause: new Error('boom'),
      };
      jest.spyOn(repository, 'save').mockResolvedValueOnce(err(infraError));

      const result = await useCase.execute(buildCommand());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual(infraError);
      }
      expect(auditLogAddSpy).not.toHaveBeenCalled();
    });
  });

  describe('successful registration', () => {
    it('saves a Business owned and created by the caller from the security context', async () => {
      const command = buildCommand();

      const result = await useCase.execute(command);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ message: 'success' });
      }

      const persisted = BUSINESS_TEST_DATA.find(
        (b) => b.id === 'mock-generated-id',
      );
      expect(persisted).toBeDefined();
      expect(persisted?.ownerId).toBe(securityContext.userId);
      expect(persisted?.createdBy).toBe(securityContext.userId);
      expect(persisted?.slug).toBe(command.slug);
      expect(persisted?.name).toBe(command.name);
      expect(persisted?.industry).toBe(command.industry);
      // Business.create() defaults
      expect(persisted?.status).toBe('pending_setup');
      expect(persisted?.subscriptionStatus).toBe('trialing');
      expect(persisted?.isDeleted).toBe(false);
    });

    it('only enqueues the business registered audit log (no invite event)', async () => {
      await useCase.execute(buildCommand());

      expect(auditLogAddSpy).toHaveBeenCalledTimes(1);
      expect(auditLogAddSpy).toHaveBeenCalledWith(
        PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_REGISTERED,
        expect.objectContaining({
          businessId: 'mock-generated-id',
          userId: securityContext.userId,
          action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_REGISTERED,
        }),
      );
    });
  });
});
