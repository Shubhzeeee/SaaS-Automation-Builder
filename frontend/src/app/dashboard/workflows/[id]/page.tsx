// @ts-nocheck
'use client';
import { useState, useCallback } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState,
  type Connection, type NodeTypes, BackgroundVariant, Panel,
} from 'reactflow';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Play, Plus, Trash2, Globe, Clock, Code2, Filter, Mail, Zap, GitBranch, RefreshCw, X } from 'lucide-react';
import { useWorkflow, useUpdateWorkflow, useCreateWorkflow, useExecuteWorkflow } from '@/hooks/use-workflows';
import { Button, LinkButton, Input, Textarea, StatusBadge, Select, Card, CardContent, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

const NODE_CATALOG = [
  { type:'trigger',      label:'Trigger',       icon:Zap,       color:'from-violet-500 to-purple-600', desc:'Start the workflow' },
  { type:'http_request', label:'HTTP Request',  icon:Globe,     color:'from-blue-500 to-cyan-600',     desc:'Call any API' },
  { type:'condition',    label:'Condition',     icon:GitBranch, color:'from-amber-500 to-orange-500',  desc:'Branch on logic' },
  { type:'delay',        label:'Delay',         icon:Clock,     color:'from-slate-500 to-zinc-600',    desc:'Wait before next step' },
  { type:'transform',    label:'Transform',     icon:RefreshCw, color:'from-teal-500 to-emerald-600',  desc:'Reshape data' },
  { type:'email',        label:'Send Email',    icon:Mail,      color:'from-pink-500 to-rose-600',     desc:'Send an email' },
  { type:'code',         label:'Code',          icon:Code2,     color:'from-orange-500 to-red-500',    desc:'Run custom JS' },
  { type:'filter',       label:'Filter',        icon:Filter,    color:'from-green-500 to-emerald-600', desc:'Stop if condition fails' },
];

function WorkflowNode({ data, selected }: any) {
  const cfg = NODE_CATALOG.find(n => n.type === data.nodeType) ?? NODE_CATALOG[0];
  const Icon = cfg.icon;
  return (
    <div className={cn('min-w-[190px] rounded-2xl border-2 bg-card shadow-lg transition-all duration-150',
      selected ? 'border-primary shadow-primary/20 shadow-xl scale-[1.02]' : 'border-border hover:border-primary/50 hover:shadow-md')}>
      <div className={`flex items-center gap-2.5 rounded-t-[14px] px-3.5 py-2.5 bg-gradient-to-r ${cfg.color}`}>
        <Icon className="h-3.5 w-3.5 text-white shrink-0" />
        <span className="text-xs font-bold text-white tracking-wide truncate">{cfg.label}</span>
      </div>
      <div className="px-3.5 py-3">
        <p className="text-sm font-semibold leading-tight truncate">{data.label||cfg.label}</p>
        {data.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{data.description}</p>}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = { workflowNode: WorkflowNode };

function ConfigPanel({ node, onUpdate, onDelete, onClose }: any) {
  if (!node) return null;
  const cfg = NODE_CATALOG.find(n => n.type === node.data.nodeType)!;
  const Icon = cfg?.icon ?? Zap;
  const update = (patch: any) => onUpdate(patch);

  return (
    <div className="w-80 border-l bg-card flex flex-col overflow-hidden animate-slide-in-right">
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${cfg?.color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{cfg?.label}</p>
          <p className="font-semibold text-sm truncate">{node.data.label||cfg?.label}</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Node Name</label>
          <Input value={node.data.label||''} onChange={e => update({label:e.target.value})} placeholder="Label this node…" />
        </div>

        {node.data.nodeType === 'http_request' && (<>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Method</label>
            <Select value={node.data.config?.method||'GET'} onChange={e => update({config:{...node.data.config,method:e.target.value}})}>
              {['GET','POST','PUT','PATCH','DELETE'].map(m => <option key={m}>{m}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL</label>
            <Input value={node.data.config?.url||''} onChange={e => update({config:{...node.data.config,url:e.target.value}})} placeholder="https://api.example.com/…" />
            <p className="text-[11px] text-muted-foreground">Use {'{{$last.field}}'} to reference outputs</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Body (JSON)</label>
            <Textarea rows={5} className="font-mono text-xs" value={node.data.config?.body||''} onChange={e => update({config:{...node.data.config,body:e.target.value}})} placeholder='{"key":"{{$last.value}}"}'/>
          </div>
        </>)}

        {node.data.nodeType === 'condition' && (<>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Left Value</label>
            <Input value={node.data.config?.left||''} onChange={e => update({config:{...node.data.config,left:e.target.value}})} placeholder="{{$last.status}}" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Operator</label>
            <Select value={node.data.config?.operator||'=='} onChange={e => update({config:{...node.data.config,operator:e.target.value}})}>
              {['==','!=','>','<','>=','<=','contains','startsWith','endsWith'].map(op => <option key={op}>{op}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Right Value</label>
            <Input value={node.data.config?.right||''} onChange={e => update({config:{...node.data.config,right:e.target.value}})} placeholder="200" />
          </div>
        </>)}

        {node.data.nodeType === 'delay' && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delay (seconds)</label>
            <Input type="number" min={1} value={node.data.config?.seconds||1} onChange={e => update({config:{...node.data.config,seconds:Number(e.target.value)}})} />
          </div>
        )}

        {node.data.nodeType === 'code' && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">JavaScript</label>
            <Textarea rows={12} className="font-mono text-xs leading-relaxed" value={node.data.config?.code||'// context has all previous outputs\nreturn context.$last;'} onChange={e => update({config:{...node.data.config,code:e.target.value}})} />
          </div>
        )}

        {node.data.nodeType === 'email' && (<>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">To</label>
            <Input value={node.data.config?.to||''} onChange={e => update({config:{...node.data.config,to:e.target.value}})} placeholder="{{$input.email}}" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject</label>
            <Input value={node.data.config?.subject||''} onChange={e => update({config:{...node.data.config,subject:e.target.value}})} placeholder="Hello {{$input.name}}!" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Body</label>
            <Textarea rows={6} value={node.data.config?.body||''} onChange={e => update({config:{...node.data.config,body:e.target.value}})} />
          </div>
        </>)}
      </div>

      <div className="border-t p-4">
        <Button variant="destructive" size="sm" className="w-full" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" /> Remove node
        </Button>
      </div>
    </div>
  );
}

let idCounter = 100;
const genId = () => `node_${++idCounter}`;

export default function WorkflowBuilderPage() {
  const params = useParams();
  console.log("params =", params);
  console.log("params.id =", params?.id);
  const router = useRouter();
  const isNew = params.id === 'new';
  const id = isNew ? '' : params.id as string;

  const { data: workflow, isLoading: wfLoading } = useWorkflow(id);
  const { mutate: update, isPending: saving } = useUpdateWorkflow(id);
  const { mutate: create, isPending: creating } = useCreateWorkflow();
  const { mutate: execute, isPending: executing } = useExecuteWorkflow();

  const initNodes = (isNew ? [] : (workflow?.definition?.nodes ?? [])).map((n: any) => ({...n, type:'workflowNode'}));
  const initEdges = isNew ? [] : (workflow?.definition?.edges ?? []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [name, setName] = useState(workflow?.name ?? 'Untitled Workflow');
  const [status, setStatus] = useState(workflow?.status ?? 'draft');

  const onConnect = useCallback((p: Connection) => setEdges(eds => addEdge({...p, animated:true, style:{strokeWidth:2}}, eds)), [setEdges]);
  const onNodeClick = useCallback((_: any, node: any) => setSelectedNode(node), []);
  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  const addNode = useCallback((nodeType: string) => {
    const cfg = NODE_CATALOG.find(n => n.type === nodeType)!;
    const node = {
      id: genId(), type:'workflowNode',
      position: { x: 200 + Math.random()*80, y: 100 + nodes.length * 160 },
      data: { nodeType, label: cfg.label, description: cfg.desc, config: {} },
    };
    setNodes(n => [...n, node]);
    setSelectedNode(node);
    setShowPalette(false);
  }, [nodes.length, setNodes]);

  const updateSelected = useCallback((patch: any) => {
    if (!selectedNode) return;
    setNodes(ns => ns.map(n => n.id===selectedNode.id ? {...n, data:{...n.data,...patch}} : n));
    setSelectedNode((p: any) => ({...p, data:{...p.data,...patch}}));
  }, [selectedNode, setNodes]);

  const deleteSelected = useCallback(() => {
    if (!selectedNode) return;
    setNodes(ns => ns.filter(n => n.id!==selectedNode.id));
    setEdges(es => es.filter(e => e.source!==selectedNode.id && e.target!==selectedNode.id));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  const save = useCallback(() => {
    const definition = { nodes: nodes.map(({type, ...n}) => n), edges };
    if (isNew) {
      create({ name, definition, status }, { onSuccess: (res: any) => router.push(`/dashboard/workflows/${res.id}`) });
    } else {
      update({ name, definition, status });
    }
  }, [nodes, edges, isNew, name, status, create, update, router]);

  if (!isNew && wfLoading) return (
    <div className="flex h-screen items-center justify-center">
      <Skeleton className="h-8 w-48" />
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b bg-card/90 backdrop-blur-sm px-4 py-2.5 shrink-0 shadow-sm">
        <LinkButton href="/dashboard/workflows" variant="ghost" size="icon-sm" className="mr-1">
          <ArrowLeft className="h-4 w-4" />
        </LinkButton>

        <div className="h-6 w-px bg-border mx-1" />

        <input value={name} onChange={e => setName(e.target.value)}
          className="h-8 max-w-[260px] rounded-lg border-0 bg-transparent px-2 text-sm font-semibold outline-none focus:bg-muted/50 transition-colors"
          placeholder="Workflow name…" />

        {!isNew && workflow && <StatusBadge status={workflow.status} />}

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Select value={status} onChange={e => setStatus(e.target.value)} className="h-8 w-32 text-xs">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </Select>

          <Button variant="outline" size="sm" onClick={() => setShowPalette(!showPalette)}>
            <Plus className="h-3.5 w-3.5" /> Add node
          </Button>

          {!isNew && (
            <Button variant="outline" size="sm" onClick={() => execute({id})} loading={executing}>
              <Play className="h-3.5 w-3.5" /> Run
            </Button>
          )}

          <Button size="sm" onClick={save} loading={saving||creating}>
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Node palette */}
        {showPalette && (
          <div className="w-64 border-r bg-card shrink-0 overflow-y-auto animate-slide-in-right">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-semibold">Add a node</p>
              <button onClick={() => setShowPalette(false)} className="rounded-lg p-1 hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 space-y-1">
              {NODE_CATALOG.map(nc => {
                const Icon = nc.icon;
                return (
                  <button key={nc.type} onClick={() => addNode(nc.type)}
                    className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-muted transition-colors group">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${nc.color} shadow-sm`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{nc.label}</p>
                      <p className="text-xs text-muted-foreground">{nc.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 relative bg-muted/20">
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-card border-2 border-dashed border-border mx-auto mb-4">
                  <Zap className="h-9 w-9 text-muted-foreground/40" />
                </div>
                <p className="font-semibold text-muted-foreground">Canvas is empty</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Click <strong>Add node</strong> to start building</p>
              </div>
            </div>
          )}
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onNodeClick={onNodeClick} onPaneClick={onPaneClick}
            nodeTypes={nodeTypes} fitView attributionPosition="bottom-left"
            defaultEdgeOptions={{ animated:true, style:{strokeWidth:2, stroke:'#8b5cf6'} }}>
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--border))" />
            <Controls className="border bg-card rounded-xl shadow-sm" />
            <MiniMap className="border bg-card rounded-xl shadow-sm" nodeColor={n => {
              const c = NODE_CATALOG.find(nc => nc.type===n.data?.nodeType);
              return c ? '#8b5cf6' : '#94a3b8';
            }} maskColor="hsl(var(--background)/0.8)" />
            <Panel position="top-right">
              <div className="flex gap-2 items-center rounded-xl border bg-card/90 backdrop-blur-sm px-3 py-1.5 shadow-sm text-xs text-muted-foreground">
                <span>{nodes.length} nodes</span>
                <span className="h-3 w-px bg-border" />
                <span>{edges.length} connections</span>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Config panel */}
        {selectedNode && (
          <ConfigPanel node={selectedNode} onUpdate={updateSelected} onDelete={deleteSelected} onClose={() => setSelectedNode(null)} />
        )}
      </div>
    </div>
  );
}
