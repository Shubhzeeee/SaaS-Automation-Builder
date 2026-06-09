import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'analytics', version: '1' })
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard summary stats' })
  getDashboard(@CurrentUser() user: any) {
    return this.analyticsService.getDashboardStats(user.organization_id);
  }

  @Get('executions/timeseries')
  @ApiOperation({ summary: 'Execution counts over time' })
  getTimeSeries(
    @CurrentUser() user: any,
    @Query('range') range: '7d' | '30d' | '90d' = '30d',
  ) {
    return this.analyticsService.getExecutionTimeSeries(user.organization_id, range);
  }

  @Get('audit')
  @ApiOperation({ summary: 'Audit log' })
  getAuditLog(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.analyticsService.getAuditLogs(
      user.organization_id, Number(page), Number(limit),
    );
  }
}
