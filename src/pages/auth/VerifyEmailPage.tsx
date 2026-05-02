import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MailCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

const D = 'var(--app-font-display)';

const VerifyEmailPage: React.FC = () => {
  const email = new URLSearchParams(window.location.search).get('email');
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [cooldown]);

  const resend = async () => {
    if (cooldown > 0 || !email) return;
    setLoading(true);
    try {
      await api.post('/auth/resend-verification', { email });
      success('Sent', 'Verification email re-sent. Please check your inbox.');
      setCooldown(60);
    } catch (err: any) {
      error('Failed', err.response?.data?.message || 'Could not resend');
    } finally {
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
          <div className="rounded-2xl bg-[--bg-secondary] border border-[--border] p-8 sm:p-10 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
              <MailCheck size={26} />
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight mb-2" style={{ fontFamily: D }}>
              Check your inbox
            </h1>
            <p className="text-sm text-[--text-secondary] mb-7 leading-relaxed">
              We've sent a verification link to{' '}
              <span className="text-white font-medium">{email || 'your email address'}</span>.
              Click it to activate your account.
            </p>

            <Button
              onClick={resend}
              disabled={loading || cooldown > 0}
              variant="outline"
              className="w-full h-11 bg-[--bg-tertiary] border-[--border] text-white font-semibold hover:bg-white/[0.04] text-sm"
            >
              {loading && <RefreshCw className="animate-spin mr-2" size={14} />}
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
            </Button>

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

export default VerifyEmailPage;
