// @ts-nocheck
'use client';
import { useState } from 'react';
import { Search, Link2, Link2Off, RefreshCw, Plus, CheckCircle, XCircle } from 'lucide-react';
import {
  useIntegrationCatalog, useIntegrations,
  useConnectIntegration, useDisconnectIntegration, useTestIntegration,
} from '@/hooks/use-data';
import {
  Card, CardContent, Button, Input, StatusBadge,
  EmptyState, Skeleton,
} from '@/components/ui';
import { formatRelativeTime, cn } from '@/lib/utils';

function ConnectModal({ provider, onClose }: { provider: any; onClose: () => void }) {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const { mutate: connect, isPending } = useConnectIntegration();

  const fields: Record<string, string[]> = {
    slack: ['botToken'],
    github: ['accessToken'],
    openai: ['apiKey'],
    airtable: ['apiKey'],
    stripe: ['apiKey'],
    gmail: ['accessToken', 'refreshToken'],
    default: ['apiKey'],
  };

  const credFields = fields[provider.id] ?? fields.default;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-bold text-lg">
              {provider.name[0]}
            </div>
            <div>
              <h2 className="font-semibold">Connect {provider.name}</h2>
              <p className="text-sm text-muted-foreground">{provider.description}</p>
            </div>
          </div>

          {credFields.map((field) => (
            <div key={field} className="space-y-1.5">
              <label className="text-sm font-medium capitalize">
                {field.replace(/([A-Z])/g, ' $1').trim()}
              </label>
              <Input
                type="password"
                placeholder={`Enter ${field}...`}
                value={credentials[field] ?? ''}
                onChange={(e) => setCredentials((p) => ({ ...p, [field]: e.target.value }))}
              />
            </div>
          ))}

          {provider.docsUrl && (
            <p className="text-xs text-muted-foreground">
              Need help?{' '}
              <a href={provider.docsUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                View {provider.name} API docs
              </a>
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              loading={isPending}
              onClick={() => connect({ provider: provider.id, credentials }, { onSuccess: onClose })}
            >
              Connect
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function IntegrationsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [connectingProvider, setConnectingProvider] = useState<any>(null);

  const { data: catalog = [], isLoading: catalogLoading } = useIntegrationCatalog();
  const { data: connected = [], isLoading: connectedLoading } = useIntegrations();
  const { mutate: disconnect } = useDisconnectIntegration();
  const { mutate: testConnection } = useTestIntegration();

  const categories = [...new Set((catalog as any[]).map((p: any) => p.category))];

  const filtered = (catalog as any[]).filter((p: any) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !category || p.category === category;
    return matchSearch && matchCat;
  });

  const connectedIds = new Set((connected as any[]).map((c: any) => c.provider));

  return (
    <div className="flex-1 space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Connect your apps to start automating across platforms.
        </p>
      </div>

      {/* Connected integrations */}
      {(connected as any[]).length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Connected ({(connected as any[]).length})</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connectedLoading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
              : (connected as any[]).map((integration: any) => {
                  const provider = (catalog as any[]).find((p: any) => p.id === integration.provider);
                  return (
                    <Card key={integration.id} className="border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-bold">
                              {provider?.name?.[0] ?? integration.provider[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{provider?.name ?? integration.provider}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <StatusBadge status={integration.status} />
                                {integration.last_synced_at && (
                                  <span className="text-xs text-muted-foreground">
                                    · synced {formatRelativeTime(integration.last_synced_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Test connection"
                              onClick={() => testConnection(integration.id)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              title="Disconnect"
                              onClick={() => disconnect(integration.id)}
                            >
                              <Link2Off className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
          </div>
        </section>
      )}

      {/* Catalog */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">All Integrations</h2>
          <span className="text-sm text-muted-foreground">{(catalog as any[]).length} available</span>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search integrations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCategory('')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                !category ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent',
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat === category ? '' : cat)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                  category === cat ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {catalogLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((provider: any) => {
              const isConnected = connectedIds.has(provider.id);
              return (
                <Card
                  key={provider.id}
                  className={cn(
                    'relative transition-shadow hover:shadow-md cursor-pointer',
                    isConnected && 'ring-1 ring-green-500/40',
                  )}
                  onClick={() => !isConnected && setConnectingProvider(provider)}
                >
                  {isConnected && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-bold text-lg">
                        {provider.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold">{provider.name}</p>
                        <span className="text-xs capitalize text-muted-foreground">{provider.category}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{provider.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {provider.actions.length} actions
                      </span>
                      {isConnected ? (
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">Connected</span>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          <Plus className="h-3 w-3" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Connect modal */}
      {connectingProvider && (
        <ConnectModal provider={connectingProvider} onClose={() => setConnectingProvider(null)} />
      )}
    </div>
  );
}
