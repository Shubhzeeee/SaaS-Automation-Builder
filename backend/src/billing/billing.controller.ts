import {
  Controller, Get, Post, Body, UseGuards, Req, Headers, RawBodyRequest, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsEnum, IsUrl } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';

class CreateCheckoutDto {
  @IsEnum(['starter', 'pro'])
  plan: 'starter' | 'pro';

  @IsUrl()
  successUrl: string;

  @IsUrl()
  cancelUrl: string;
}

class CreatePortalDto {
  @IsUrl()
  returnUrl: string;
}

@ApiTags('billing')
@Controller({ path: 'billing', version: '1' })
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('subscription')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current subscription details' })
  getSubscription(@CurrentUser() user: any) {
    return this.billingService.getSubscription(user.organization_id);
  }

  @Post('checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a Stripe Checkout session' })
  createCheckout(@CurrentUser() user: any, @Body() dto: CreateCheckoutDto) {
    return this.billingService.createCheckoutSession(
      user.organization_id,
      user.id,
      dto.plan,
      dto.successUrl,
      dto.cancelUrl,
    );
  }

  @Post('portal')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a Stripe Customer Portal session' })
  createPortal(@CurrentUser() user: any, @Body() dto: CreatePortalDto) {
    return this.billingService.createPortalSession(
      user.organization_id,
      dto.returnUrl,
    );
  }

  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.billingService.handleWebhook(req.rawBody!, signature);
  }
}
