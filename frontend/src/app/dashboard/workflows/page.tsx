// @ts-nocheck
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Play, Copy, Trash2, Workflow, MoreHorizontal, Clock, CheckCircle2, XCircle, Pencil } from 'lucide-react';
import { useWorkflows, useDeleteWorkflow, useDuplicateWorkflow, useExecuteWorkflow } from '@/hooks/use-workflows';
import { Card, CardContent, Button, LinkButton, Input, StatusBadge, EmptyState, Skeleton, Select } from '@/components/ui';
import { formatRelativeTime, formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';

function WorkflowCard({ workflow, onDelete, onDuplicate, onExecute }: any) {
  const [menu, setMenu] = useState(false);
  const triggerIcons: any = { webhook: '🔗', schedule: '🕐', manual: '▶️', event: '⚡' };
  return (
    <Card className="group hover:shadow-md hover:border-primary/20 transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-lg">
            {triggerIcons[workflow.trigger_type] ?? '⚡'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm truncate max-w-[240px]">{workflow.name}</h3>
                  <StatusBadge status={workflow.status} />
                </div>
                {workflow.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{workflow.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon-sm" onClick={() => onExecute(workflow.id)} title="Run now"
                  className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="h-3.5 w-3.5" />
                </Button>
                <LinkButton href={`/dashboard/workflows/${workflow.id}`} variant="ghost" size="icon-sm">
                  <Pencil className="h-3.5 w-3.5" />
                </LinkButton>
                <div className="relative">
                  <Button variant="ghost" size="icon-sm" onClick={() => setMenu(!menu)}>
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                  {menu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                      <div className="absolute right-0 top-9 z-20 min-w-[150px] rounded-xl border bg-card p-1.5 shadow-xl animate-fade-up">
                        <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs hover:bg-muted transition-colors"
                          onClick={() => { onDuplicate(workflow.id); setMenu(false); }}>
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" /> Duplicate
                        </button>
                        <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => { onDelete(workflow.id); setMenu(false); }}>
                          <Trash2 className="h-3.5 w-3.5" /> Archive
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2.5 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><Play className="h-3 w-3" />{formatNumber(workflow.run_count)} runs</span>
              {workflow.last_run_at && <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{formatRelativeTime(workflow.last_run_at)}</span>}
              {workflow.last_run_status === 'success' && <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="h-3 w-3" />Last run succeeded</span>}
              {workflow.last_run_status === 'failed' && <span className="flex items-center gap-1.5 text-red-500"><XCircle className="h-3 w-3" />Last run failed</span>}
              <span className="capitalize px-2 py-0.5 bg-muted rounded-full">{workflow.trigger_type}</span>
            </div>
            {workflow.tags?.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {workflow.tags.map((t: string) => (
                  <span key={t} className="rounded-full bg-primary/8 border border-primary/15 text-primary px-2 py-0.5 text-xs font-medium">#{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkflowsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { data, isLoading } = useWorkflows({ search: search || undefined, status: status || undefined });
  const { mutate: del } = useDeleteWorkflow();
  const { mutate: dup } = useDuplicateWorkflow();
  const { mutate: exec } = useExecuteWorkflow();

  const workflows = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{formatNumber(total)} workflow{total !== 1 ? 's' : ''}</p>
        </div>
        <LinkButton href="/dashboard/workflows/new">
          <Plus className="h-4 w-4" /> New Workflow
        </LinkButton>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Input leftIcon={<Search className="h-4 w-4" />} placeholder="Search workflows…"
          value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm flex-1" />
        <Select value={status} onChange={e => setStatus(e.target.value)} className="w-44">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="draft">Draft</option>
          <option value="error">Error</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
      ) : workflows.length === 0 ? (
        <EmptyState icon={Workflow} title="No workflows yet"
          description="Create your first workflow to start automating your processes."
          action={<LinkButton href="/dashboard/workflows/new"><Plus className="h-4 w-4" />Create workflow</LinkButton>} />
      ) : (
        <div className="space-y-3">
          {workflows.map((wf: any) => (
            <WorkflowCard key={wf.id} workflow={wf}
              onDelete={(id: string) => del(id)}
              onDuplicate={(id: string) => dup(id)}
              onExecute={(id: string) => exec({ id })} />
          ))}
        </div>
      )}
    </div>
  );
}
