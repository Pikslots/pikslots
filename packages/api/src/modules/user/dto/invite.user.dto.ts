import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FullNameInput, InviteUserInput } from '@pikslots/shared';
import {
  PikSlotsEmailValidation,
  PikSlotsEnumValidation,
  PikSlotsOptionalStringValidation,
  PikSlotsPhoneValidation,
  PikSlotsStringValidation,
  PikSlotsUUIDValidation,
  PikSlotsUsernameValidation,
} from 'src/shared/decorators/validations';
import type { UserRole } from '@pikslots/domain';

export class FullNameDto implements FullNameInput {
  @ApiProperty({ example: 'John' })
  @PikSlotsStringValidation(1, 50)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @PikSlotsStringValidation(1, 50)
  lastName: string;
}

export class InviteUserDto implements InviteUserInput {
  @ApiProperty({ example: 'john_doe', minLength: 3, maxLength: 30 })
  @PikSlotsUsernameValidation()
  username: string;

  @ApiProperty({ example: 'john@example.com', maxLength: 100 })
  @PikSlotsEmailValidation()
  email: string;

  @ApiProperty({ type: FullNameDto })
  @ValidateNested()
  @Type(() => FullNameDto)
  name: FullNameDto;

  @ApiProperty({
    enum: [
      'Platform Owner',
      'Business Owner',
      'No Access',
      'Standard',
      'Enhanced',
      'Admin',
    ],
  })
  @PikSlotsEnumValidation([
    'Business Owner',
    'Platform Owner',
    'No Access',
    'Standard',
    'Enhanced',
    'Admin',
  ] as const satisfies UserRole[])
  role: UserRole;

  @ApiPropertyOptional({ example: '+12025551234' })
  @PikSlotsPhoneValidation()
  phone?: string;

  @ApiProperty({ example: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b' })
  @PikSlotsUUIDValidation()
  businessId: string;

  @ApiPropertyOptional({ example: 'Joes Salon' })
  @PikSlotsOptionalStringValidation(50)
  businessName?: string;
}
