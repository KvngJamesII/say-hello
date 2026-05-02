import React from 'react';
import { Link } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot, Plus, Play, Square, RefreshCw, ChevronRight,
  Activity, Cpu, MemoryStick, Zap, ArrowRight, AlertTriangle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader, StatCard, Section } from '@/components/shared/PageHeader';
import api from '@/lib/api';

interface BotItem {
  id: string; name: string; runtime: string | null; plan?: string;
  status: string; memoryUsedMb: number; memoryLimitMb: number;
  cpuPercent: number; uptimeSeconds: number;
}

interface Summary {
  totalBots: number; runningBots: number; stoppedBots: number; crashedBots: number;
  activeBots: number; discountPct: number; botsToNextTier: number | null; nextDiscountAt: number | null;
}

const STATUS: Record<string, { color: string; label: string }> = {
  running:     { color: 'var(--success)', label: 'Running' },
  stopped:     { color: 'var(--text-muted)', label: 'Stopped' },
  crashed:     { color: 'var(--danger)', label: 'Crashed' },
  suspended:   { color: 'var(--warning)', label: 'Suspended' },
  setting_up:  { color: 'var(--info)', label: 'Setting up' },
  not_created: { color: 'var(--text-faint)', label: 'Not created' },
};

function fmtUp(s: number): string {
  if (!s || s < 1) return '—';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const DashboardPage: React.FC = () => {
  const qc = useQueryClient();

  const { data: summary } = useQuery<Summary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await api.get('/dashboard/summary')).data,
    refetchInterval: 30_000,
  });

  const { data: bots = [], isLoading } = useQuery<BotItem[]>({
    queryKey: ['bots'],
    queryFn: async () => (await api.get('/bots')).data,
    refetchInterval: 15_000,
  });

  const act = async (id: string, action: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try {
      await api.post(`/bots/${id}/${action}`);
      qc.invalidateQueries({ queryKey: ['bots'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    } catch { /* ignore */ }
  };

  const totalMem = bots.reduce((a, b) => a + (b.memoryUsedMb ?? 0), 0);
  const running = bots.filter(b => b.status === 'running');
  const avgCpu = running.length ? running.reduce((a, b) => a + (b.cpuPercent ?? 0), 0) / running.length : 0;
  const recent = bots.slice(0, 6);
  const nextTierTarget = summary?.discountPct === 0 ? 10 : summary?.discountPct === 10 ? 15 : 20;

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Overview"
        title="Welcome back"
        description="Live snapshot of your bot fleet, uptime, and resource usage."
        actions={
          <Link href="/bots/new">
            <button
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-bold text-white"
              style={{ background: 'var(--accent-primary)' }}
            >
              <Plus size={14} strokeWidth={2.5} /> Deploy bot
            </button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Running bots"
          value={summary?.runningBots ?? 0}
          hint={`of ${summary?.totalBots ?? 0} total`}
          accent="var(--success)"
          icon={<Activity size={15} />}
        />
        <StatCard
          label="Memory"
          value={totalMem > 0 ? `${Math.round(totalMem)}MB` : '—'}
          hint="combined usage"
          accent="var(--info)"
          icon={<MemoryStick size={15} />}
        />
        <StatCard
          label="CPU avg"
          value={avgCpu > 0 ? `${avgCpu.toFixed(1)}%` : '—'}
          hint="across running bots"
          accent="#A78BFA"
          icon={<Cpu size={15} />}
        />
        <StatCard
          label="Crashed"
          value={summary?.crashedBots ?? 0}
          hint="needs attention"
          accent={summary?.crashedBots ? 'var(--danger)' : 'var(--text-muted)'}
          icon={<AlertTriangle size={15} />}
        />
      </div>

      {/* Bulk discount nudge */}
      {summary && summary.discountPct > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5 text-xs"
          style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.18)' }}>
          <Zap size={14} className="text-[--success] shrink-0" />
          <span className="text-[--text-secondary]">
            You have a <span className="text-[--success] font-semibold">{summary.discountPct}% bulk discount</span> active on all your bots
            {summary.botsToNextTier != null && (
              <span className="text-[--text-muted]"> · {summary.botsToNextTier} more bot{summary.botsToNextTier !== 1 ? 's' : ''} to {nextTierTarget}% off</span>
            )}
          </span>
        </div>
      )}

      {summary && summary.discountPct === 0 && summary.totalBots >= 1 && summary.botsToNextTier != null && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5 text-xs"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <Zap size={14} className="text-[--info] shrink-0" />
          <span className="text-[--text-secondary]">
            Add {summary.botsToNextTier} more bot{summary.botsToNextTier !== 1 ? 's' : ''} to unlock <span className="text-[--info] font-semibold">10% off all bots</span>
          </span>
        </div>
      )}

      {/* Bots list */}
      <Section
        title="Your bots"
        description={`${bots.length} bot${bots.length !== 1 ? 's' : ''}`}
        actions={
          <Link href="/bots">
            <span className="text-xs font-semibold flex items-center gap-1 text-[--accent-primary] hover:underline cursor-pointer">
              View all <ChevronRight size={12} />
            </span>
          </Link>
        }
      >
        {isLoading ? (
          <div className="rounded-xl border border-[--border] overflow-hidden bg-[--bg-secondary]">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 animate-pulse border-b last:border-0 border-[--border]" />
            ))}
          </div>
        ) : bots.length === 0 ? (
          <div className="rounded-xl bg-[--bg-secondary] border border-[--border] py-12 px-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center bg-[--bg-tertiary]">
              <Bot size={20} className="text-[--text-muted]" />
            </div>
            <p className="text-base font-semibold text-white mb-1">Deploy your first bot</p>
            <p className="text-sm text-[--text-muted] mb-5 max-w-xs mx-auto">Upload your code, pick a runtime, and you're live in under a minute.</p>
            <Link href="/bots/new">
              <button className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-bold text-white"
                style={{ background: 'var(--accent-primary)' }}>
                <Plus size={13} /> Deploy first bot
              </button>
            </Link>
          </div>
        ) : (
          <div className="rounded-xl bg-[--bg-secondary] border border-[--border] overflow-hidden divide-y divide-[--border]">
            {recent.map(bot => {
              const status = STATUS[bot.status] ?? STATUS.not_created;
              const memPct = bot.memoryLimitMb > 0 ? Math.min(100, (bot.memoryUsedMb / bot.memoryLimitMb) * 100) : 0;
              const isRun = bot.status === 'running';
              const canStart = ['stopped', 'crashed', 'not_created'].includes(bot.status);
              return (
                <Link key={bot.id} href={`/bots/${bot.id}`}>
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors group">
                    <div className="relative shrink-0">
                      <div className="w-2 h-2 rounded-full" style={{ background: status.color }} />
                      {isRun && (
                        <div className="absolute inset-0 rounded-full animate-ping"
                          style={{ background: status.color, opacity: 0.4 }} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">{bot.name}</span>
                        {bot.runtime && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded text-[--text-muted] bg-white/[0.04]">
                            {bot.runtime}
                          </span>
                        )}
                      </div>
                      {isRun ? (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-20 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${memPct}%`, background: memPct > 80 ? 'var(--danger)' : 'var(--accent-primary)' }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-[--text-muted]">
                            {Math.round(bot.memoryUsedMb)}/{bot.memoryLimitMb}MB · {bot.cpuPercent.toFixed(0)}% CPU
                          </span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-[--text-muted] mt-0.5 capitalize">{status.label}</p>
                      )}
                    </div>

                    <span className="hidden sm:inline text-[11px] font-mono text-[--text-muted] tabular-nums w-12 text-right">
                      {isRun ? fmtUp(bot.uptimeSeconds) : ''}
                    </span>

                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canStart && (
                        <button onClick={(e) => act(bot.id, 'start', e)}
                          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06] text-[--success]">
                          <Play size={11} fill="currentColor" />
                        </button>
                      )}
                      {isRun && (
                        <button onClick={(e) => act(bot.id, 'stop', e)}
                          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06] text-[--danger]">
                          <Square size={11} fill="currentColor" />
                        </button>
                      )}
                      <button onClick={(e) => act(bot.id, 'restart', e)}
                        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06] text-[--text-muted]">
                        <RefreshCw size={11} />
                      </button>
                      <ArrowRight size={13} className="text-[--text-faint] ml-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Section>
    </DashboardLayout>
  );
};

export default DashboardPage;
