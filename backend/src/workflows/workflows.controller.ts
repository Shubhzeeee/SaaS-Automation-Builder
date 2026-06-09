import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkflowsService } from './workflows.service';
import { WorkflowExecutionService } from './workflow-execution.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { ListWorkflowsDto } from './dto/list-workflows.dto';
import { ExecuteWorkflowDto } from './dto/execute-workflow.dto';

@ApiTags('workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'workflows', version: '1' })
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly executionService: WorkflowExecutionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a workflow' })
  create(@CurrentUser() user: any, @Body() dto: CreateWorkflowDto) {
    return this.workflowsService.create(user.organization_id, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List workflows with filtering & pagination' })
  list(@CurrentUser() user: any, @Query() query: ListWorkflowsDto) {
    return this.workflowsService.list(user.organization_id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single workflow' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.workflowsService.findOne(id, user.organization_id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a workflow' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(id, user.organization_id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a workflow' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.workflowsService.remove(id, user.organization_id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Manually trigger a workflow execution' })
  execute(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ExecuteWorkflowDto,
  ) {
    return this.executionService.execute(
      id, user.organization_id, user.id, 'manual', dto.inputData,
    );
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a workflow' })
  duplicate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.workflowsService.duplicate(id, user.organization_id, user.id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get version history' })
  getVersions(@CurrentUser() user: any, @Param('id') id: string) {
    return this.workflowsService.getVersionHistory(id, user.organization_id);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'List executions for a workflow' })
  getExecutions(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.workflowsService.getExecutions(
      id, user.organization_id, Number(page), Number(limit),
    );
  }
}
