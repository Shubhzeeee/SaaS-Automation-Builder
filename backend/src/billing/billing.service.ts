import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import Stripe from 'stripe';
import { DB_POOL } from '../database/database.module';

export const PLAN_LIMITS = {
  free:       { workflows: 3,  executions: 100,  members: 1,  integrations: 2 },
  starter:    { workflows: 20, executions: 5000, members: 5,  integrations: 10 },
  pro:        { workflows: -1, executions: -1,   members: 25, integrations: -1 },
  enterprise: { workflows: -1, executions: -1,   members: -1, integrations: -1 },
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe | null = null;

  constructor(
    @Inject(DB_POOL) private readonly pool: Pool,
    private readonly configService: ConfigService,
  ) {
    const key = configService.get<string>('STRIPE_KEY');
    if (key && key !== 'sk_test_xxxx') {
      this.stripe = new Stripe(key, { apiVersion: '2023-10-16' });
    }
  }

  async getSubscription(orgId: string) {
    const { rows } = await this.pool.query(
      'SELECT * FROM subscriptions WHERE organization_id = $1',
      [orgId],
    );
    const sub = rows[0];
    if (!sub) return null;

    return {
      ...sub,
      limits: PLAN_LIMITS[sub.plan as keyof typeof PLAN_LIMITS],
    };
  }

  async createCheckoutSession(
    orgId: string,
    userId: string,
    plan: 'starter' | 'pro',
    successUrl: string,
    cancelUrl: string,
  ) {
    if (!this.stripe) {
      throw new BadRequestException('Billing not configured');
    }

    const priceId = plan === 'starter'
      ? this.configService.get<string>('STRIPE_PRICE_STARTER')
      : this.configService.get<string>('STRIPE_PRICE_PRO');

    // Get or create Stripe customer
    const { rows } = await this.pool.query(
      'SELECT stripe_customer_id FROM subscriptions WHERE organization_id = $1',
      [orgId],
    );

    let customerId = rows[0]?.stripe_customer_id;
    if (!customerId) {
      const { rows: userRows } = await this.pool.query(
        'SELECT email, full_name FROM users WHERE id = $1',
        [userId],
      );
      const customer = await this.stripe.customers.create({
        email: userRows[0].email,
        name: userRows[0].full_name,
        metadata: { orgId, userId },
      });
      customerId = customer.id;

      await this.pool.query(
        'UPDATE subscriptions SET stripe_customer_id = $1 WHERE organization_id = $2',
        [customerId, orgId],
      );
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { orgId },
      subscription_data: { trial_period_days: 14 },
    });

    return { url: session.url };
  }

  async createPortalSession(orgId: string, returnUrl: string) {
    if (!this.stripe) {
      throw new BadRequestException('Billing not configured');
    }

    const { rows } = await this.pool.query(
      'SELECT stripe_customer_id FROM subscriptions WHERE organization_id = $1',
      [orgId],
    );

    if (!rows[0]?.stripe_customer_id) {
      throw new BadRequestException('No billing account found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: rows[0].stripe_customer_id,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    if (!this.stripe) return;

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret!);
    } catch (err: any) {
      this.logger.error(`Webhook signature failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await this.syncSubscription(sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.pool.query(
          `UPDATE subscriptions SET status = 'canceled', plan = 'free'
           WHERE stripe_subscription_id = $1`,
          [sub.id],
        );
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async syncSubscription(sub: Stripe.Subscription) {
    const orgId = sub.metadata?.orgId;
    if (!orgId) return;

    const planMap: Record<string, string> = {
      [this.configService.get('STRIPE_PRICE_STARTER', '')]: 'starter',
      [this.configService.get('STRIPE_PRICE_PRO', '')]: 'pro',
    };

    const priceId = sub.items.data[0]?.price.id;
    const plan = planMap[priceId] ?? 'starter';

    await this.pool.query(
      `UPDATE subscriptions SET
         stripe_subscription_id = $1, plan = $2, status = $3,
         current_period_start = to_timestamp($4),
         current_period_end = to_timestamp($5),
         cancel_at_period_end = $6,
         trial_end_at = $7
       WHERE organization_id = $8`,
      [
        sub.id,
        plan,
        sub.status,
        sub.current_period_start,
        sub.current_period_end,
        sub.cancel_at_period_end,
        sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        orgId,
      ],
    );

    await this.pool.query(
      'UPDATE organizations SET plan = $1 WHERE id = $2',
      [plan, orgId],
    );
  }
}
