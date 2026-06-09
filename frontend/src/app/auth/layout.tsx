import Link from 'next/link';
import { Zap, CheckCircle2 } from 'lucide-react';

const FEATURES = [
  'Drag-and-drop workflow builder',
  '10+ native integrations (Slack, GitHub, OpenAI…)',
  'Real-time execution engine with step logs',
  'Stripe billing with usage metering',
  'Role-based access & audit log',
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1fr]">
      {/* Left panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white">
        {/* Gradient blobs */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-violet-600/25 blur-3xl" />
        <div className="absolute top-1/2 -right-20 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-80 w-80 rounded-full bg-purple-700/20 blur-3xl" />

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 shadow-lg shadow-violet-500/30">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">FlowForge</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300 mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
              Trusted by 2,000+ teams
            </div>
            <h2 className="text-3xl font-bold leading-tight text-white">
              Automate your entire<br />stack in minutes
            </h2>
            <p className="mt-3 text-slate-400 text-sm leading-relaxed">
              Connect your tools, trigger actions automatically, and reclaim hours of manual work every week.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-400" />
                {f}
              </li>
            ))}
          </ul>

          <blockquote className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-200 leading-relaxed">
              "FlowForge cut our ops overhead by 60%. Our team now runs 300+ automations without writing a single script."
            </p>
            <footer className="mt-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 text-xs font-bold">S</div>
              <div>
                <p className="text-xs font-semibold">Sarah Chen</p>
                <p className="text-xs text-slate-500">CTO, Nexus Labs</p>
              </div>
            </footer>
          </blockquote>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
          {[['50K+','Workflows built'],['2M+','Hours saved'],['99.9%','Uptime SLA']].map(([v,l]) => (
            <div key={l}>
              <p className="text-2xl font-bold">{v}</p>
              <p className="text-xs text-slate-500 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col items-center justify-center p-8 bg-background">
        <div className="w-full max-w-[400px]">
          <Link href="/" className="inline-flex items-center gap-2 mb-10 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">FlowForge</span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
