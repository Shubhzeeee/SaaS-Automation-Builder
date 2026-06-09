import { IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExecuteWorkflowDto {
  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  inputData?: Record<string, any>;
}
