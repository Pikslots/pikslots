import { Test, TestingModule } from '@nestjs/testing';
import {
  BusinessAlreadyExistsError,
  businessOwnerAlreadyExist,
  CompleteOnBoardingCommand,
  err,
  IBusinessRepository,
  IOnboardingRepository,
  IUserRepository,
  InfrastructureError,
  Onboarding,
  PlatformOwnerAlreadyExist,
  UserAlreadyExistsError,
} from '@pikslots/domain';
import { PasswordHashingService } from 'src/shared/security/hashing/password.hashing.service';
import { BusinessRepositoryTestImpl } from '../../business/repository/business.repository.fake.impl';
import { UserRepositoryTestImpl } from '../../user/repository/user.repository.fake.impl';
import { OnboardingRepositoryTestImpl } from '../repository/onboarding.repository.fake.impl';
import { ONBOARDING_TEST_DATA } from '../repository/onboarding.test.data';
import { CompleteOnboardingUseCaseImpl } from './complete.onboarding.usecase.impl';

let mockUuidCounter = 0;

jest.mock('uuid', () => ({
  v7: () => `mock-uuid-${++mockUuidCounter}`,
}));

function buildCommand(
  overrides: Partial<CompleteOnBoardingCommand> = {},
): CompleteOnBoardingCommand {
  return {
    platformOwner: {
      username: 'platform_owner_new',
      password: 'password123',
      name: { firstName: 'Alice', lastName: 'Walker' },
      email: 'alice.new@pikslots.com',
      phone: '+1000000001',
      role: 'Platform Owner',
    },
    businessOwner: {
      username: 'business_owner_new',
      password: 'password123',
      name: { firstName: 'Bob', lastName: 'Smith' },
      email: 'bob.new@acme.com',
      phone: '+1000000002',
      role: 'Business Owner',
    },
    business: {
      slug: 'new-salon-and-spa',
      name: 'New Salon & Spa',
      industry: 'salon_and_beauty',
      defaultTimeZone: 'America/Chicago',
    },
    ...overrides,
  };
}

describe('CompleteOnboardingUseCaseImpl', () => {
  let useCase: CompleteOnboardingUseCaseImpl;
  let userRepository: UserRepositoryTestImpl;
  let businessRepository: BusinessRepositoryTestImpl;
  let onboardingRepository: OnboardingRepositoryTestImpl;
  let passwordHashingService: jest.Mocked<PasswordHashingService>;
  let originalData: Onboarding[];

  beforeEach(async () => {
    mockUuidCounter = 0;
    if (!originalData) originalData = [...ONBOARDING_TEST_DATA];
    ONBOARDING_TEST_DATA.length = 0;
    ONBOARDING_TEST_DATA.push(...originalData);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CompleteOnboardingUseCaseImpl,
        { provide: IUserRepository, useClass: UserRepositoryTestImpl },
        {
          provide: IOnboardingRepository,
          useClass: OnboardingRepositoryTestImpl,
        },
        { provide: IBusinessRepository, useClass: BusinessRepositoryTestImpl },
        {
          provide: PasswordHashingService,
          useValue: { hash: jest.fn() },
        },
      ],
    }).compile();

    useCase = moduleRef.get(CompleteOnboardingUseCaseImpl);
    userRepository = moduleRef.get(IUserRepository);
    businessRepository = moduleRef.get(IBusinessRepository);
    onboardingRepository = moduleRef.get(IOnboardingRepository);
    passwordHashingService = moduleRef.get(PasswordHashingService);
    passwordHashingService.hash.mockResolvedValue('hashed-password');
  });

  describe('validation', () => {
    it('returns platform_owner_already_exist when the platform owner email is taken', async () => {
      const registerSpy = jest.spyOn(
        onboardingRepository,
        'registerOnboarding',
      );

      const result = await useCase.execute(
        buildCommand({
          platformOwner: {
            ...buildCommand().platformOwner,
            email: 'alice@pikslots.com',
          },
        }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as PlatformOwnerAlreadyExist).kind).toBe(
          'platform_owner_already_exist',
        );
        expect((result.error as PlatformOwnerAlreadyExist).field).toBe('email');
      }
      expect(registerSpy).not.toHaveBeenCalled();
    });

    it('returns platform_owner_already_exist when the platform owner username is taken', async () => {
      const registerSpy = jest.spyOn(
        onboardingRepository,
        'registerOnboarding',
      );

      const result = await useCase.execute(
        buildCommand({
          platformOwner: {
            ...buildCommand().platformOwner,
            username: 'platform_owner',
          },
        }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as PlatformOwnerAlreadyExist).kind).toBe(
          'platform_owner_already_exist',
        );
        expect((result.error as PlatformOwnerAlreadyExist).field).toBe(
          'username',
        );
      }
      expect(registerSpy).not.toHaveBeenCalled();
    });

    it('returns business_owner_already_exist when the business owner email is taken', async () => {
      const registerSpy = jest.spyOn(
        onboardingRepository,
        'registerOnboarding',
      );

      const result = await useCase.execute(
        buildCommand({
          businessOwner: {
            ...buildCommand().businessOwner,
            email: 'bob@acme.com',
          },
        }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as businessOwnerAlreadyExist).kind).toBe(
          'business_owner_already_exist',
        );
        expect((result.error as businessOwnerAlreadyExist).field).toBe('email');
      }
      expect(registerSpy).not.toHaveBeenCalled();
    });

    it('returns business_owner_already_exist when the business owner username is taken', async () => {
      const registerSpy = jest.spyOn(
        onboardingRepository,
        'registerOnboarding',
      );

      const result = await useCase.execute(
        buildCommand({
          businessOwner: {
            ...buildCommand().businessOwner,
            username: 'business_owner',
          },
        }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as businessOwnerAlreadyExist).kind).toBe(
          'business_owner_already_exist',
        );
        expect((result.error as businessOwnerAlreadyExist).field).toBe(
          'username',
        );
      }
      expect(registerSpy).not.toHaveBeenCalled();
    });

    it('returns business_already_exists when the business slug is taken', async () => {
      const registerSpy = jest.spyOn(
        onboardingRepository,
        'registerOnboarding',
      );

      const result = await useCase.execute(
        buildCommand({
          business: {
            ...buildCommand().business,
            slug: 'alices-salon-and-spa',
          },
        }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as BusinessAlreadyExistsError).kind).toBe(
          'business_already_exists',
        );
        expect((result.error as BusinessAlreadyExistsError).field).toBe('slug');
      }
      expect(registerSpy).not.toHaveBeenCalled();
    });
  });

  describe('repository failures', () => {
    it('propagates an InfrastructureError from existsByEmail', async () => {
      const infraError: InfrastructureError = {
        kind: 'infrastructure',
        message: 'DB unreachable',
        timestamp: new Date(),
        cause: new Error('boom'),
      };
      jest
        .spyOn(userRepository, 'existsByEmail')
        .mockResolvedValueOnce(err(infraError));

      const result = await useCase.execute(buildCommand());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual(infraError);
      }
    });

    it('propagates an InfrastructureError from existsBySlug', async () => {
      const infraError: InfrastructureError = {
        kind: 'infrastructure',
        message: 'DB unreachable',
        timestamp: new Date(),
        cause: new Error('boom'),
      };
      jest
        .spyOn(businessRepository, 'existsBySlug')
        .mockResolvedValueOnce(err(infraError));

      const result = await useCase.execute(buildCommand());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual(infraError);
      }
    });

    it('propagates an InfrastructureError from registerOnboarding', async () => {
      const infraError: InfrastructureError = {
        kind: 'infrastructure',
        message: 'Failed to save user',
        timestamp: new Date(),
        cause: new Error('boom'),
      };
      jest
        .spyOn(onboardingRepository, 'registerOnboarding')
        .mockResolvedValueOnce(err(infraError));

      const result = await useCase.execute(buildCommand());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual(infraError);
      }
    });

    it('propagates a UserAlreadyExistsError from registerOnboarding', async () => {
      const alreadyExistsError: UserAlreadyExistsError = {
        kind: 'user_already_exists',
        message: 'A user with this email already exists',
        timestamp: new Date(),
        field: 'email',
      };
      jest
        .spyOn(onboardingRepository, 'registerOnboarding')
        .mockResolvedValueOnce(err(alreadyExistsError));

      const result = await useCase.execute(buildCommand());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result.error as UserAlreadyExistsError).kind).toBe(
          'user_already_exists',
        );
      }
    });
  });

  describe('successful onboarding', () => {
    it('hashes both passwords with the hashing service', async () => {
      const command = buildCommand();

      await useCase.execute(command);

      expect(passwordHashingService.hash).toHaveBeenCalledTimes(2);
      expect(passwordHashingService.hash).toHaveBeenCalledWith(
        command.platformOwner.password,
      );
      expect(passwordHashingService.hash).toHaveBeenCalledWith(
        command.businessOwner.password,
      );
    });

    it('registers an Onboarding entity matching the command', async () => {
      const command = buildCommand();
      const registerSpy = jest.spyOn(
        onboardingRepository,
        'registerOnboarding',
      );

      const result = await useCase.execute(command);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ message: 'success' });
      }

      expect(registerSpy).toHaveBeenCalledTimes(1);
      const [onboarding] = registerSpy.mock.calls[0];

      expect(onboarding.platformOwner.id).toBe('mock-uuid-1');
      expect(onboarding.platformOwner.username).toBe(
        command.platformOwner.username,
      );
      expect(onboarding.platformOwner.password).toBe('hashed-password');
      expect(onboarding.platformOwner.email).toBe(command.platformOwner.email);
      expect(onboarding.platformOwner.businessId).toBe('mock-uuid-3');
      expect(onboarding.platformOwner.createdBy).toBe('mock-uuid-1');

      expect(onboarding.businessOwner.id).toBe('mock-uuid-2');
      expect(onboarding.businessOwner.username).toBe(
        command.businessOwner.username,
      );
      expect(onboarding.businessOwner.password).toBe('hashed-password');
      expect(onboarding.businessOwner.email).toBe(command.businessOwner.email);
      expect(onboarding.businessOwner.businessId).toBe('mock-uuid-3');
      expect(onboarding.businessOwner.createdBy).toBe('mock-uuid-1');

      expect(onboarding.business.id).toBe('mock-uuid-3');
      expect(onboarding.business.ownerId).toBe('mock-uuid-2');
      expect(onboarding.business.slug).toBe(command.business.slug);
      expect(onboarding.business.name).toBe(command.business.name);
      expect(onboarding.business.industry).toBe(command.business.industry);
      expect(onboarding.business.locationDetails.timeZone).toBe(
        command.business.defaultTimeZone,
      );
      expect(onboarding.business.createdBy).toBe('mock-uuid-1');
    });

    it('persists the onboarding in the fake repository', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.ok).toBe(true);

      const persisted = ONBOARDING_TEST_DATA.find(
        (o) => o.platformOwner.id === 'mock-uuid-1',
      );
      expect(persisted).toBeDefined();
      expect(persisted?.businessOwner.id).toBe('mock-uuid-2');
      expect(persisted?.business.id).toBe('mock-uuid-3');
    });
  });
});
