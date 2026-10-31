import { ApiProperty } from '@nestjs/swagger';
import { LoginUserInput } from '@pikslots/shared';
import {
  PikSlotsPasswordValidation,
  PikSlotsStringValidation,
} from 'src/shared/decorators/validations';

export class LoginUserDto implements LoginUserInput {
  @ApiProperty({ example: 'afaqjaved' })
  @PikSlotsStringValidation(1, 100)
  usernameOrEmail: string;

  @ApiProperty({ example: 'admin12345', minLength: 8 })
  @PikSlotsPasswordValidation()
  password: string;

  @ApiProperty({ example: 'macOS' })
  @PikSlotsStringValidation(1, 100)
  os: string;

  @ApiProperty({ example: 'Chrome' })
  @PikSlotsStringValidation(1, 100)
  browser: string;

  @ApiProperty({ example: 'PK' })
  @PikSlotsStringValidation(1, 100)
  country: string;
}
