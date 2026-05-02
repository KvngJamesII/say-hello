import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Bot, Plus, ChevronRight, Play, Square, RefreshCw, Zap } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

const B   = "rgba(255,255,255,0.07)";
const S   = "rgba(255,255,255,0.04)";
const DIM = "rgba(255,255,255,0.4)";
const MUT = "rgba(255,255,255,0.22)";
const BL  = "#3b82f6";
const GR  = "#22c55e";

const STATUS_DOT: Record<string, string> = {
  running: GR, stopped: MUT, crashed: "#ef4444",
  suspended: "#f59e0b", setting_up: BL, not_created: "rgba(255,255,255,0.12)",
};

function fmtUp(s: number): string {
  if (!s || s < 1) return "—";
  if (s < 60)    return `${s}s`;
  if (s < 3600)  return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return `${Math.floor(s/86400)}d`;
}

const DashboardPage: React.FC = () => {
  const qc = useQueryClient();

  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const r = await api.get("/dashboard/summary");
      return r.data as {
        totalBots: number; runningBots: number; stoppedBots: number; crashedBots: number;
        activeBots: number; discountPct: number; botsToNextTier: number|null; nextDiscountAt: number|null;
      };
    },
    refetchInterval: 30_000,
  });

  const { data: bots = [], isLoading } = useQuery({
    queryKey: ["bots"],
    queryFn: async () => {
      const r = await api.get("/bots");
      return r.data as Array<{
        id: string; name: string; runtime: string|null; plan?: string; status: string;
        memoryUsedMb: number; memoryLimitMb: number; cpuPercent: number; uptimeSeconds: number;
      }>;
    },
    refetchInterval: 15_000,
  });

  const act = async (id: string, action: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try { await api.post(`/bots/${id}/${action}`); qc.invalidateQueries({ queryKey: ["bots"] }); qc.invalidateQueries({ queryKey: ["dashboard-summary"] }); } catch {}
  };

  const totalMem  = bots.reduce((a, b) => a + (b.memoryUsedMb ?? 0), 0);
  const running   = bots.filter(b => b.status === "running");
  const avgCpu    = running.length ? running.reduce((a,b) => a+(b.cpuPercent??0),0)/running.length : 0;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-bold text-white">Dashboard</h1>
        <Link href="/bots/new">
          <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold text-white" style={{ background: BL }}>
            <Plus size={13}/> New Bot
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px mb-5 overflow-hidden rounded-xl" style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${B}` }}>
        {[
          { label:"Running",  value: summary?.runningBots??0, sub:`of ${summary?.totalBots??0} bots`, color:GR },
          { label:"Memory",   value: totalMem>0?`${Math.round(totalMem)}MB`:"—", sub:"combined", color:BL },
          { label:"CPU avg",  value: avgCpu>0?`${avgCpu.toFixed(1)}%`:"—", sub:"running bots", color:"#8b5cf6" },
        ].map((s,i) => (
          <div key={i} className="flex flex-col gap-1 p-3" style={{ background:"var(--bg-primary)" }}>
            <span className="text-[10px] uppercase tracking-wide" style={{ color:MUT }}>{s.label}</span>
            <span className="text-xl font-bold leading-none tabular-nums" style={{ color:s.color }}>{s.value}</span>
            <span className="text-[10px]" style={{ color:MUT }}>{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Bulk discount nudge */}
      {summary && summary.discountPct > 0 && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-4 text-xs" style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.15)" }}>
          <Zap size={13} style={{ color:GR }}/>
          <span style={{ color:"rgba(255,255,255,0.7)" }}>
            You have a <span style={{ color:GR, fontWeight:700 }}>{summary.discountPct}% bulk discount</span> active on all your bots
            {summary.botsToNextTier != null && <span style={{ color:MUT }}> · {summary.botsToNextTier} more bot{summary.botsToNextTier!==1?"s":""} to {summary.discountPct===10?15:20}% off</span>}
          </span>
        </div>
      )}

      {/* First-bot nudge */}
      {summary && summary.discountPct === 0 && summary.totalBots >= 1 && summary.botsToNextTier != null && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-4 text-xs" style={{ background:S, border:`1px solid ${B}` }}>
          <Zap size={13} style={{ color:BL }}/>
          <span style={{ color:DIM }}>
            Add {summary.botsToNextTier} more bot{summary.botsToNextTier!==1?"s":""} to unlock <span style={{ color:BL, fontWeight:600 }}>10% off all bots</span>
          </span>
        </div>
      )}

      {/* Bot list */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-white">Bots <span className="font-normal text-xs" style={{ color:MUT }}>({bots.length})</span></p>
        <Link href="/bots"><span className="text-xs font-semibold flex items-center gap-0.5" style={{ color:BL }}>View all <ChevronRight size={12}/></span></Link>
      </div>

      {isLoading ? (
        <div className="rounded-xl overflow-hidden" style={{ border:`1px solid ${B}` }}>
          {[1,2,3].map(i => <div key={i} className="h-12 animate-pulse border-b last:border-0" style={{ background:S, borderColor:B }}/>)}
        </div>
      ) : bots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 rounded-xl text-center" style={{ background:S, border:`1px solid ${B}` }}>
          <Bot size={22} className="mb-2" style={{ color:MUT }}/>
          <p className="text-base font-semibold text-white mb-1">No bots yet</p>
          <p className="text-xs mb-4" style={{ color:DIM }}>Deploy your first bot in under a minute.</p>
          <Link href="/bots/new">
            <button className="h-8 px-4 rounded-lg text-xs font-bold text-white" style={{ background:BL }}>Create Bot</button>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border:`1px solid ${B}` }}>
          {bots.slice(0,8).map(bot => {
            const dot     = STATUS_DOT[bot.status] ?? STATUS_DOT.not_created;
            const rp      = bot.memoryLimitMb>0 ? Math.min(100,(bot.memoryUsedMb/bot.memoryLimitMb)*100) : 0;
            const isRun   = bot.status === "running";
            const canStart = ["stopped","crashed","not_created"].includes(bot.status);
            const isPro   = (bot.plan ?? "basic") === "pro";
            return (
              <Link key={bot.id} href={`/bots/${bot.id}`}>
                <div className="flex items-center gap-2.5 px-4 py-3 cursor-pointer hover:bg-white/[0.02] border-b last:border-0"
                  style={{ borderColor:B, borderLeft:`3px solid ${isRun?GR:"transparent"}` }}>

                  {/* Runtime badge */}
                  {bot.runtime && (
                    <div className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{
                        background: bot.runtime.includes("py")?"rgba(75,139,190,0.12)":"rgba(104,160,99,0.1)",
                        border: `1px solid ${bot.runtime.includes("py")?"rgba(75,139,190,0.2)":"rgba(104,160,99,0.18)"}`,
                        color: bot.runtime.includes("py")?"#60a5fa":"#86efac",
                      }}>
                      {bot.runtime.includes("py")?"PY":"JS"}
                    </div>
                  )}

                  <span className="text-sm font-medium text-white flex-1 truncate">{bot.name}</span>

                  {/* Plan badge */}
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wide"
                    style={isPro
                      ? { background:"rgba(59,130,246,0.1)", color:BL }
                      : { background:"rgba(255,255,255,0.05)", color:MUT }
                    }>
                    {isPro?"Pro":"Basic"}
                  </span>

                  {/* Memory bar */}
                  {isRun && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-10 h-0.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.08)" }}>
                        <div className="h-full rounded-full" style={{ width:`${rp}%`, background:rp>80?"#ef4444":BL }}/>
                      </div>
                      <span className="text-[10px] tabular-nums w-8 text-right" style={{ color:MUT }}>{Math.round(bot.memoryUsedMb)}M</span>
                    </div>
                  )}

                  <span className="text-xs shrink-0 w-14 text-right tabular-nums" style={{ color:MUT }}>
                    {isRun ? fmtUp(bot.uptimeSeconds) : bot.status.replace(/_/g," ")}
                  </span>

                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:dot, boxShadow:isRun?`0 0 5px rgba(34,197,94,0.5)`:"none" }}/>

                  <div className="flex gap-0.5 shrink-0">
                    {canStart && (
                      <button onClick={e=>act(bot.id,"start",e)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10" style={{ color:GR }}><Play size={11} fill="currentColor"/></button>
                    )}
                    {isRun && (
                      <button onClick={e=>act(bot.id,"stop",e)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10" style={{ color:"#ef4444" }}><Square size={11} fill="currentColor"/></button>
                    )}
                    <button onClick={e=>act(bot.id,"restart",e)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10" style={{ color:MUT }}><RefreshCw size={11}/></button>
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

export default DashboardPage;
