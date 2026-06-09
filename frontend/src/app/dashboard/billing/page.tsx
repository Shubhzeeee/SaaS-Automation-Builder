// @ts-nocheck
'use client';
import { Check, Zap, ArrowUpRight, CreditCard } from 'lucide-react';
import { useSubscription, useCreateCheckout } from '@/hooks/use-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Skeleton, StatusBadge } from '@/components/ui';
import { formatDate, cn } from '@/lib/utils';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect for personal projects and exploring automations.',
    features: ['3 workflows', '100 executions/month', '2 integrations', 'Community support'],
    limits: { workflows: 3, executions: 100, members: 1, integrations: 2 },
    cta: 'Current plan',
    highlight: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    description: 'For growing teams building serious automation workflows.',
    features: ['20 workflows', '5,000 executions/month', '10 integrations', '5 team members', 'Email support', 'Version history'],
    limits: { workflows: 20, executions: 5000, members: 5, integrations: 10 },
    cta: 'Upgrade to Starter',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    description: 'Unlimited power for teams that live and breathe automation.',
    features: ['Unlimited workflows', 'Unlimited executions', 'All integrations', '25 team members', 'Priority support', 'Advanced analytics', 'Custom webhooks', 'SLA guarantee'],
    limits: { workflows: -1, executions: -1, members: 25, integrations: -1 },
    cta: 'Upgrade to Pro',
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    description: 'Custom pricing for large organizations with specific needs.',
    features: ['Everything in Pro', 'Unlimited members', 'SSO / SAML', 'Custom integrations', 'Dedicated CSM', '99.99% SLA', 'On-prem option'],
    limits: { workflows: -1, executions: -1, members: -1, integrations: -1 },
    cta: 'Contact Sales',
    highlight: false,
  },
];

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit === -1;
  const pct = unlimited ? 0 : Math.min((used / limit) * 100, 100);
  const warn = pct >= 80;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {used.toLocaleString()} / {unlimited ? '∞' : limit.toLocaleString()}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${warn ? 'bg-amber-500' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  const { data: subscription, isLoading } = useSubscription();
  const { mutate: createCheckout, isPending } = useCreateCheckout();

  const currentPlan = subscription?.plan ?? 'free';
  const limits = subscription?.limits ?? PLANS[0].limits;

  const handleUpgrade = (planId: string) => {
    if (planId === 'enterprise') {
      window.open('mailto:sales@flowforge.io?subject=Enterprise Enquiry', '_blank');
      return;
    }
    createCheckout({
      plan: planId,
      successUrl: `${window.location.origin}/dashboard/billing?success=true`,
      cancelUrl: `${window.location.origin}/dashboard/billing`,
    });
  };

  return (
    <div className="flex-1 space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your subscription and usage.</p>
      </div>

      {/* Current plan summary */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your subscription details and usage</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={subscription?.status ?? 'active'} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl font-bold capitalize">{currentPlan}</span>
                    {subscription?.trial_end_at && new Date(subscription.trial_end_at) > new Date() && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        Trial
                      </span>
                    )}
                  </div>
                  {subscription?.current_period_end && (
                    <p className="text-sm text-muted-foreground">
                      {subscription.cancel_at_period_end ? 'Cancels' : 'Renews'} on{' '}
                      {formatDate(subscription.current_period_end)}
                    </p>
                  )}
                </div>
                {currentPlan !== 'free' && (
                  <Button variant="outline" size="sm">
                    <CreditCard className="h-4 w-4" />
                    Manage billing
                  </Button>
                )}
              </div>

              {/* Usage meters */}
              <div className="grid gap-4 md:grid-cols-2">
                <UsageMeter label="Workflows" used={0} limit={limits.workflows} />
                <UsageMeter label="Executions this month" used={0} limit={limits.executions} />
                <UsageMeter label="Team members" used={1} limit={limits.members} />
                <UsageMeter label="Integrations" used={0} limit={limits.integrations} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isDowngrade = PLANS.findIndex((p) => p.id === plan.id) <
              PLANS.findIndex((p) => p.id === currentPlan);

            return (
              <Card
                key={plan.id}
                className={cn(
                  'relative flex flex-col',
                  plan.highlight && 'border-primary ring-1 ring-primary/30',
                  isCurrent && 'bg-muted/30',
                )}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="mb-4">
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <div className="mt-1">
                      {plan.price === null ? (
                        <span className="text-2xl font-bold">Custom</span>
                      ) : (
                        <div className="flex items-end gap-1">
                          <span className="text-3xl font-bold">${plan.price}</span>
                          <span className="text-muted-foreground mb-0.5">/mo</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">{plan.description}</p>
                  </div>

                  <ul className="space-y-2 flex-1 mb-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : plan.highlight ? 'default' : 'outline'}
                    disabled={isCurrent || isDowngrade}
                    loading={isPending}
                    onClick={() => !isCurrent && handleUpgrade(plan.id)}
                  >
                    {isCurrent ? 'Current Plan' : plan.cta}
                    {!isCurrent && plan.id !== 'enterprise' && <ArrowUpRight className="h-3.5 w-3.5" />}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
