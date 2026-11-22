import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegisterBusinessInput, type BusinessIndustry } from '@pikslots/shared';
import {
  PikSlotsEnumValidation,
  PikSlotsOptionalTimezoneValidation,
  PikSlotsSlugValidation,
  PikSlotsStringValidation,
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

export class RegisterBusinessDto implements RegisterBusinessInput {
  @ApiProperty({ example: 'joes-barbershop', minLength: 3, maxLength: 60 })
  @PikSlotsSlugValidation()
  slug: string;

  @ApiProperty({ example: "Joe's Barbershop", maxLength: 100 })
  @PikSlotsStringValidation(1, 100)
  name: string;

  @ApiProperty({ enum: INDUSTRIES })
  @PikSlotsEnumValidation(INDUSTRIES)
  industry: BusinessIndustry;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @PikSlotsOptionalTimezoneValidation()
  defaultTimeZone: string;
}
