import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Customer,
  CustomerAlreadyExistsError,
  CustomerLinks,
  err,
  ICustomerRepository,
  InfrastructureError,
  RegisterCustomerCommand,
  UnauthorizedError,
} from '@pikslots/domain';
import { CUSTOMER_TEST_DATA } from '../repository/customer.test.data';
import { RegisterCustomerUseCaseImpl } from './register.customer.usecase.impl';
import { CustomerRepositoryTestImpl } from '../repository/customer.repository.fake.impl';
import { SecurityContext } from 'src/shared/security/context/security.context';
import { AUDIT_LOG_QUEUE } from 'src/shared/queue/jobs/pikslot.events';

jest.mock('uuid', () => ({
  v7: () => 'mock-generated-id',
}));

const SOCIAL_LINKS: CustomerLinks = {
  Website: '',
  Instagram: '',
  Facebook: '',
  Tiktok: '',
  X: '',
  Youtube: '',
  LinkedIn: '',
};

function buildCommand(
  overrides: Partial<RegisterCustomerCommand> = {},
): RegisterCustomerCommand {
  return {
    name: { firstName: 'New', lastName: 'Customer' },
    profileImageUrl: null,
    email: 'new.customer@example.com',
    additionalEmail: null,
    primaryPhone: '+1-555-1234',
    additionalPhone: null,
    company: null,
    country: 'USA',
    address: null,
    city: 'Austin',
    state: 'TX',
    zipCode: null,
    notes: null,
    customerSocialLinks: SOCIAL_LINKS,
    additionalFields: null,
    businessId: 'business-1',
    createdBy: 'user-business-owner-1',
    ...overrides,
  };
}

describe('RegisterCustomerUseCaseImpl', () => {
  let useCase: RegisterCustomerUseCaseImpl;
  let repository: CustomerRepositoryTestImpl;
  let securityContext: SecurityContext;
  let originalData: Customer[];

  beforeEach(async () => {
    if (!originalData) originalData = [...CUSTOMER_TEST_DATA];
    CUSTOMER_TEST_DATA.length = 0;
    CUSTOMER_TEST_DATA.push(...originalData);

    securityContext = {
      userId: 'user-business-owner-1',
      role: 'Business Owner',
      businessId: 'business-1',
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterCustomerUseCaseImpl,
        {
          provide: ICustomerRepository,
          useClass: CustomerRepositoryTestImpl,
        },
        { provide: SecurityContext, useValue: securityContext },
        {
          provide: getQueueToken(AUDIT_LOG_QUEUE),
          useValue: { add: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    useCase = moduleRef.get(RegisterCustomerUseCaseImpl);
    repository = moduleRef.get(ICustomerRepository);
  });

  describe('authorization', () => {
    it('allows a Platform Owner to register a customer for any business', async () => {
      Object.assign(securityContext, {
        userId: 'user-platform-owner-1',
        role: 'Platform Owner',
        businessId: 'business-999', // different business, shouldn't matter
      });

      const result = await useCase.execute(
        buildCommand({ businessId: 'business-1' }),
      );

      expect(result.ok).toBe(true);
    });

    it('allows a Business Owner to register a customer within their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-business-owner-1',
        role: 'Business Owner',
        businessId: 'business-1',
      });

      const result = await useCase.execute(
        buildCommand({ businessId: 'business-1' }),
      );

      expect(result.ok).toBe(true);
    });

    it('allows an Admin to register a customer within their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-admin-1',
        role: 'Admin',
        businessId: 'business-1',
      });

      const result = await useCase.execute(
        buildCommand({ businessId: 'business-1' }),
      );

      expect(result.ok).toBe(true);
    });

    it('allows an Enhanced user to register a customer within their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-enhanced-1',
        role: 'Enhanced',
        businessId: 'business-1',
      });

      const result = await useCase.execute(
        buildCommand({ businessId: 'business-1' }),
      );

      expect(result.ok).toBe(true);
    });

    it('allows a Standard user to register a customer within their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-standard-1',
        role: 'Standard',
        businessId: 'business-1',
      });

      const result = await useCase.execute(
        buildCommand({ businessId: 'business-1' }),
      );

      expect(result.ok).toBe(true);
    });

    it('denies a Business Owner acting outside their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-business-owner-1',
        role: 'Business Owner',
        businessId: 'business-1',
      });
      const saveSpy = jest.spyOn(repository, 'save');

      const result = await useCase.execute(
        buildCommand({ businessId: 'business-2' }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
      }
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('denies an Admin acting outside their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-admin-1',
        role: 'Admin',
        businessId: 'business-1',
      });
      const saveSpy = jest.spyOn(repository, 'save');

      const result = await useCase.execute(
        buildCommand({ businessId: 'business-2' }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
      }
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('denies an Enhanced user acting outside their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-enhanced-1',
        role: 'Enhanced',
        businessId: 'business-1',
      });
      const saveSpy = jest.spyOn(repository, 'save');

      const result = await useCase.execute(
        buildCommand({ businessId: 'business-2' }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
      }
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('denies a Standard user acting outside their own business', async () => {
      Object.assign(securityContext, {
        userId: 'user-standard-1',
        role: 'Standard',
        businessId: 'business-1',
      });
      const saveSpy = jest.spyOn(repository, 'save');

      const result = await useCase.execute(
        buildCommand({ businessId: 'business-2' }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UnauthorizedError).kind).toBe('unauthorized');
      }
      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('repository failures', () => {
    it('propagates an InfrastructureError from save', async () => {
      const infraError: InfrastructureError = {
        kind: 'infrastructure',
        message: 'Failed to save customer',
        timestamp: new Date(),
        cause: new Error('boom'),
      };
      jest.spyOn(repository, 'save').mockResolvedValueOnce(err(infraError));

      const result = await useCase.execute(buildCommand());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual(infraError);
      }
    });

    // This reflects the REAL repository's actual conflict rule: a unique
    // constraint on (email, businessId). The fake doesn't implement that
    // check (see the next test for what the fake actually does), so we
    // simulate the real behavior directly via a spy.
    it('propagates a CustomerAlreadyExistsError when save reports a duplicate email', async () => {
      const conflictError: CustomerAlreadyExistsError = {
        kind: 'customer_already_exists',
        message: 'A customer with this email already exists for this business',
        timestamp: new Date(),
        email: 'new.customer@example.com',
        businessId: 'business-1',
      };
      jest.spyOn(repository, 'save').mockResolvedValueOnce(err(conflictError));

      const result = await useCase.execute(buildCommand());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as CustomerAlreadyExistsError).kind).toBe(
          'customer_already_exists',
        );
      }
    });

    // NOTE: CustomerRepositoryTestImpl.save() checks for a duplicate by
    // matching `id`, not by (email, businessId) like the real Kysely-backed
    // CustomerRepositoryImpl does. In practice this branch is effectively
    // unreachable via the fake's own logic, because ids come from uuidv7()
    // and never collide -- unless, as here, the id generator is mocked to
    // return an id that already exists in the fixtures. Flagging this as a
    // fake/real behavioral mismatch: the fake will never catch a genuine
    // duplicate-email registration the way the real repository would.
    it('the fake repository only rejects on a colliding id, not a colliding email', async () => {
      // customer-1 already exists in the fixtures
      const uuid = jest.requireMock<{ v7: () => string }>('uuid');
      jest.spyOn(uuid, 'v7').mockReturnValueOnce('customer-1');

      const result = await useCase.execute(
        buildCommand({ email: 'a-completely-different-email@example.com' }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as CustomerAlreadyExistsError).kind).toBe(
          'customer_already_exists',
        );
      }
    });
  });

  describe('successful registration', () => {
    it('builds and saves a Customer entity matching the command', async () => {
      const command = buildCommand({
        name: { firstName: 'New', lastName: 'Customer' },
        email: 'new.customer@example.com',
        businessId: 'business-1',
        createdBy: 'user-business-owner-1',
      });

      const result = await useCase.execute(command);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('mock-generated-id');
        expect(result.value.name).toEqual(command.name);
        expect(result.value.email).toBe(command.email);
        expect(result.value.businessId).toBe(command.businessId);
        expect(result.value.createdBy).toBe(command.createdBy);
        expect(result.value.isDeleted).toBe(false);
      }

      const persisted = CUSTOMER_TEST_DATA.find(
        (c) => c.id === 'mock-generated-id',
      );
      expect(persisted).toBeDefined();
    });
  });
});
