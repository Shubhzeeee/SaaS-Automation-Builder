import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().default(3001),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Redis
  REDIS_URL: Joi.string().required(),

  // RabbitMQ
  RABBITMQ_URL: Joi.string().optional(),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRY: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().min(32).optional(),
  JWT_REFRESH_EXPIRY: Joi.string().default('30d'),

  // OAuth (all optional)
  GOOGLE_CLIENT_ID: Joi.string().optional().allow(''),
  GOOGLE_CLIENT_SECRET: Joi.string().optional().allow(''),
  GITHUB_CLIENT_ID: Joi.string().optional().allow(''),
  GITHUB_CLIENT_SECRET: Joi.string().optional().allow(''),

  // Stripe (optional in dev)
  STRIPE_KEY: Joi.string().optional().allow(''),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional().allow(''),
  STRIPE_PRICE_STARTER: Joi.string().optional().allow(''),
  STRIPE_PRICE_PRO: Joi.string().optional().allow(''),

  // Email
  MAIL_HOST: Joi.string().optional().allow(''),
  MAIL_PORT: Joi.number().default(587),
  MAIL_SECURE: Joi.boolean().default(false),
  MAIL_USER: Joi.string().optional().allow(''),
  MAIL_PASSWORD: Joi.string().optional().allow(''),
  MAIL_FROM: Joi.string().optional().allow(''),

  // AWS S3
  AWS_ACCESS_KEY_ID: Joi.string().optional().allow(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional().allow(''),
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_S3_BUCKET: Joi.string().optional().allow(''),

  // Feature flags
  ENABLE_WORKFLOWS: Joi.boolean().default(true),
  ENABLE_INTEGRATIONS: Joi.boolean().default(true),
  ENABLE_ANALYTICS: Joi.boolean().default(true),
  ENABLE_AI_AGENTS: Joi.boolean().default(false),
});
