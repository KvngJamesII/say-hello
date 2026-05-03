import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, StatCard } from "@/components/shared/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { Check, Tag, History, ArrowRight, Zap, Calendar, CreditCard, Sparkles } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";

interface Plan { id: string; name: string; priceKobo: number; botLimit: number; ramPerBotMb: number; storageGb: number; features: Record<string, any>; }
interface Sub { planId: string; planName: string; status: string; expiryDate: string | null; startDate: string; priceKobo: number; botLimit: number; ramPerBotMb: number; }
interface Payment { id: string; reference: string; amountKobo: number; status: string; planName: string; paidAt: string | null; createdAt: string; }

const fmtN = (k: number) => "₦" + (k / 100).toLocaleString("en-NG");
const fmtD = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const dLeft = (s: string | null) => (s ? Math.max(0, Math.ceil((new Date(s).getTime() - Date.now()) / 86400000)) : null);

const FEATS: Record<string, string[]> = {
  starter: ["1 Bot", "512MB RAM", "3GB Storage", "Live Logs", "Auto Restart"],
  developer: ["3 Bots", "768MB RAM", "10GB Storage", "Terminal", "Priority Queue"],
  pro: ["8 Bots", "1GB RAM", "25GB Storage", "Analytics", "Multi-Env Profiles"],
};

const BillingPage: React.FC = () => {
  const { error: toastErr } = useToast();
  const [coupon, setCoupon] = useState("");
  const [msg, setMsg] = useState<{ t: "ok" | "err"; s: string } | null>(null);

  const { data: sub, isLoading: subLoad } = useQuery<Sub>({
    queryKey: ["subscription"],
    queryFn: async () => (await api.get("/billing/subscription")).data,
    retry: false,
  });

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: async () => (await api.get("/billing/plans")).data,
  });

  const { data: paymentsData } = useQuery<{ payments: Payment[]; total: number }>({
    queryKey: ["payments"],
    queryFn: async () => (await api.get("/billing/payments?limit=20")).data,
  });

  const applyCoupon = useMutation({
    mutationFn: async () => (await api.post("/billing/coupon/validate", { code: coupon, planId: sub?.planId ?? "starter" })).data,
    onSuccess: (d: any) => setMsg({ t: "ok", s: `Valid! ${d.discountPercent ?? 0}% off your next payment.` }),
    onError: () => setMsg({ t: "err", s: "Invalid or expired code." }),
  });

  const upgrade = useMutation({
    mutationFn: async (planId: string) => (await api.post("/billing/checkout", { planId, callbackUrl: window.location.origin + "/billing" })).data,
    onSuccess: (d: any) => { if (d.authorizationUrl) window.location.href = d.authorizationUrl; },
    onError: () => toastErr("Failed", "Please try again."),
  });

  const days = dLeft(sub?.expiryDate ?? null);
  const paidPlans = plans.filter((p) => p.id !== "free_trial");
  const payments = paymentsData?.payments ?? [];

  return (
    <DashboardLayout>
      <PageHeader title="Billing" description="Manage your subscription, payment methods and invoices." />

      {/* Expiry nudge */}
      {days != null && days <= 7 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-6 text-sm border"
          style={{ background: "var(--accent-soft)", borderColor: "rgba(249,115,22,0.2)" }}>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-[--accent-primary]" />
            <span className="text-[--text-secondary]">Plan expires in <span className="font-semibold text-[--accent-primary]">{days === 0 ? "today" : `${days} days`}</span></span>
          </div>
          <span className="text-xs font-semibold text-[--accent-primary]">Renew below ↓</span>
        </div>
      )}

      {/* Current plan summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Current Plan"
          value={subLoad ? "—" : sub?.planName ?? "None"}
          hint={sub?.status ?? "No active plan"}
          icon={<Sparkles size={16} />}
          accent="var(--text-primary)"
        />
        <StatCard
          label="Monthly Cost"
          value={sub ? fmtN(sub.priceKobo) : "—"}
          hint={sub ? `${sub.botLimit} bot${sub.botLimit !== 1 ? "s" : ""} · ${sub.ramPerBotMb}MB RAM` : "Choose a plan"}
          icon={<CreditCard size={16} />}
          accent="var(--accent-primary)"
        />
        <StatCard
          label="Renews"
          value={sub?.expiryDate ? fmtD(sub.expiryDate) : "—"}
          hint={days != null ? `${days} day${days !== 1 ? "s" : ""} remaining` : ""}
          icon={<Calendar size={16} />}
        />
      </div>

      {/* Plans */}
      {paidPlans.length > 0 && (
        <section className="mb-8">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Available Plans</h2>
              <p className="text-xs text-[--text-muted] mt-0.5">Upgrade or change anytime — pro-rated.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paidPlans.map((plan) => {
              const isCurrent = sub?.planId === plan.id;
              const feats = FEATS[plan.id] ?? [`${plan.botLimit} bots`, `${plan.ramPerBotMb}MB RAM`];
              return (
                <Card key={plan.id} className={`p-5 flex flex-col transition-all ${isCurrent ? "ring-1 ring-[--accent-primary]" : "hover:border-white/10"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-base font-semibold text-white">{plan.name}</p>
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                        style={{ background: "var(--accent-soft)", color: "var(--accent-primary)" }}>
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-white mb-4">
                    {fmtN(plan.priceKobo)}
                    <span className="text-xs font-normal text-[--text-muted] ml-1">/mo</span>
                  </p>
                  <ul className="flex flex-col gap-2 mb-5 flex-1">
                    {feats.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-[--text-secondary]">
                        <Check size={12} className="text-[--success] shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => upgrade.mutate(plan.id)}
                    disabled={isCurrent || upgrade.isPending}
                    className="w-full h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:cursor-default"
                    style={isCurrent ? { background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" } : { background: "var(--accent-primary)", color: "white" }}
                  >
                    {isCurrent ? "Current Plan" : (<><ArrowRight size={12} /> Choose {plan.name}</>)}
                  </button>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Coupon */}
      <Card className="p-5 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Tag size={14} className="text-[--accent-primary]" />
          <p className="text-sm font-semibold text-white">Promo Code</p>
        </div>
        <div className="flex gap-2">
          <input
            value={coupon}
            onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setMsg(null); }}
            placeholder="ENTER CODE"
            className="flex-1 h-10 px-3 rounded-lg text-xs font-mono font-bold text-white uppercase outline-none bg-[--bg-primary] border border-[--border] focus:border-[--accent-primary] transition-colors"
          />
          <button
            onClick={() => applyCoupon.mutate()}
            disabled={!coupon || applyCoupon.isPending}
            className="h-10 px-5 rounded-lg text-xs font-bold text-white shrink-0 disabled:opacity-50"
            style={{ background: "var(--accent-primary)" }}
          >
            Apply
          </button>
        </div>
        {msg && (
          <p className="text-xs mt-2" style={{ color: msg.t === "ok" ? "var(--success)" : "var(--danger)" }}>
            {msg.s}
          </p>
        )}
      </Card>

      {/* Payment history */}
      <section>
        <h2 className="text-sm font-semibold text-white mb-3">Payment History</h2>
        {payments.length === 0 ? (
          <Card className="py-12 text-center">
            <History size={22} className="mx-auto mb-2 text-[--text-faint]" />
            <p className="text-sm font-semibold text-white mb-0.5">No payments yet</p>
            <p className="text-xs text-[--text-muted]">Transactions will appear here after you subscribe.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1.4fr_1fr_1fr_1fr_120px] px-5 py-3 border-b border-[--border] text-[10px] font-bold uppercase tracking-wider text-[--text-muted]">
              <span>Reference</span><span>Plan</span><span>Date</span><span>Amount</span><span>Status</span>
            </div>
            {payments.map((p) => (
              <div key={p.id} className="border-b border-[--border] last:border-0">
                <div className="hidden sm:grid grid-cols-[1.4fr_1fr_1fr_1fr_120px] px-5 py-3 items-center hover:bg-white/[0.02] transition-colors">
                  <span className="text-xs font-mono text-white truncate">{(p.reference ?? "—").slice(0, 18)}…</span>
                  <span className="text-xs text-[--text-secondary] capitalize">{p.planName}</span>
                  <span className="text-xs text-[--text-muted]">{fmtD(p.paidAt ?? p.createdAt)}</span>
                  <span className="text-xs font-semibold text-white">{fmtN(p.amountKobo)}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded w-fit"
                    style={p.status === "success"
                      ? { background: "rgba(34,197,94,0.1)", color: "var(--success)" }
                      : { background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
                    {p.status}
                  </span>
                </div>
                {/* Mobile */}
                <div className="sm:hidden flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white capitalize truncate">{p.planName}</p>
                    <p className="text-[11px] text-[--text-muted]">{fmtD(p.paidAt ?? p.createdAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-white">{fmtN(p.amountKobo)}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: p.status === "success" ? "var(--success)" : "var(--danger)" }}>
                      {p.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>
    </DashboardLayout>
  );
};

export default BillingPage;
