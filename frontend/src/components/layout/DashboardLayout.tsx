'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Workflow, Puzzle, BarChart3, CreditCard,
  Settings, LogOut, Bell, Menu, X, Moon, Sun, Zap, ChevronRight,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useAuth, useLogout } from '@/hooks/use-auth';
import { Avatar } from '@/components/ui';

const NAV = [
  { href: '/dashboard',              label: 'Dashboard',    icon: LayoutDashboard, exact: true },
  { href: '/dashboard/workflows',    label: 'Workflows',    icon: Workflow },
  { href: '/dashboard/integrations', label: 'Integrations', icon: Puzzle },
  { href: '/dashboard/analytics',    label: 'Analytics',    icon: BarChart3 },
  { href: '/dashboard/billing',      label: 'Billing',      icon: CreditCard },
  { href: '/dashboard/settings',     label: 'Settings',     icon: Settings },
];

function NavItem({ href, label, icon: Icon, exact = false, collapsed, onClick }: any) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link href={href} onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
        active
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        collapsed && 'justify-center px-2.5',
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className={cn('h-4.5 w-4.5 shrink-0', active ? '' : 'group-hover:scale-110 transition-transform')} style={{width:'18px',height:'18px'}} />
      {!collapsed && <span className="flex-1">{label}</span>}
      {!collapsed && active && <ChevronRight className="h-3 w-3 opacity-60" />}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const { mutate: logout } = useLogout();
  const { theme, setTheme } = useTheme();

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={closeMobile} />}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card/95 backdrop-blur-sm transition-all duration-300 ease-in-out md:relative md:translate-x-0',
        collapsed ? 'w-[68px]' : 'w-64',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}>
        {/* Logo */}
        <div className={cn('flex h-16 items-center border-b px-4', collapsed ? 'justify-center px-2' : 'gap-3')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/30">
            <Zap className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <span className="font-bold text-base tracking-tight">FlowForge</span>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Automation Builder</p>
            </div>
          )}
          <button className="ml-auto md:hidden" onClick={closeMobile}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {NAV.map(item => (
            <NavItem key={item.href} {...item} collapsed={collapsed} onClick={closeMobile} />
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t p-3 space-y-0.5">
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors', collapsed && 'justify-center px-2.5')}>
            {theme === 'dark' ? <Sun style={{width:'18px',height:'18px'}} /> : <Moon style={{width:'18px',height:'18px'}} />}
            {!collapsed && <span>Toggle theme</span>}
          </button>
          <button onClick={() => logout()}
            className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors', collapsed && 'justify-center px-2.5')}>
            <LogOut style={{width:'18px',height:'18px'}} />
            {!collapsed && <span>Sign out</span>}
          </button>

          {!collapsed && user && (
            <div className="mt-2 flex items-center gap-3 rounded-xl border bg-muted/40 px-3 py-2.5">
              <Avatar name={user.fullName} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{user.fullName}</p>
                <p className="text-[10px] text-muted-foreground truncate capitalize">{user.role}</p>
              </div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 hidden h-6 w-6 items-center justify-center rounded-full border bg-card shadow-md md:flex hover:bg-muted transition-colors z-10">
          <ChevronRight className={cn('h-3 w-3 text-muted-foreground transition-transform', collapsed && 'rotate-180')} />
        </button>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card/80 backdrop-blur-sm px-4 md:px-6">
          <button onClick={() => setMobileOpen(true)} className="md:hidden rounded-lg p-2 hover:bg-muted transition-colors">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <button className="relative rounded-xl p-2 hover:bg-muted transition-colors">
            <Bell className="h-4.5 w-4.5" style={{width:'18px',height:'18px'}} />
          </button>
          {user && <Avatar name={user.fullName} size="sm" />}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
