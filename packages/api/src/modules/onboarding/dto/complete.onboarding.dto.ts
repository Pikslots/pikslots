import { Type } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type {
  BusinessIndustry,
  OnboardingCompleteInput,
  UserRole,
} from '@pikslots/shared';
import {
  PikSlotsEmailValidation,
  PikSlotsEnumValidation,
  PikSlotsPasswordValidation,
  PikSlotsSlugValidation,
  PikSlotsStringValidation,
  PikSlotsTimezoneValidation,
  PikSlotsUsernameValidation,
} from 'src/shared/decorators/validations';

const INDUSTRIES: BusinessIndustry[] = [
  'salon_and_beauty',
  'health_and_wellness',
  'fitness',
  'medical',
  'education',
  'legal',
  'financial',
  'hospitality',
  'retail',
  'other',
];

export class FullNameDto {
  @ApiProperty({ example: 'John' })
  @PikSlotsStringValidation(1, 50)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @PikSlotsStringValidation(1, 50)
  lastName: string;
}

export class OnboardingUserDto {
  @ApiProperty({ example: 'john_doe', minLength: 3, maxLength: 30 })
  @PikSlotsUsernameValidation()
  username: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @PikSlotsPasswordValidation()
  password: string;

  @ApiProperty({ type: FullNameDto })
  @IsObject()
  @ValidateNested()
  @Type(() => FullNameDto)
  name: FullNameDto;

  @ApiProperty({ example: 'john@example.com', maxLength: 100 })
  @PikSlotsEmailValidation()
  email: string;

  @ApiProperty({ example: '+12025551234' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: ['Platform Owner', 'Business Owner'] })
  @PikSlotsEnumValidation(['Platform Owner', 'Business Owner'])
  role: UserRole;
}

export class OnboardingBusinessDto {
  @ApiProperty({ example: 'joes-barbershop', minLength: 3, maxLength: 60 })
  @PikSlotsSlugValidation()
  slug: string;

  @ApiProperty({ example: "Joe's Barbershop", maxLength: 100 })
  @PikSlotsStringValidation(1, 100)
  name: string;

  @ApiProperty({ enum: INDUSTRIES })
  @PikSlotsEnumValidation(INDUSTRIES)
  industry: BusinessIndustry;

  @ApiProperty({ example: 'America/New_York' })
  @PikSlotsTimezoneValidation()
  defaultTimeZone: string;
}

export class CompleteOnboardingDto implements OnboardingCompleteInput {
  @ApiProperty({ type: OnboardingUserDto })
  @IsObject()
  @ValidateNested()
  @Type(() => OnboardingUserDto)
  platformOwner: OnboardingUserDto;

  @ApiProperty({ type: OnboardingBusinessDto })
  @IsObject()
  @ValidateNested()
  @Type(() => OnboardingBusinessDto)
  business: OnboardingBusinessDto;
}
