import React from 'react';
import { useLocation, Link } from 'wouter';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, CreditCard, ChevronRight } from 'lucide-react';

const labelMap: Record<string, string> = {
  dashboard: 'Dashboard',
  bots: 'Bots',
  new: 'New',
  billing: 'Billing',
  settings: 'Settings',
  checkout: 'Checkout',
  admin: 'Admin',
  users: 'Users',
  containers: 'Containers',
  coupons: 'Coupons',
  'trial-codes': 'Trial Codes',
  broadcast: 'Broadcast',
  payments: 'Payments',
  'audit-log': 'Audit Log',
  'debug-logs': 'Debug Logs',
  console: 'Console',
  files: 'Files',
  config: 'Config',
};

function buildCrumbs(pathname: string): { label: string; href: string }[] {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let acc = '';
  parts.forEach((p, i) => {
    acc += '/' + p;
    // Skip raw IDs (long, no friendly label)
    const isId = !labelMap[p] && /^[a-zA-Z0-9_-]{8,}$/.test(p) && parts[i - 1] === 'bots';
    crumbs.push({
      label: isId ? 'Detail' : (labelMap[p] ?? p.charAt(0).toUpperCase() + p.slice(1)),
      href: acc,
    });
  });
  return crumbs;
}

export const AppHeader: React.FC = () => {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const crumbs = buildCrumbs(location);

  return (
    <header className="h-16 shrink-0 border-b border-[--border] bg-[--bg-primary]/80 backdrop-blur-xl flex items-center justify-between gap-3 px-3 md:px-5 sticky top-0 z-30">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <SidebarTrigger className="text-[--text-secondary] hover:text-white hover:bg-white/[0.04] h-9 w-9 rounded-lg" />
        <div className="hidden sm:flex items-center gap-1.5 text-sm min-w-0 overflow-hidden">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <React.Fragment key={c.href}>
                {i > 0 && <ChevronRight size={13} className="text-[--text-faint] shrink-0" />}
                {isLast ? (
                  <span className="font-semibold text-white truncate">{c.label}</span>
                ) : (
                  <Link href={c.href}>
                    <span className="text-[--text-muted] hover:text-white cursor-pointer truncate">{c.label}</span>
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-[12px] font-bold text-[--accent-primary]"
                style={{ background: 'var(--accent-soft)' }}>
                {user?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <span className="hidden md:inline text-xs font-semibold text-white max-w-[120px] truncate">
                {user?.fullName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-56 bg-[--bg-elevated] border-[--border] text-[--text-primary]"
          >
            <DropdownMenuLabel className="font-normal py-2">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white truncate">{user?.fullName}</span>
                <span className="text-[11px] text-[--text-muted] truncate font-normal">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[--border]" />
            <DropdownMenuItem asChild className="cursor-pointer text-xs focus:bg-white/[0.04] focus:text-white">
              <Link href="/settings">
                <Settings size={13} className="mr-2" /> Account settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer text-xs focus:bg-white/[0.04] focus:text-white">
              <Link href="/billing">
                <CreditCard size={13} className="mr-2" /> Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[--border]" />
            <DropdownMenuItem
              onClick={() => logout()}
              className="cursor-pointer text-xs text-[--danger] focus:bg-[--danger]/10 focus:text-[--danger]"
            >
              <LogOut size={13} className="mr-2" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
