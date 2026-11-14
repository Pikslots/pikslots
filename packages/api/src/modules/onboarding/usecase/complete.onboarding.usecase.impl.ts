import { Inject, Injectable } from '@nestjs/common';
import {
  BusinessAlreadyExistsError,
  businessOwnerAlreadyExist,
  CompleteOnBoardingCommand,
  CompleteOnBoardingUseCase,
  err,
  ok,
  IBusinessRepository,
  InfrastructureError,
  IOnboardingRepository,
  IUserRepository,
  Onboarding,
  PlatformOwnerAlreadyExist,
  Result,
} from '@pikslots/domain';
import type {
  BusinessRepository,
  OnboardingRepository,
  UserAlreadyExistsError,
  UserRepository,
} from '@pikslots/domain';
import { PasswordHashingService } from 'src/shared/security/hashing/password.hashing.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class CompleteOnboardingUseCaseImpl implements CompleteOnBoardingUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: UserRepository,
    @Inject(IOnboardingRepository)
    private readonly onboardingRepository: OnboardingRepository,
    @Inject(IBusinessRepository)
    private readonly businessRepository: BusinessRepository,
    private readonly passwordHasingService: PasswordHashingService,
  ) {}

  async execute(
    command: CompleteOnBoardingCommand,
  ): Promise<
    Result<
      { message: 'success' },
      | UserAlreadyExistsError
      | PlatformOwnerAlreadyExist
      | businessOwnerAlreadyExist
      | BusinessAlreadyExistsError
      | InfrastructureError
    >
  > {
    const emailExists = await this.userRepository.existsByEmail(
      command.platformOwner.email,
    );

    if (!emailExists.ok) return err(emailExists.error);

    if (emailExists.value) {
      return err<PlatformOwnerAlreadyExist>({
        kind: 'platform_owner_already_exist',
        message: 'A platform owner is already registered',
        field: 'email',
        timestamp: new Date(),
      });
    }

    const usernameExists = await this.userRepository.existsByUsername(
      command.platformOwner.username,
    );
    if (!usernameExists.ok) return err(usernameExists.error);

    if (usernameExists.value) {
      return err<PlatformOwnerAlreadyExist>({
        kind: 'platform_owner_already_exist',
        message: 'A platform owner is already registered',
        field: 'username',
        timestamp: new Date(),
      });
    }

    const businessOwnerEmailExists = await this.userRepository.existsByEmail(
      command.businessOwner.email,
    );

    if (!businessOwnerEmailExists.ok)
      return err(businessOwnerEmailExists.error);

    if (businessOwnerEmailExists.value) {
      return err<businessOwnerAlreadyExist>({
        kind: 'business_owner_already_exist',
        message: 'A business owner is aready registered',
        field: 'email',
        timestamp: new Date(),
      });
    }

    const businessOwnerUsernameExists =
      await this.userRepository.existsByUsername(
        command.businessOwner.username,
      );
    if (!businessOwnerUsernameExists.ok)
      return err(businessOwnerUsernameExists.error);

    if (businessOwnerUsernameExists.value) {
      return err<businessOwnerAlreadyExist>({
        kind: 'business_owner_already_exist',
        message: 'A business owner is aready registered',
        field: 'username',
        timestamp: new Date(),
      });
    }

    const businessAlreadyExistBySlug =
      await this.businessRepository.existsBySlug(command.business.slug);

    if (!businessAlreadyExistBySlug.ok)
      return err(businessAlreadyExistBySlug.error);

    if (businessAlreadyExistBySlug.value) {
      return err<BusinessAlreadyExistsError>({
        kind: 'business_already_exists',
        message: 'business with this name is already exist',
        field: 'slug',
        timestamp: new Date(),
      });
    }

    const platformOwnerHashPasswrod = await this.passwordHasingService.hash(
      command.platformOwner.password,
    );
    const businessOwnerHashPassword = await this.passwordHasingService.hash(
      command.businessOwner.password,
    );

    const PlatformOwneruuid = uuidv7();
    const businessOwneruuid = uuidv7();
    const businessuuid = uuidv7();

    const onboarding = Onboarding.create({
      platformOwner: {
        id: PlatformOwneruuid,
        username: command.platformOwner.username,
        password: platformOwnerHashPasswrod,
        name: command.platformOwner.name,
        email: command.platformOwner.email,
        phone: command.platformOwner.phone ?? undefined,
        status: 'active',
        role: command.platformOwner.role,
        businessId: businessuuid,
        bookingUrl: '',
        createdBy: PlatformOwneruuid,
      },
      businessOwner: {
        id: businessOwneruuid,
        username: command.businessOwner.username,
        password: businessOwnerHashPassword,
        name: command.businessOwner.name,
        email: command.businessOwner.email,
        phone: command.businessOwner.phone ?? undefined,
        status: 'active',
        role: command.businessOwner.role,
        businessId: businessuuid,
        bookingUrl: '',
        createdBy: PlatformOwneruuid,
      },
      business: {
        id: businessuuid,
        ownerId: businessOwneruuid,
        slug: command.business.slug,
        name: command.business.name,
        industry: command.business.industry,
        defaultTimeZone: command.business.defaultTimeZone,
        createdBy: PlatformOwneruuid,
      },
    });

    const result =
      await this.onboardingRepository.registerOnboarding(onboarding);

    if (!result.ok) return err(result.error);

    return ok({ message: 'success' });
  }
}
