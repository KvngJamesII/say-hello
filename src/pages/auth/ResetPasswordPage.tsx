import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, RefreshCw, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/ui/Logo';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const D = 'var(--app-font-display)';

const ResetPasswordPage: React.FC = () => {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState(0);
  const { success, error } = useToast();
  const [, setLocation] = useLocation();

  const token = new URLSearchParams(window.location.search).get('token');

  useEffect(() => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    setStrength(s);
  }, [pw]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== confirm || strength < 2 || !token) return;
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: pw });
      success('Password reset', 'Sign in with your new password.');
      setLocation('/login');
    } catch (err: any) {
      error('Failed', err.response?.data?.message || 'Token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[--bg-primary] px-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Invalid reset token</h1>
        <p className="text-sm text-[--text-secondary] mb-6">This password reset link is missing or invalid.</p>
        <Link href="/login"><Button style={{ background: 'var(--accent-primary)' }} className="text-white">Back to login</Button></Link>
      </div>
    );
  }

  const segColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];

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
            <h1 className="text-2xl font-bold text-white tracking-tight mb-2" style={{ fontFamily: D }}>
              Set a new password
            </h1>
            <p className="text-sm text-[--text-secondary] mb-7">Choose a strong password you haven't used before.</p>

            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="pw" className="text-[11px] font-bold uppercase tracking-wider text-[--text-muted]">
                  New password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" size={15} />
                  <Input
                    id="pw"
                    type={show ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    required
                    className="pl-9 pr-10 h-11 bg-[--bg-tertiary] border-[--border] text-white text-sm rounded-lg"
                  />
                  <button type="button" onClick={() => setShow(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-white">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={cn(
                      'h-1 flex-1 rounded-full transition-all',
                      strength >= i ? segColors[strength - 1] : 'bg-[--border]'
                    )} />
                  ))}
                </div>
                {pw && (
                  <p className="text-[11px] text-[--text-muted] mt-1">
                    Strength: <span className="font-semibold text-white">{labels[Math.max(0, strength - 1)]}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-[11px] font-bold uppercase tracking-wider text-[--text-muted]">
                  Confirm password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" size={15} />
                  <Input
                    id="confirm"
                    type={show ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className={cn(
                      'pl-9 h-11 bg-[--bg-tertiary] border-[--border] text-white text-sm rounded-lg',
                      confirm && pw === confirm && 'border-green-500/40'
                    )}
                  />
                  {confirm && pw === confirm && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" size={15} />
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || pw !== confirm || strength < 2}
                className="w-full h-11 font-semibold text-white text-sm"
                style={{ background: 'var(--accent-primary)' }}
              >
                {loading ? <><RefreshCw size={14} className="animate-spin mr-2" /> Saving…</> : 'Reset password'}
              </Button>
            </form>

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

export default ResetPasswordPage;
