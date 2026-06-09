import {
  Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsObject, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IntegrationsService } from './integrations.service';

class ConnectIntegrationDto {
  @ApiProperty({ example: 'slack' })
  @IsString()
  provider: string;

  @ApiProperty()
  @IsObject()
  credentials: Record<string, any>;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'integrations', version: '1' })
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'List available integration providers' })
  getCatalog() {
    return this.integrationsService.getProviderCatalog();
  }

  @Get('catalog/:provider')
  @ApiOperation({ summary: 'Get a single provider details' })
  getProvider(@Param('provider') provider: string) {
    return this.integrationsService.getProvider(provider);
  }

  @Get()
  @ApiOperation({ summary: 'List connected integrations' })
  list(@CurrentUser() user: any) {
    return this.integrationsService.listConnected(user.organization_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single integration' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.integrationsService.findOne(id, user.organization_id);
  }

  @Post()
  @ApiOperation({ summary: 'Connect a new integration' })
  connect(@CurrentUser() user: any, @Body() dto: ConnectIntegrationDto) {
    return this.integrationsService.connect(
      user.organization_id,
      user.id,
      dto.provider,
      dto.credentials,
      dto.config,
    );
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test an existing integration connection' })
  test(@CurrentUser() user: any, @Param('id') id: string) {
    return this.integrationsService.testConnection(id, user.organization_id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect an integration' })
  disconnect(@CurrentUser() user: any, @Param('id') id: string) {
    return this.integrationsService.disconnect(id, user.organization_id);
  }
}
