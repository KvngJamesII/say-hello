import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/ui/Logo';
import api from '@/lib/api';

const D = 'var(--app-font-display)';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
    } catch { /* security: always succeed */ }
    finally {
      setDone(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[--bg-primary]" style={{ fontFamily: 'var(--app-font-sans)' }}>
      <header className="h-16 px-6 flex items-center">
        <Link href="/"><Logo className="cursor-pointer" /></Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-[420px]"
        >
          <div className="rounded-2xl bg-[--bg-secondary] border border-[--border] p-8 sm:p-10">
            {done ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>
                  <CheckCircle2 size={26} />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight mb-2" style={{ fontFamily: D }}>
                  Check your inbox
                </h1>
                <p className="text-sm text-[--text-secondary] leading-relaxed">
                  If an account exists for <span className="text-white font-medium">{email}</span>, a password reset link is on its way.
                </p>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-white tracking-tight mb-2" style={{ fontFamily: D }}>
                  Reset your password
                </h1>
                <p className="text-sm text-[--text-secondary] mb-7">
                  Enter your email and we'll send you a reset link.
                </p>

                <form onSubmit={submit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-[--text-muted]">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" size={15} />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        required
                        className="pl-9 h-11 bg-[--bg-tertiary] border-[--border] text-white text-sm rounded-lg"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full h-11 font-semibold text-white text-sm"
                    style={{ background: 'var(--accent-primary)' }}
                  >
                    {loading ? <><RefreshCw size={14} className="animate-spin mr-2" /> Sending…</> : 'Send reset link'}
                  </Button>
                </form>
              </>
            )}

            <Link href="/login">
              <span className="flex items-center justify-center gap-1.5 text-[--text-muted] text-xs font-medium hover:text-white cursor-pointer mt-6 transition-colors">
                <ArrowLeft size={13} /> Back to login
              </span>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default ForgotPasswordPage;
