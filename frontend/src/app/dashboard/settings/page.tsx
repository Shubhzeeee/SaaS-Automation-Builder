// @ts-nocheck
'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Building2, Shield, Key, Bell, Palette } from 'lucide-react';
import { useProfile, useUpdateProfile, useOrgMembers } from '@/hooks/use-data';
import { useAuth } from '@/hooks/use-auth';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label, Textarea, Switch, Separator, Skeleton, StatusBadge,
} from '@/components/ui';
import { cn, formatRelativeTime, formatDate } from '@/lib/utils';

const profileSchema = z.object({
  fullName: z.string().min(2).max(100),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

function ProfileTab() {
  const { data: profile, isLoading } = useProfile();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema),
    values: { fullName: profile?.full_name ?? '', avatarUrl: profile?.avatar_url ?? '' },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your name and profile photo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit((data) => updateProfile(data))} className="space-y-4">
              {/* Avatar preview */}
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div>
                  <p className="font-medium">{profile?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  <StatusBadge status={profile?.role ?? 'member'} />
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" {...register('fullName')} placeholder="Your full name" />
                {errors.fullName && (
                  <p className="text-xs text-destructive">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile?.email ?? ''} disabled className="opacity-60" />
                <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input id="avatarUrl" {...register('avatarUrl')} placeholder="https://..." />
              </div>

              <Button type="submit" loading={isPending}>Save changes</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible account actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data.
              </p>
            </div>
            <Button variant="destructive" size="sm">Delete account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OrganizationTab() {
  const { data: members, isLoading } = useOrgMembers();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Manage your workspace settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Organization Name</Label>
            <Input defaultValue={user?.organizationName ?? ''} placeholder="Your organization" />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input disabled value={user?.organizationId ?? ''} className="opacity-60 font-mono text-xs" />
            <p className="text-xs text-muted-foreground">Used in API references.</p>
          </div>
          <Button>Save</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>People with access to this workspace.</CardDescription>
          </div>
          <Button size="sm">Invite member</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(members as any[] ?? []).map((member: any) => (
                <div key={member.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {member.full_name?.[0]?.toUpperCase() ?? member.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{member.full_name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={member.is_active ? 'active' : 'archived'} />
                    <span className="text-xs capitalize text-muted-foreground rounded-full bg-muted px-2 py-0.5">
                      {member.role}
                    </span>
                    {member.id !== user?.id && (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-7 text-xs">
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SecurityTab() {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          {showChangePassword ? (
            <div className="space-y-4 max-w-sm">
              <div className="space-y-1.5">
                <Label>Current password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label>New password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm new password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="flex gap-2">
                <Button>Update password</Button>
                <Button variant="outline" onClick={() => setShowChangePassword(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowChangePassword(true)}>
              Change password
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Authenticator App</p>
              <p className="text-sm text-muted-foreground">
                {mfaEnabled ? 'MFA is enabled on your account.' : 'Use an app like Google Authenticator.'}
              </p>
            </div>
            <Switch checked={mfaEnabled} onCheckedChange={setMfaEnabled} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Devices currently signed in to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { device: 'Chrome on macOS', location: 'Delhi, IN', current: true, time: 'Active now' },
              { device: 'Safari on iPhone', location: 'Delhi, IN', current: false, time: '2h ago' },
            ].map((session, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{session.device}</p>
                    {session.current && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-950 dark:text-green-300">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{session.location} · {session.time}</p>
                </div>
                {!session.current && (
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-7 text-xs">
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ApiKeysTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>Keys to authenticate programmatic access to the API.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>Create key</Button>
        </CardHeader>
        <CardContent>
          {showCreate && (
            <div className="rounded-lg border bg-muted/30 p-4 mb-4 space-y-3">
              <p className="text-sm font-medium">Create new API key</p>
              <Input
                placeholder="Key name (e.g. Production CI)"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
              {createdKey && (
                <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3">
                  <p className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">
                    ✓ Copy your key now — it won't be shown again.
                  </p>
                  <code className="text-xs font-mono break-all">{createdKey}</code>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setCreatedKey(`ff_live_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`);
                  }}
                  disabled={!keyName}
                >
                  Generate
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowCreate(false); setCreatedKey(null); setKeyName(''); }}>
                  {createdKey ? 'Done' : 'Cancel'}
                </Button>
              </div>
            </div>
          )}

          <div className="py-8 text-center text-sm text-muted-foreground">
            No API keys yet. Create one to get started.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    executionFailed: true,
    executionSuccess: false,
    weeklyReport: true,
    teamActivity: false,
    billingAlerts: true,
    securityAlerts: true,
  });

  const toggle = (key: keyof typeof prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const rows = [
    { key: 'executionFailed', label: 'Workflow execution failures', desc: 'Get notified when a workflow fails to execute' },
    { key: 'executionSuccess', label: 'Workflow execution success', desc: 'Get notified when a workflow completes successfully' },
    { key: 'weeklyReport', label: 'Weekly summary report', desc: 'Weekly digest of your automation activity' },
    { key: 'teamActivity', label: 'Team activity', desc: 'When team members create or modify workflows' },
    { key: 'billingAlerts', label: 'Billing alerts', desc: 'Usage limits, renewals, and payment issues' },
    { key: 'securityAlerts', label: 'Security alerts', desc: 'New sign-ins and suspicious activity' },
  ] as const;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Choose what you get emailed about.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 divide-y divide-border">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium">{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.desc}</p>
              </div>
              <Switch
                checked={prefs[row.key]}
                onCheckedChange={() => toggle(row.key)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
      <Button>Save preferences</Button>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const renderTab = () => {
    switch (activeTab) {
      case 'profile': return <ProfileTab />;
      case 'organization': return <OrganizationTab />;
      case 'security': return <SecurityTab />;
      case 'api-keys': return <ApiKeysTab />;
      case 'notifications': return <NotificationsTab />;
      default: return (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Coming soon
          </CardContent>
        </Card>
      );
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account and workspace preferences.
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar nav */}
        <nav className="hidden w-48 shrink-0 md:block">
          <ul className="space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    activeTab === id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile tab select */}
        <div className="md:hidden mb-4 w-full">
          <select
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            {TABS.map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {renderTab()}
        </div>
      </div>
    </div>
  );
}
