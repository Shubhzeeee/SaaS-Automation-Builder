// @ts-nocheck
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Workflow, Play, CheckCircle2, Clock, Plus, ArrowRight, Zap, XCircle, Activity } from 'lucide-react';
import { useDashboardStats, useExecutionTimeSeries } from '@/hooks/use-data';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, LinkButton, StatCard, Skeleton, StatusBadge } from '@/components/ui';
import { formatNumber, formatDuration, formatRelativeTime } from '@/lib/utils';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-card px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-medium text-muted-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize">{p.dataKey}</span>
          <span className="font-semibold ml-auto">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<'7d'|'30d'|'90d'>('30d');
  const { data: stats, isLoading } = useDashboardStats();
  const { data: ts, isLoading: tsLoading } = useExecutionTimeSeries(range);

  const exec = stats?.executions;
  const wf = stats?.workflows;
  const successRate = exec?.total > 0 ? Math.round((Number(exec.succeeded) / Number(exec.total)) * 100) : 100;

  const chartData = (ts ?? []).map((d: any) => ({
    date: new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    succeeded: Number(d.succeeded),
    failed: Number(d.failed),
  }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{greeting}, {user?.fullName?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here's what's happening with your automations</p>
        </div>
        <LinkButton href="/dashboard/workflows/new" size="lg">
          <Plus className="h-4 w-4" /> New Workflow
        </LinkButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Workflows" value={formatNumber(wf?.total ?? 0)} subtext={`${wf?.active ?? 0} active`} icon={Workflow} loading={isLoading} />
        <StatCard label="Total Executions" value={formatNumber(exec?.total ?? 0)} subtext={`${formatNumber(exec?.last_24h ?? 0)} in last 24h`} icon={Play} loading={isLoading} />
        <StatCard label="Success Rate" value={`${successRate}%`} subtext={`${formatNumber(exec?.succeeded ?? 0)} succeeded`} icon={CheckCircle2} color="text-emerald-600" loading={isLoading} />
        <StatCard label="Avg. Duration" value={formatDuration(exec?.avg_duration_ms)} subtext="per execution" icon={Clock} loading={isLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between pb-2">
            <div>
              <CardTitle>Execution History</CardTitle>
              <CardDescription>Workflow runs over time</CardDescription>
            </div>
            <div className="flex rounded-xl border p-0.5 text-xs shrink-0">
              {(['7d','30d','90d'] as const).map(r => (
                <button key={r} onClick={() => setRange(r)}
                  className={`rounded-lg px-3 py-1.5 font-medium transition-all ${range===r?'bg-primary text-primary-foreground shadow-sm':'text-muted-foreground hover:text-foreground'}`}>
                  {r}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {tsLoading ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={208}>
                <AreaChart data={chartData} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <defs>
                    <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize:11}} tickLine={false} axisLine={false} />
                  <YAxis tick={{fontSize:11}} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="succeeded" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gs)" />
                  <Area type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} fill="url(#gf)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Workflow Health</CardTitle>
            <CardDescription>Status breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? <Skeleton className="h-40 w-full" /> : (
              [
                { label:'Active',  count:Number(wf?.active??0),  color:'bg-emerald-500' },
                { label:'Paused',  count:Number(wf?.paused??0),  color:'bg-amber-400' },
                { label:'Draft',   count:Number(wf?.draft??0),   color:'bg-slate-300 dark:bg-slate-600' },
                { label:'Error',   count:Number(wf?.error??0),   color:'bg-red-500' },
              ].map(({ label, count, color }) => {
                const total = Math.max(Number(wf?.total??0), 1);
                return (
                  <div key={label} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{width:`${(count/total)*100}%`}} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle>Top Workflows</CardTitle>
            <LinkButton href="/dashboard/workflows" variant="ghost" size="sm" className="text-xs gap-1 h-7">
              View all <ArrowRight className="h-3 w-3" />
            </LinkButton>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />) :
              (stats?.topWorkflows??[]).length===0 ? (
                <div className="py-8 text-center">
                  <Workflow className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No workflows yet</p>
                  <LinkButton href="/dashboard/workflows/new" variant="link" size="sm" className="mt-1">Create your first</LinkButton>
                </div>
              ) :
              (stats?.topWorkflows??[]).map((wf: any) => (
                <Link key={wf.id} href={`/dashboard/workflows/${wf.id}`}
                  className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/50 hover:border-primary/30 transition-all group">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{wf.name}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(wf.run_count)} runs · {wf.success_rate}% success</p>
                  </div>
                  <StatusBadge status={wf.last_run_status??'draft'} />
                </Link>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle>Recent Executions</CardTitle>
            <LinkButton href="/dashboard/analytics" variant="ghost" size="sm" className="text-xs gap-1 h-7">
              View all <ArrowRight className="h-3 w-3" />
            </LinkButton>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />) :
              (stats?.recentExecutions??[]).length===0 ? (
                <div className="py-8 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No executions yet</p>
                </div>
              ) :
              (stats?.recentExecutions??[]).slice(0,6).map((ex: any) => (
                <div key={ex.id} className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/50 transition-colors">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ex.status==='success'?'bg-emerald-100 dark:bg-emerald-950/50':ex.status==='failed'?'bg-red-100 dark:bg-red-950/50':'bg-blue-100 dark:bg-blue-950/50'}`}>
                    {ex.status==='success'?<CheckCircle2 className="h-4 w-4 text-emerald-600"/>:ex.status==='failed'?<XCircle className="h-4 w-4 text-red-600"/>:<Activity className="h-4 w-4 text-blue-600 animate-pulse"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{ex.workflow_name}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(ex.created_at)} · {formatDuration(ex.duration_ms)}</p>
                  </div>
                  <StatusBadge status={ex.status} />
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
