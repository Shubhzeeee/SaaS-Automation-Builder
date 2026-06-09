import {
  IsString, IsOptional, IsArray, IsEnum, IsObject, MinLength, MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export type TriggerType = 'webhook' | 'schedule' | 'manual' | 'event';
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';

export class CreateWorkflowDto {
  @ApiProperty({ example: 'Notify on Slack when GitHub PR opens' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ['webhook', 'schedule', 'manual', 'event'], default: 'manual' })
  @IsEnum(['webhook', 'schedule', 'manual', 'event'])
  @IsOptional()
  triggerType?: TriggerType;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  triggerConfig?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  definition?: { nodes: any[]; edges: any[] };

  @ApiProperty({ required: false, example: ['github', 'slack'] })
  @IsArray()
  @IsOptional()
  tags?: string[];
}
