import React from 'react';
import { MarketingNav } from '@/components/layout/MarketingNav';
import { Link } from 'wouter';
import { Check, X, Shield, RefreshCw, Headphones, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const BL  = '#3b82f6';
const GR  = '#22c55e';
const B   = 'rgba(255,255,255,0.07)';
const S   = 'rgba(255,255,255,0.04)';
const DIM = 'rgba(255,255,255,0.5)';
const MUT = 'rgba(255,255,255,0.25)';

const BASIC_FEATURES = [
  { ok: true,  label: 'Live log streaming' },
  { ok: true,  label: 'Environment variable manager' },
  { ok: true,  label: 'Auto restart on crash (5 retries)' },
  { ok: true,  label: '7-day uptime history' },
  { ok: true,  label: 'Ticket support' },
  { ok: false, label: 'Terminal access', note: 'Pro only' },
  { ok: false, label: 'Crash email alerts', note: 'Pro only' },
];

const PRO_FEATURES = [
  { ok: true, label: 'Everything in Basic' },
  { ok: true, label: 'Terminal access (docker exec shell)' },
  { ok: true, label: 'Crash email alerts' },
  { ok: true, label: 'Priority restart queue' },
  { ok: true, label: '30-day uptime history' },
  { ok: true, label: '24hr support response' },
];

const DISCOUNT_TIERS = [
  { range: '1 bot',     discount: 'Full price',     pct: 0 },
  { range: '2–3 bots',  discount: '10% off per bot', pct: 10 },
  { range: '4–6 bots',  discount: '15% off per bot', pct: 15 },
  { range: '7+ bots',   discount: '20% off per bot', pct: 20 },
];

const FAQ = [
  { q: 'How does billing work?', a: 'Each bot is its own subscription — ₦1,400 or ₦2,999 per bot per month depending on the plan you choose. Bots renew independently on their own date.' },
  { q: 'What is the bulk discount?', a: 'When you own multiple active bots, a permanent discount applies to all of them automatically. 2–3 bots = 10% off each. 4–6 bots = 15% off each. 7+ bots = 20% off each.' },
  { q: 'Can I mix Basic and Pro bots?', a: 'Yes — you can have some bots on Basic and others on Pro. The bulk discount counts your total active bots across all plans.' },
  { q: 'What payment methods work?', a: 'We use Paystack which supports cards, bank transfer, and USSD — all major Nigerian payment methods work.' },
  { q: 'What happens if I do not renew?', a: 'Your bot gets a 3-day grace period before it is suspended. Files are kept for 30 days after suspension so you can always reactivate.' },
  { q: 'Can I get a refund?', a: 'No mid-cycle refunds, but if you experience a downtime that breaks our SLA, contact support within 72 hours for a credit review.' },
];

const PricingPage: React.FC = () => (
  <div className="min-h-screen" style={{ background: 'var(--bg-primary)', fontFamily: 'var(--app-font-sans)', color: 'var(--text-primary)' }}>
    <MarketingNav />

    {/* Hero */}
    <section className="pt-32 pb-12 px-6 text-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-8 border"
          style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.25)', color: BL }}>
          Simple Per-Bot Pricing
        </span>
        <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mb-4"
          style={{ fontFamily: 'var(--app-font-display)' }}>
          Pay per bot.<br />
          <span style={{ color: BL }}>No limits. No tiers.</span>
        </h1>
        <p className="text-base md:text-lg max-w-xl mx-auto" style={{ color: DIM }}>
          Buy exactly the bots you need. Basic for everyday bots, Pro for heavy workloads. Buy more, pay less.
        </p>
      </motion.div>
    </section>

    {/* Trust bar */}
    <section className="pb-10 px-6">
      <div className="max-w-2xl mx-auto grid grid-cols-3 gap-3">
        {[
          { icon: Shield,      label: '99.9% uptime',    color: GR  },
          { icon: RefreshCw,   label: 'Auto restart',    color: BL  },
          { icon: Headphones,  label: 'Human support',   color: '#a78bfa' },
        ].map(({ icon: Icon, label, color }, i) => (
          <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl border text-center"
            style={{ background: S, borderColor: B }}>
            <Icon size={15} style={{ color }} />
            <span className="text-xs font-semibold" style={{ color: DIM }}>{label}</span>
          </div>
        ))}
      </div>
    </section>

    {/* Plan cards */}
    <section className="py-6 px-6">
      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Basic */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col rounded-2xl p-6"
          style={{ background: S, border: `1px solid ${B}` }}>
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: MUT }}>Basic</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-black text-white">₦1,400</span>
              <span className="text-sm" style={{ color: MUT }}>/bot/mo</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: DIM }}>
              For everyday Telegram, Discord, WhatsApp and other bots
            </p>
          </div>

          <div className="flex flex-col gap-1.5 mb-2 text-xs" style={{ color: MUT }}>
            <span>400MB RAM · 0.5 CPU · 3GB storage</span>
          </div>

          <ul className="flex flex-col gap-2.5 mb-6 flex-1">
            {BASIC_FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                {f.ok
                  ? <Check size={14} className="mt-0.5 shrink-0" style={{ color: GR }} />
                  : <X    size={14} className="mt-0.5 shrink-0" style={{ color: MUT }} />
                }
                <span style={{ color: f.ok ? 'white' : MUT }}>
                  {f.label}
                  {f.note && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: MUT }}>{f.note}</span>}
                </span>
              </li>
            ))}
          </ul>

          <Link href="/checkout?plan=basic">
            <button className="w-full h-11 rounded-xl font-bold text-sm border-2 hover:bg-white/5 transition-colors"
              style={{ color: 'white', borderColor: B }}>
              Get Started
            </button>
          </Link>
        </motion.div>

        {/* Pro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18 }}
          className="flex flex-col rounded-2xl p-6 relative"
          style={{ background: 'rgba(59,130,246,0.05)', border: `2px solid ${BL}` }}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest text-white"
              style={{ background: BL }}>
              Most Popular
            </span>
          </div>

          <div className="mb-5 pt-2">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: BL }}>Pro</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-black text-white">₦2,999</span>
              <span className="text-sm" style={{ color: MUT }}>/bot/mo</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: DIM }}>
              For heavy bots, userbot scripts and automation tools
            </p>
          </div>

          <div className="flex flex-col gap-1.5 mb-2 text-xs" style={{ color: MUT }}>
            <span>768MB RAM · 1 CPU · 10GB storage</span>
          </div>

          <ul className="flex flex-col gap-2.5 mb-6 flex-1">
            {PRO_FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <Check size={14} className="mt-0.5 shrink-0" style={{ color: BL }} />
                <span className="text-white">{f.label}</span>
              </li>
            ))}
          </ul>

          <Link href="/checkout?plan=pro">
            <button className="w-full h-11 rounded-xl font-black text-sm text-white"
              style={{ background: BL, boxShadow: `0 0 24px rgba(59,130,246,0.3)` }}>
              Get Started
            </button>
          </Link>
        </motion.div>
      </div>
    </section>

    {/* Bulk discount table */}
    <section className="py-8 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${B}` }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: B, background: S }}>
            <div className="flex items-center gap-2">
              <Zap size={14} style={{ color: BL }} />
              <p className="text-sm font-bold text-white">Buy more bots, pay less per bot</p>
            </div>
            <p className="text-xs mt-0.5" style={{ color: MUT }}>Discount applies automatically at checkout and on every renewal</p>
          </div>
          {DISCOUNT_TIERS.map((t, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3 border-b last:border-0"
              style={{ borderColor: B, background: t.pct > 0 ? 'transparent' : 'transparent' }}>
              <span className="text-sm font-semibold text-white">{t.range}</span>
              <div className="flex items-center gap-2">
                {t.pct > 0 && (
                  <span className="text-xs font-black px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(34,197,94,0.1)', color: GR, border: '1px solid rgba(34,197,94,0.2)' }}>
                    -{t.pct}%
                  </span>
                )}
                <span className="text-sm" style={{ color: t.pct > 0 ? GR : MUT }}>{t.discount}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Example prices */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Basic × 1',    price: '₦1,400',  note: 'no discount' },
            { label: 'Basic × 3',    price: '₦1,260',  note: '10% off each' },
            { label: 'Pro × 5',      price: '₦2,549',  note: '15% off each' },
            { label: 'Pro × 7',      price: '₦2,399',  note: '20% off each' },
          ].map((e, i) => (
            <div key={i} className="rounded-xl p-3 text-center" style={{ background: S, border: `1px solid ${B}` }}>
              <p className="text-xs mb-1" style={{ color: MUT }}>{e.label}</p>
              <p className="text-base font-black text-white">{e.price}<span className="text-[10px] font-normal">/mo</span></p>
              <p className="text-[10px]" style={{ color: MUT }}>{e.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* FAQ */}
    <section className="py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-black text-white mb-6 text-center">Frequently asked</h2>
        <div className="flex flex-col gap-3">
          {FAQ.map((faq, i) => (
            <details key={i} className="rounded-xl px-5 py-4 group" style={{ background: S, border: `1px solid ${B}` }}>
              <summary className="text-sm font-bold text-white cursor-pointer list-none flex items-center justify-between">
                {faq.q}
                <span className="text-base" style={{ color: MUT }}>+</span>
              </summary>
              <p className="text-sm mt-3 leading-relaxed" style={{ color: DIM }}>{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>

    <footer className="py-8 px-6 border-t text-center" style={{ borderColor: B }}>
      <p className="text-xs" style={{ color: MUT }}>© {new Date().getFullYear()} Redon3 · All rights reserved</p>
    </footer>
  </div>
);

export default PricingPage;
