import React from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Bot, CreditCard, Settings, ShieldCheck,
  Users, Server, Tag, Gift, Megaphone, Receipt, ScrollText, Bug,
  ChevronDown, Plus,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader,
  SidebarFooter, useSidebar, SidebarMenuSub, SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/ui/Logo';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const mainNav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Bots', href: '/bots', icon: Bot },
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const adminNav = [
  { label: 'Overview', href: '/admin', icon: ShieldCheck },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Containers', href: '/admin/containers', icon: Server },
  { label: 'Coupons', href: '/admin/coupons', icon: Tag },
  { label: 'Trial Codes', href: '/admin/trial-codes', icon: Gift },
  { label: 'Broadcast', href: '/admin/broadcast', icon: Megaphone },
  { label: 'Payments', href: '/admin/payments', icon: Receipt },
  { label: 'Audit Log', href: '/admin/audit-log', icon: ScrollText },
  { label: 'Debug Logs', href: '/admin/debug-logs', icon: Bug },
];

export const AppSidebar: React.FC = () => {
  const [location] = useLocation();
  const { user } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const isAdmin = user?.role === 'admin';
  const onAdminPage = location.startsWith('/admin');

  const isActive = (href: string) =>
    href === '/dashboard'
      ? location === '/dashboard'
      : href === '/admin'
        ? location === '/admin'
        : location.startsWith(href);

  return (
    <Sidebar collapsible="icon" className="border-r border-[--border] bg-[--bg-secondary]">
      <SidebarHeader className="h-16 border-b border-[--border] flex items-center justify-center px-4">
        <Link href="/dashboard">
          <div className="flex items-center cursor-pointer">
            {collapsed ? (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
                <span className="text-base font-black">R</span>
              </div>
            ) : (
              <Logo />
            )}
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="bg-[--bg-secondary]">
        {/* Quick action */}
        {!collapsed && (
          <div className="px-3 pt-3">
            <Link href="/bots/new">
              <button
                className="w-full flex items-center gap-2 h-9 px-3 rounded-lg text-xs font-bold text-white transition-all"
                style={{
                  background: 'var(--accent-primary)',
                  boxShadow: '0 0 0 1px rgba(249,115,22,0.4), 0 4px 16px rgba(249,115,22,0.18)',
                }}
              >
                <Plus size={14} strokeWidth={2.5} /> New Bot
              </button>
            </Link>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 gap-0.5">
              {mainNav.map(item => {
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}
                      className={cn(
                        'h-9 rounded-lg text-sm font-medium transition-all',
                        active
                          ? 'bg-[--accent-soft] text-[--accent-primary] hover:bg-[--accent-soft] hover:text-[--accent-primary]'
                          : 'text-[--text-secondary] hover:bg-white/[0.04] hover:text-white'
                      )}>
                      <Link href={item.href}>
                        <item.icon size={16} strokeWidth={active ? 2.4 : 2} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            {!collapsed && (
              <p className="px-5 mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[--text-faint]">
                Admin
              </p>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="px-2 gap-0.5">
                <Collapsible defaultOpen={onAdminPage} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip="Admin"
                        className={cn(
                          'h-9 rounded-lg text-sm font-medium transition-all',
                          onAdminPage
                            ? 'text-amber-400 bg-amber-400/[0.08]'
                            : 'text-[--text-secondary] hover:bg-white/[0.04] hover:text-white'
                        )}>
                        <ShieldCheck size={16} />
                        <span>Admin Tools</span>
                        <ChevronDown size={13} className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180 opacity-60" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="border-l-[--border] mr-0 pr-0">
                        {adminNav.map(item => {
                          const active = isActive(item.href);
                          return (
                            <SidebarMenuSubItem key={item.href}>
                              <SidebarMenuSubButton asChild isActive={active}
                                className={cn(
                                  'h-8 rounded-md text-[13px] font-medium',
                                  active
                                    ? 'text-amber-400 bg-amber-400/[0.08]'
                                    : 'text-[--text-muted] hover:bg-white/[0.03] hover:text-white'
                                )}>
                                <Link href={item.href}>
                                  <item.icon size={13} />
                                  <span>{item.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-[--border] p-3 bg-[--bg-secondary]">
        {collapsed ? (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-[--accent-primary]"
            style={{ background: 'var(--accent-soft)' }}>
            {user?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
        ) : (
          <Link href="/settings">
            <div className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-white/[0.04] transition-colors">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-[--accent-primary] shrink-0"
                style={{ background: 'var(--accent-soft)' }}>
                {user?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-white truncate">{user?.fullName}</span>
                <span className="text-[11px] text-[--text-muted] truncate capitalize">{user?.plan?.replace('_', ' ') ?? 'Free trial'}</span>
              </div>
            </div>
          </Link>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
