import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Loader2, Rocket } from 'lucide-react';
import { SiNodedotjs, SiPython } from 'react-icons/si';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

const RUNTIMES = [
  {
    id: 'nodejs', name: 'Node.js', versions: 'v18 · v20 · v22',
    Icon: SiNodedotjs, color: '#68A063', bg: 'rgba(104,160,99,0.08)', border: 'rgba(104,160,99,0.3)',
  },
  {
    id: 'python', name: 'Python', versions: 'v3.9 · v3.10 · v3.11',
    Icon: SiPython, color: '#4B8BBE', bg: 'rgba(75,139,190,0.08)', border: 'rgba(75,139,190,0.3)',
  },
];

const NewBotPage: React.FC = () => {
  const [name, setName] = useState('');
  const [runtime, setRuntime] = useState<'nodejs' | 'python'>('nodejs');
  const [loading, setLoading] = useState(false);
  const { error: toastErr } = useToast();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const create = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      const { data: bot } = await api.post('/bots', { name: name.trim(), runtime });
      qc.invalidateQueries({ queryKey: ['bots'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setLocation(`/bots/${bot.id}`);
    } catch (e: any) {
      toastErr('Error', e.response?.data?.error ?? 'Failed to create bot.');
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto">
        <Link href="/bots">
          <button className="flex items-center gap-1 text-xs font-medium text-[--text-muted] hover:text-white mb-4 transition-colors">
            <ChevronLeft size={14} /> Back to bots
          </button>
        </Link>

        <div className="rounded-2xl bg-[--bg-secondary] border border-[--border] p-6 sm:p-8">
          <h1 className="text-xl font-bold text-white tracking-tight mb-1">New bot</h1>
          <p className="text-sm text-[--text-secondary] mb-7">
            Name your bot and pick a runtime to get started. You can upload your code on the next screen.
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 text-[--text-muted]">
                Bot name
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. MusicBot, TradeBot…"
                autoFocus
                disabled={loading}
                onKeyDown={e => e.key === 'Enter' && name.trim() && create()}
                className="w-full h-11 px-3.5 rounded-lg text-sm font-medium text-white outline-none bg-[--bg-tertiary] border border-[--border] focus:border-[--accent-primary]/40 transition-colors disabled:opacity-50"
              />
              <p className="text-[11px] mt-1.5 text-[--text-muted]">Used as your bot's display name everywhere.</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 text-[--text-muted]">
                Runtime
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {RUNTIMES.map(rt => {
                  const sel = runtime === rt.id;
                  return (
                    <button
                      key={rt.id}
                      type="button"
                      onClick={() => setRuntime(rt.id as 'nodejs' | 'python')}
                      disabled={loading}
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-xl text-left transition-all border',
                        'disabled:opacity-50'
                      )}
                      style={{
                        background: sel ? rt.bg : 'var(--bg-tertiary)',
                        borderColor: sel ? rt.border : 'var(--border)',
                      }}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: sel ? `${rt.color}1f` : 'rgba(255,255,255,0.04)' }}>
                        <rt.Icon size={20} style={{ color: sel ? rt.color : 'var(--text-muted)' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white">{rt.name}</p>
                        <p className="text-[11px] font-mono mt-0.5" style={{ color: sel ? rt.color : 'var(--text-muted)' }}>
                          {rt.versions}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={create}
              disabled={!name.trim() || loading}
              className="w-full h-11 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
              style={{ background: 'var(--accent-primary)' }}
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Creating…</>
                : <><Rocket size={15} /> Create bot</>
              }
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewBotPage;
