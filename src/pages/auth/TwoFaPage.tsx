import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Logo } from '@/components/ui/Logo';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

const D = 'var(--app-font-display)';

const TwoFaPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { error } = useToast();
  const [, setLocation] = useLocation();
  const { refreshUser } = useAuth();

  const verify = async (val: string) => {
    if (val.length !== 6) return;
    setLoading(true);
    try {
      await api.post('/auth/2fa/verify', { code: val });
      await refreshUser();
      setLocation('/dashboard');
    } catch (err: any) {
      error('Verification failed', err.response?.data?.message || 'Invalid code');
      setCode('');
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
          <div className="rounded-2xl bg-[--bg-secondary] border border-[--border] p-8 sm:p-10">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
              <ShieldCheck size={22} />
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight mb-2" style={{ fontFamily: D }}>
              Two-factor verification
            </h1>
            <p className="text-sm text-[--text-secondary] mb-8 leading-relaxed">
              Enter the 6-digit code from your authenticator app to continue.
            </p>

            <div className="flex justify-center mb-6">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(val) => { setCode(val); if (val.length === 6) verify(val); }}
                disabled={loading}
              >
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="w-11 h-12 sm:w-12 sm:h-14 bg-[--bg-tertiary] border-[--border] text-white text-xl font-bold rounded-lg"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              onClick={() => verify(code)}
              disabled={loading || code.length !== 6}
              className="w-full h-11 font-semibold text-white text-sm"
              style={{ background: 'var(--accent-primary)' }}
            >
              {loading ? <><RefreshCw size={14} className="animate-spin mr-2" /> Verifying…</> : 'Verify & Continue'}
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

export default TwoFaPage;
