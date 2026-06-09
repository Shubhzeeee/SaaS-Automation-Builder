import { IsOptional, IsString, IsNumberString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ListWorkflowsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(['draft', 'active', 'paused', 'archived'])
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumberString()
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsNumberString()
  limit?: number;
}
