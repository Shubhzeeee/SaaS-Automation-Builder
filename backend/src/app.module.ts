import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { BillingModule } from './billing/billing.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development','production','test').default('development'),
        PORT: Joi.number().default(3001),
        FRONTEND_URL: Joi.string().default('http://localhost:5173'),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().optional().allow(''),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_EXPIRY: Joi.string().default('7d'),
        JWT_REFRESH_SECRET: Joi.string().min(16).optional().allow(''),
        STRIPE_KEY: Joi.string().optional().allow(''),
        STRIPE_WEBHOOK_SECRET: Joi.string().optional().allow(''),
        STRIPE_PRICE_STARTER: Joi.string().optional().allow(''),
        STRIPE_PRICE_PRO: Joi.string().optional().allow(''),
        MAIL_HOST: Joi.string().optional().allow(''),
        MAIL_USER: Joi.string().optional().allow(''),
        MAIL_PASSWORD: Joi.string().optional().allow(''),
      }),
      cache: true,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    WorkflowsModule,
    IntegrationsModule,
    BillingModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
