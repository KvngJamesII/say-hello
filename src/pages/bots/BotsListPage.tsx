import React, { useState } from 'react';
import { Link } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot, Plus, Search, Play, Square, RefreshCw, X,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface BotItem {
  id: string; name: string; runtime: string | null; status: string;
  memoryUsedMb: number; memoryLimitMb: number; cpuPercent: number; uptimeSeconds: number;
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
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

const FILTERS = ['all', 'running', 'stopped', 'crashed'] as const;
type Filter = typeof FILTERS[number];

const BotsListPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const qc = useQueryClient();

  const { data: bots = [], isLoading } = useQuery<BotItem[]>({
    queryKey: ['bots-list'],
    queryFn: async () => (await api.get('/bots')).data,
    refetchInterval: 15_000,
  });

  const act = async (id: string, action: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try { await api.post(`/bots/${id}/${action}`); qc.invalidateQueries({ queryKey: ['bots-list'] }); } catch { /* ignore */ }
  };

  const counts = {
    all: bots.length,
    running: bots.filter(b => b.status === 'running').length,
    stopped: bots.filter(b => ['stopped', 'not_created', 'suspended'].includes(b.status)).length,
    crashed: bots.filter(b => b.status === 'crashed').length,
  };

  const filtered = bots.filter(b => {
    const ms = b.name.toLowerCase().includes(search.toLowerCase())
      || (b.runtime ?? '').toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'all'
      || b.status === filter
      || (filter === 'stopped' && ['stopped', 'not_created', 'suspended'].includes(b.status));
    return ms && mf;
  });

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Workspace"
        title="My bots"
        description="Deploy, monitor, and control all of your bots in one place."
        actions={
          <Link href="/bots/new">
            <button className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-bold text-white"
              style={{ background: 'var(--accent-primary)' }}>
              <Plus size={14} strokeWidth={2.5} /> New bot
            </button>
          </Link>
        }
      />

      {/* Filter pills + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
          {FILTERS.map(k => {
            const active = filter === k;
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={cn(
                  'shrink-0 h-9 px-3 rounded-lg text-xs font-semibold capitalize border transition-colors',
                  active
                    ? 'bg-[--accent-soft] border-[--accent-primary]/40 text-[--accent-primary]'
                    : 'bg-[--bg-secondary] border-[--border] text-[--text-secondary] hover:text-white hover:border-[--border-strong]'
                )}
              >
                {k} <span className={cn('ml-1 font-mono text-[10px]', active ? 'text-[--accent-primary]' : 'text-[--text-muted]')}>{counts[k]}</span>
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[--text-muted]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or runtime…"
            className="w-full h-9 pl-9 pr-9 rounded-lg text-sm text-white outline-none bg-[--bg-secondary] border border-[--border] focus:border-[--border-strong] transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-[--text-muted] hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="rounded-xl bg-[--bg-secondary] border border-[--border] overflow-hidden divide-y divide-[--border]">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-[--bg-secondary] border border-[--border] py-14 px-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center bg-[--bg-tertiary]">
            <Bot size={20} className="text-[--text-muted]" />
          </div>
          <p className="text-base font-semibold text-white mb-1">
            {search || filter !== 'all' ? 'No bots match your filter' : 'No bots yet'}
          </p>
          <p className="text-sm text-[--text-muted] mb-5">
            {search || filter !== 'all' ? 'Try a different filter or search term.' : 'Upload a .zip and your bot is live in 60s.'}
          </p>
          {!search && filter === 'all' && (
            <Link href="/bots/new">
              <button className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-bold text-white"
                style={{ background: 'var(--accent-primary)' }}>
                <Plus size={13} /> Deploy first bot
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-[--bg-secondary] border border-[--border] overflow-hidden divide-y divide-[--border]">
          {filtered.map(bot => {
            const status = STATUS[bot.status] ?? STATUS.not_created;
            const memPct = bot.memoryLimitMb > 0 ? Math.min(100, (bot.memoryUsedMb / bot.memoryLimitMb) * 100) : 0;
            const isRun = bot.status === 'running';
            const canStart = ['stopped', 'crashed', 'not_created'].includes(bot.status);
            return (
              <Link key={bot.id} href={`/bots/${bot.id}`}>
                <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/[0.02] transition-colors group">
                  <div className="relative shrink-0">
                    <div className="w-2 h-2 rounded-full" style={{ background: status.color }} />
                    {isRun && (
                      <div className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: status.color, opacity: 0.4 }} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
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
                          {bot.memoryUsedMb}/{bot.memoryLimitMb}MB · {bot.cpuPercent.toFixed(0)}% CPU
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[--text-muted] mt-0.5">{status.label}</p>
                    )}
                  </div>

                  <span className="hidden md:inline text-[11px] font-mono text-[--text-muted] tabular-nums w-14 text-right">
                    {isRun ? fmtUp(bot.uptimeSeconds) : ''}
                  </span>

                  <div className="flex items-center gap-0.5 shrink-0">
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
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default BotsListPage;
