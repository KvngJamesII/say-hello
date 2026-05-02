import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/ui/Logo";
import { ChevronLeft, Check, Tag, Lock, Zap, ShieldCheck } from "lucide-react";
import api from "@/lib/api";

const B   = "rgba(255,255,255,0.08)";
const S   = "rgba(255,255,255,0.04)";
const DIM = "rgba(255,255,255,0.5)";
const MUT = "rgba(255,255,255,0.25)";
const BL  = "#3b82f6";
const GR  = "#22c55e";

const PLANS = {
  basic: { name:"Basic", priceKobo:140000, features:["400MB RAM · 0.5 CPU · 3GB storage","Live log streaming","Environment variables","Auto restart (5 retries)","7-day uptime history","Ticket support"] },
  pro:   { name:"Pro",   priceKobo:299900, features:["768MB RAM · 1 CPU · 10GB storage","Everything in Basic","Terminal access","Crash email alerts","Priority restart queue","30-day uptime history","24hr support response"] },
};

const DISCOUNT_TIERS = [
  { min:2, max:3, pct:10 },
  { min:4, max:6, pct:15 },
  { min:7, max:Infinity, pct:20 },
];

function getDiscount(botCount: number): number {
  const tier = DISCOUNT_TIERS.find(t => botCount >= t.min && botCount <= t.max);
  return tier?.pct ?? 0;
}

function fmtN(kobo: number): string {
  return "₦" + (kobo/100).toLocaleString("en-NG", { minimumFractionDigits:0 });
}

const CheckoutPage: React.FC = () => {
  const [search] = useLocation();
  const params   = new URLSearchParams(typeof search === "string" ? search.split("?")[1] ?? "" : "");
  const planKey  = (params.get("plan") ?? "basic") as "basic"|"pro";
  const plan     = PLANS[planKey] ?? PLANS.basic;

  const [coupon, setCoupon]       = useState("");
  const [couponResult, setCouponResult] = useState<{ valid:boolean; discountPct:number; msg:string } | null>(null);
  const [applying, setApplying]   = useState(false);
  const { success: ok, error: err } = useToast();

  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => { const r = await api.get("/dashboard/summary"); return r.data as { activeBots:number; discountPct:number; botsToNextTier:number|null }; },
  });

  const currentBots   = summary?.activeBots ?? 0;
  const newBotCount   = currentBots + 1;
  const oldDiscount   = getDiscount(currentBots);
  const newDiscount   = getDiscount(newBotCount);
  const unlocksTier   = newDiscount > oldDiscount;
  const activeDiscount = newDiscount;

  const basePrice  = plan.priceKobo;
  const bulkSaving = Math.floor(basePrice * activeDiscount / 100);
  let   finalPrice = basePrice - bulkSaving;

  // Coupon on top
  let couponSaving = 0;
  if (couponResult?.valid) {
    couponSaving = Math.floor(finalPrice * couponResult.discountPct / 100);
    finalPrice   = Math.max(0, finalPrice - couponSaving);
  }

  const isFree = finalPrice === 0;

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setApplying(true);
    try {
      const r = await api.post("/billing/coupon/validate", { code: coupon.toUpperCase(), planId: planKey });
      const d = r.data as { valid:boolean; discountPercent:number; error:string|null };
      if (d.valid) setCouponResult({ valid:true, discountPct:d.discountPercent, msg:`${d.discountPercent}% off applied!` });
      else         setCouponResult({ valid:false, discountPct:0, msg:d.error ?? "Invalid code" });
    } catch { setCouponResult({ valid:false, discountPct:0, msg:"Could not validate coupon" }); }
    setApplying(false);
  };

  const checkout = useMutation({
    mutationFn: async () => {
      const r = await api.post("/billing/checkout", {
        planId: planKey,
        couponCode: couponResult?.valid ? coupon : undefined,
        callbackUrl: window.location.origin + "/dashboard",
      });
      return r.data as { checkoutUrl: string|null; free: boolean; message: string };
    },
    onSuccess: (d) => {
      if (d.free) { ok("Activated!", d.message); setTimeout(() => window.location.href="/dashboard", 1200); }
      else if (d.checkoutUrl) window.location.href = d.checkoutUrl;
      else err("Error", d.message ?? "Payment not configured");
    },
    onError: () => err("Failed","Please try again"),
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background:"var(--bg-primary)", color:"var(--text-primary)" }}>
      {/* Nav */}
      <nav className="h-16 border-b flex items-center justify-between px-4 md:px-8 sticky top-0 z-50 backdrop-blur-md"
        style={{ borderColor:B, background:"rgba(8,9,13,0.8)" }}>
        <Logo />
        <Link href="/pricing">
          <button className="flex items-center gap-1.5 text-xs font-bold" style={{ color:DIM }}>
            <ChevronLeft size={14}/> Back
          </button>
        </Link>
      </nav>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-black text-white">Checkout</h1>
          <p className="text-sm mt-0.5" style={{ color:DIM }}>One bot, one subscription. Renews monthly.</p>
        </div>

        {/* Unlock tier banner */}
        {unlocksTier && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background:"rgba(34,197,94,0.07)", border:"1px solid rgba(34,197,94,0.2)" }}>
            <Zap size={15} className="mt-0.5 shrink-0" style={{ color:GR }}/>
            <div>
              <p className="text-sm font-bold" style={{ color:GR }}>
                Adding this bot unlocks your {newDiscount}% bulk discount!
              </p>
              <p className="text-xs mt-0.5" style={{ color:DIM }}>
                This applies to all your bots from the next billing cycle.
              </p>
            </div>
          </div>
        )}

        {/* Existing discount */}
        {!unlocksTier && activeDiscount > 0 && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background:"rgba(59,130,246,0.06)", border:"1px solid rgba(59,130,246,0.15)" }}>
            <Check size={14} style={{ color:BL }}/>
            <p className="text-xs" style={{ color:DIM }}>Your {activeDiscount}% bulk discount is applied to this bot.</p>
          </div>
        )}

        {/* Order summary */}
        <div className="rounded-xl overflow-hidden" style={{ border:`1px solid ${B}` }}>
          <div className="px-4 py-3 border-b" style={{ borderColor:B, background:S }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color:MUT }}>Order Summary</p>
          </div>

          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-base font-black text-white">{plan.name} Bot</p>
                <p className="text-xs mt-1" style={{ color:MUT }}>Monthly subscription · renews on same date</p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {plan.features.map((f,i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs" style={{ color:DIM }}>
                      <Check size={10} style={{ color:planKey==="pro"?BL:GR }}/>{f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-right ml-4 shrink-0">
                <p className="text-2xl font-black text-white">{fmtN(basePrice)}</p>
                <p className="text-xs" style={{ color:MUT }}>/mo</p>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="border-t pt-4 flex flex-col gap-2" style={{ borderColor:B }}>
              {activeDiscount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color:DIM }}>Bulk discount ({activeDiscount}%)</span>
                  <span style={{ color:GR }}>−{fmtN(bulkSaving)}</span>
                </div>
              )}
              {couponSaving > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color:DIM }}>Coupon ({couponResult?.discountPct}%)</span>
                  <span style={{ color:GR }}>−{fmtN(couponSaving)}</span>
                </div>
              )}
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-bold text-white">Total</span>
                <span className="text-xl font-black" style={{ color:BL }}>{fmtN(finalPrice)}<span className="text-xs font-normal" style={{ color:MUT }}>/mo</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Coupon */}
        <div className="rounded-xl p-4" style={{ background:S, border:`1px solid ${B}` }}>
          <div className="flex items-center gap-2 mb-3">
            <Tag size={13} style={{ color:MUT }}/>
            <p className="text-xs font-bold text-white">Promo Code</p>
          </div>
          <div className="flex gap-2">
            <input value={coupon} onChange={e=>{setCoupon(e.target.value.toUpperCase());setCouponResult(null);}}
              onKeyDown={e=>e.key==="Enter"&&applyCoupon()}
              placeholder="ENTER CODE"
              className="flex-1 h-9 px-3 rounded-lg text-xs font-mono font-bold text-white uppercase outline-none"
              style={{ background:"var(--bg-primary)", border:`1px solid ${couponResult?.valid?"rgba(34,197,94,0.3)":B}` }}/>
            <button onClick={applyCoupon} disabled={!coupon.trim()||applying}
              className="h-9 px-4 rounded-lg text-xs font-bold text-white shrink-0 disabled:opacity-40"
              style={{ background:BL }}>
              {applying?"…":"Apply"}
            </button>
          </div>
          {couponResult && (
            <p className="text-xs mt-1.5" style={{ color:couponResult.valid?GR:"#ef4444" }}>{couponResult.msg}</p>
          )}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3">
          <button onClick={()=>checkout.mutate()} disabled={checkout.isPending}
            className="w-full h-12 rounded-xl font-black text-base text-white disabled:opacity-50"
            style={{ background: isFree ? GR : BL, boxShadow:`0 0 24px ${isFree?"rgba(34,197,94,0.2)":"rgba(59,130,246,0.25)"}` }}>
            {checkout.isPending ? "Processing…" : isFree ? "Claim Free Bot" : `Pay ${fmtN(finalPrice)}`}
          </button>
          <div className="flex items-center justify-center gap-2 text-[10px]" style={{ color:MUT }}>
            <ShieldCheck size={12}/>
            <span>Secured by Paystack · 256-bit SSL</span>
          </div>
        </div>

        {/* Security note */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background:"rgba(59,130,246,0.05)", border:"1px solid rgba(59,130,246,0.1)" }}>
          <Lock size={14} className="mt-0.5 shrink-0" style={{ color:BL }}/>
          <p className="text-xs" style={{ color:DIM }}>
            Payments processed securely via <strong className="text-white">Paystack</strong>. Redon3 never stores your card details. Your bot is activated immediately after payment confirmation.
          </p>
        </div>
      </main>
    </div>
  );
};

export default CheckoutPage;
