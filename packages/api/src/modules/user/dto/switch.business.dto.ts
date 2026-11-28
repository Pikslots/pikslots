import { ApiProperty } from '@nestjs/swagger';
import type { SwitchBusinessInput } from '@pikslots/shared';
import { PikSlotsUUIDValidation } from 'src/shared/decorators/validations';

export class SwitchBusinessDto implements SwitchBusinessInput {
  @ApiProperty({ example: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b' })
  @PikSlotsUUIDValidation()
  businessId: string;
}
