import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import type { SwitchUserBusinessInput } from '@pikslots/shared';

export class SwitchUserBusinessDto implements SwitchUserBusinessInput {
  @ApiProperty({
    example: '019f3a2d-4c7f-7b8e-a2d5-e9f1c3057b84',
    description: 'Business the Platform Owner wants to switch to',
  })
  @IsUUID()
  @IsNotEmpty()
  businessId: string;
}
