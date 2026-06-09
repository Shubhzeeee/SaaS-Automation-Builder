// @ts-nocheck
'use client';
import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Shield } from 'lucide-react';
import { useDashboardStats, useExecutionTimeSeries, useAuditLogs } from '@/hooks/use-data';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Skeleton, StatusBadge,
} from '@/components/ui';
import { formatNumber, formatDuration, formatDateTime, formatRelativeTime } from '@/lib/utils';

const PIE_COLORS = ['#22c55e', '#ef4444', '#eab308', '#3b82f6'];

export default function AnalyticsPage() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const { data: stats, isLoading } = useDashboardStats();
  const { data: timeSeries, isLoading: tsLoading } = useExecutionTimeSeries(range);
  const { data: auditData, isLoading: auditLoading } = useAuditLogs({ limit: 20 });

  const exec = stats?.executions;
  const successRate = exec?.total > 0
    ? Math.round((Number(exec.succeeded) / Number(exec.total)) * 100)
    : 100;

  const pieData = [
    { name: 'Succeeded', value: Number(exec?.succeeded ?? 0) },
    { name: 'Failed', value: Number(exec?.failed ?? 0) },
    { name: 'Running', value: Number(exec?.running ?? 0) },
  ].filter((d) => d.value > 0);

  const chartData = (timeSeries ?? []).map((d: any) => ({
    date: new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    succeeded: Number(d.succeeded),
    failed: Number(d.failed),
    total: Number(d.total),
  }));

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Execution trends and platform usage.</p>
        </div>
        <div className="flex gap-1 rounded-lg border p-0.5">
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                range === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: 'Total Executions',
            value: formatNumber(exec?.total ?? 0),
            sub: `${formatNumber(exec?.last_24h ?? 0)} today`,
            icon: Activity,
            trend: null,
          },
          {
            label: 'Success Rate',
            value: `${successRate}%`,
            sub: `${formatNumber(exec?.succeeded ?? 0)} succeeded`,
            icon: TrendingUp,
            trend: successRate >= 90 ? 'up' : 'down',
          },
          {
            label: 'Failures',
            value: formatNumber(exec?.failed ?? 0),
            sub: 'needs attention',
            icon: TrendingDown,
            trend: exec?.failed > 0 ? 'down' : null,
          },
          {
            label: 'Avg. Duration',
            value: formatDuration(exec?.avg_duration_ms),
            sub: 'per execution',
            icon: Activity,
            trend: null,
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold mt-1">
                      {isLoading ? <Skeleton className="h-7 w-16 inline-block" /> : kpi.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
                  </div>
                  <div className={`rounded-lg p-2 ${
                    kpi.trend === 'up' ? 'bg-green-100 text-green-600' :
                    kpi.trend === 'down' ? 'bg-red-100 text-red-600' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Execution Volume</CardTitle>
            <CardDescription>Successful vs failed runs over time</CardDescription>
          </CardHeader>
          <CardContent>
            {tsLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="succeeded" stroke="#22c55e" fill="url(#gs)" strokeWidth={2} />
                  <Area type="monotone" dataKey="failed" stroke="#ef4444" fill="url(#gf)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>All-time breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Workflows table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Workflows by Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <th className="pb-3 pr-4">Workflow</th>
                  <th className="pb-3 pr-4">Runs</th>
                  <th className="pb-3 pr-4">Success Rate</th>
                  <th className="pb-3 pr-4">Last Run</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={5}><Skeleton className="h-10 w-full my-1" /></td></tr>
                    ))
                  : (stats?.topWorkflows ?? []).map((wf: any) => (
                      <tr key={wf.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-4 font-medium max-w-[200px] truncate">{wf.name}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{formatNumber(wf.run_count)}</td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  Number(wf.success_rate) >= 90 ? 'bg-green-500' :
                                  Number(wf.success_rate) >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${wf.success_rate}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{wf.success_rate}%</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground text-xs">
                          {wf.last_run_at ? formatRelativeTime(wf.last_run_at) : 'Never'}
                        </td>
                        <td className="py-3">
                          <StatusBadge status={wf.last_run_status ?? 'draft'} />
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card>
        <CardHeader className="flex-row items-center gap-3 pb-3">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Audit Log</CardTitle>
            <CardDescription>Recent security and activity events</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {auditLoading
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              : (auditData?.data ?? []).map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
                      {log.user_name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        <span className="text-muted-foreground">{log.user_name ?? 'System'}</span>
                        {' '}
                        <span className="capitalize">{log.action}</span>
                        {' '}
                        <span className="text-muted-foreground capitalize">{log.resource_type}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatRelativeTime(log.created_at)}
                        {log.ip_address && ` · ${log.ip_address}`}
                      </p>
                    </div>
                    <StatusBadge status={log.action === 'delete' ? 'failed' : 'success'} />
                  </div>
                ))}
            {!auditLoading && !auditData?.data?.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">No audit events yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
