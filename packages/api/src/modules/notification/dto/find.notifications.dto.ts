import { ApiPropertyOptional } from '@nestjs/swagger';
import type { FindNotificationsQuery } from '@pikslots/shared';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class FindNotificationsDto implements FindNotificationsQuery {
  @ApiPropertyOptional({
    description: 'Return only unread notifications',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onlyUnread?: boolean;
}
