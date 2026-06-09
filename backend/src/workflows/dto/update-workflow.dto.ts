import { PartialType } from '@nestjs/swagger';
import { CreateWorkflowDto } from './create-workflow.dto';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateWorkflowDto extends PartialType(CreateWorkflowDto) {
  @IsEnum(['draft', 'active', 'paused', 'archived'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  changelog?: string;
}
