import { Type } from 'class-transformer';
import { IsArray, IsUUID, ValidateNested, IsNumber, IsOptional, Min } from 'class-validator';

import { PositionItemDto } from './position-item.dto';

export class UpsertPositionsDto {
  @IsUUID()
  portfolioId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PositionItemDto)
  positions!: PositionItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  equity?: number;
}

