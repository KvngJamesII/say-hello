import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/ui/Logo";
import { ChevronLeft, Check, Tag, Lock, Zap, ShieldCheck } from "lucide-react";
import api from "@/lib/api";

const PLANS = {
  basic: { name: "Basic", priceKobo: 140000, features: ["400MB RAM · 0.5 CPU · 3GB storage", "Live log streaming", "Environment variables", "Auto restart (5 retries)", "7-day uptime history", "Ticket support"] },
  pro: { name: "Pro", priceKobo: 299900, features: ["768MB RAM · 1 CPU · 10GB storage", "Everything in Basic", "Terminal access", "Crash email alerts", "Priority restart queue", "30-day uptime history", "24hr support response"] },
};

const DISCOUNT_TIERS = [
  { min: 2, max: 3, pct: 10 },
  { min: 4, max: 6, pct: 15 },
  { min: 7, max: Infinity, pct: 20 },
];

const getDiscount = (n: number) => DISCOUNT_TIERS.find((t) => n >= t.min && n <= t.max)?.pct ?? 0;
const fmtN = (k: number) => "₦" + (k / 100).toLocaleString("en-NG");

const CheckoutPage: React.FC = () => {
  const [search] = useLocation();
  const params = new URLSearchParams(typeof search === "string" ? search.split("?")[1] ?? "" : "");
  const planKey = (params.get("plan") ?? "basic") as "basic" | "pro";
  const plan = PLANS[planKey] ?? PLANS.basic;

  const [coupon, setCoupon] = useState("");
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discountPct: number; msg: string } | null>(null);
  const [applying, setApplying] = useState(false);
  const { success: ok, error: err } = useToast();

  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => (await api.get("/dashboard/summary")).data as { activeBots: number; discountPct: number; botsToNextTier: number | null },
  });

  const currentBots = summary?.activeBots ?? 0;
  const newBotCount = currentBots + 1;
  const oldDiscount = getDiscount(currentBots);
  const newDiscount = getDiscount(newBotCount);
  const unlocksTier = newDiscount > oldDiscount;
  const activeDiscount = newDiscount;

  const basePrice = plan.priceKobo;
  const bulkSaving = Math.floor((basePrice * activeDiscount) / 100);
  let finalPrice = basePrice - bulkSaving;
  let couponSaving = 0;
  if (couponResult?.valid) {
    couponSaving = Math.floor((finalPrice * couponResult.discountPct) / 100);
    finalPrice = Math.max(0, finalPrice - couponSaving);
  }
  const isFree = finalPrice === 0;

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setApplying(true);
    try {
      const r = await api.post("/billing/coupon/validate", { code: coupon.toUpperCase(), planId: planKey });
      const d = r.data as { valid: boolean; discountPercent: number; error: string | null };
      if (d.valid) setCouponResult({ valid: true, discountPct: d.discountPercent, msg: `${d.discountPercent}% off applied!` });
      else setCouponResult({ valid: false, discountPct: 0, msg: d.error ?? "Invalid code" });
    } catch {
      setCouponResult({ valid: false, discountPct: 0, msg: "Could not validate coupon" });
    }
    setApplying(false);
  };

  const checkout = useMutation({
    mutationFn: async () => {
      const r = await api.post("/billing/checkout", {
        planId: planKey,
        couponCode: couponResult?.valid ? coupon : undefined,
        callbackUrl: window.location.origin + "/dashboard",
      });
      return r.data as { checkoutUrl: string | null; free: boolean; message: string };
    },
    onSuccess: (d) => {
      if (d.free) {
        ok("Activated!", d.message);
        setTimeout(() => (window.location.href = "/dashboard"), 1200);
      } else if (d.checkoutUrl) window.location.href = d.checkoutUrl;
      else err("Error", d.message ?? "Payment not configured");
    },
    onError: () => err("Failed", "Please try again"),
  });

  return (
    <div className="min-h-screen flex flex-col bg-[--bg-primary] text-[--text-primary]">
      <nav className="h-16 border-b border-[--border] flex items-center justify-between px-4 md:px-8 sticky top-0 z-50 backdrop-blur-md bg-[--bg-primary]/80">
        <Logo />
        <Link href="/pricing">
          <button className="flex items-center gap-1.5 text-xs font-semibold text-[--text-secondary] hover:text-white transition-colors">
            <ChevronLeft size={14} /> Back to pricing
          </button>
        </Link>
      </nav>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 lg:py-12 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Checkout</h1>
          <p className="text-sm text-[--text-secondary] mt-1">One bot, one subscription. Renews monthly.</p>
        </div>

        {unlocksTier && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl border" style={{ background: "rgba(34,197,94,0.06)", borderColor: "rgba(34,197,94,0.2)" }}>
            <Zap size={16} className="mt-0.5 shrink-0 text-[--success]" />
            <div>
              <p className="text-sm font-semibold text-[--success]">Adding this bot unlocks your {newDiscount}% bulk discount!</p>
              <p className="text-xs mt-0.5 text-[--text-secondary]">This applies to all your bots from the next billing cycle.</p>
            </div>
          </div>
        )}

        {!unlocksTier && activeDiscount > 0 && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border" style={{ background: "var(--accent-soft)", borderColor: "rgba(249,115,22,0.18)" }}>
            <Check size={14} className="text-[--accent-primary]" />
            <p className="text-xs text-[--text-secondary]">Your {activeDiscount}% bulk discount is applied to this bot.</p>
          </div>
        )}

        {/* Order summary */}
        <div className="rounded-xl overflow-hidden bg-[--bg-secondary] border border-[--border]">
          <div className="px-5 py-3 border-b border-[--border] bg-white/[0.02]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[--text-muted]">Order Summary</p>
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between mb-5">
              <div className="min-w-0">
                <p className="text-base font-semibold text-white">{plan.name} Bot</p>
                <p className="text-xs mt-1 text-[--text-muted]">Monthly subscription · renews on same date</p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs text-[--text-secondary]">
                      <Check size={11} className="text-[--accent-primary] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-right ml-4 shrink-0">
                <p className="text-2xl font-bold text-white">{fmtN(basePrice)}</p>
                <p className="text-xs text-[--text-muted]">/mo</p>
              </div>
            </div>

            <div className="border-t border-[--border] pt-4 flex flex-col gap-2">
              {activeDiscount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[--text-secondary]">Bulk discount ({activeDiscount}%)</span>
                  <span className="text-[--success]">−{fmtN(bulkSaving)}</span>
                </div>
              )}
              {couponSaving > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[--text-secondary]">Coupon ({couponResult?.discountPct}%)</span>
                  <span className="text-[--success]">−{fmtN(couponSaving)}</span>
                </div>
              )}
              <div className="flex items-center justify-between mt-2 pt-3 border-t border-[--border]">
                <span className="text-sm font-semibold text-white">Total</span>
                <span className="text-2xl font-bold text-[--accent-primary]">
                  {fmtN(finalPrice)}
                  <span className="text-xs font-normal text-[--text-muted]">/mo</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Coupon */}
        <div className="rounded-xl p-5 bg-[--bg-secondary] border border-[--border]">
          <div className="flex items-center gap-2 mb-3">
            <Tag size={14} className="text-[--text-muted]" />
            <p className="text-sm font-semibold text-white">Promo Code</p>
          </div>
          <div className="flex gap-2">
            <input
              value={coupon}
              onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponResult(null); }}
              onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
              placeholder="ENTER CODE"
              className="flex-1 h-10 px-3 rounded-lg text-xs font-mono font-bold text-white uppercase outline-none bg-[--bg-primary] border focus:border-[--accent-primary] transition-colors"
              style={{ borderColor: couponResult?.valid ? "rgba(34,197,94,0.3)" : "var(--border)" }}
            />
            <button
              onClick={applyCoupon}
              disabled={!coupon.trim() || applying}
              className="h-10 px-5 rounded-lg text-xs font-bold text-white shrink-0 disabled:opacity-40"
              style={{ background: "var(--accent-primary)" }}
            >
              {applying ? "…" : "Apply"}
            </button>
          </div>
          {couponResult && (
            <p className="text-xs mt-2" style={{ color: couponResult.valid ? "var(--success)" : "var(--danger)" }}>
              {couponResult.msg}
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => checkout.mutate()}
            disabled={checkout.isPending}
            className="w-full h-12 rounded-xl font-bold text-base text-white disabled:opacity-50 transition-transform active:scale-[0.99]"
            style={{
              background: isFree ? "var(--success)" : "var(--accent-primary)",
              boxShadow: `0 8px 24px ${isFree ? "rgba(34,197,94,0.25)" : "rgba(249,115,22,0.28)"}`,
            }}
          >
            {checkout.isPending ? "Processing…" : isFree ? "Claim Free Bot" : `Pay ${fmtN(finalPrice)}`}
          </button>
          <div className="flex items-center justify-center gap-2 text-[11px] text-[--text-muted]">
            <ShieldCheck size={12} />
            <span>Secured by Paystack · 256-bit SSL</span>
          </div>
        </div>

        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-[--border] bg-[--bg-secondary]">
          <Lock size={14} className="mt-0.5 shrink-0 text-[--text-muted]" />
          <p className="text-xs text-[--text-secondary]">
            Payments processed securely via <strong className="text-white">Paystack</strong>. Redon3 never stores your card details. Your bot is activated immediately after payment confirmation.
          </p>
        </div>
      </main>
    </div>
  );
};

export default CheckoutPage;
