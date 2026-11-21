'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BrainCircuit,
  Lock,
  Sparkles,
  Compass,
  Briefcase,
  ShieldCheck,
} from 'lucide-react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Button, Card, Input } from '@/components/ui/primitives';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { apiFetch } from '@/lib/api-client';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSessionAfterAuth } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent,
    overrideEmail?: string,
    overridePass?: string
  ) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: overrideEmail ?? email,
          password: overridePass ?? password,
        }),
      });
      setSessionAfterAuth(data.token, data.user);
      toast.success(`Welcome back, ${data.user.firstName}!`);
      const redirect = searchParams.get('redirect');
      router.push(redirect || data.redirectTo || '/');
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const quickDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(fakeEvent, demoEmail, demoPassword);
  };

  return (
    <div className="max-w-md w-full mx-auto space-y-6 animate-fade-in-up">
      <div className="text-center space-y-2.5">
        <div className="w-13 h-13 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#101B35] via-[#367BF5] to-[#28C5D8] text-white flex items-center justify-center mx-auto shadow-glow ring-1 ring-white/25">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#101B35] dark:text-white">
          Sign in to TalentAI
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Access your Candidate Studio, Recruiter Command, or Admin Console
        </p>
      </div>

      <Card className="relative overflow-hidden p-6 sm:p-8 space-y-6 shadow-elevated">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#101B35] via-[#367BF5] to-[#28C5D8]" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div>
            <Input
              label="Password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex justify-end mt-1.5">
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-[#367BF5] dark:text-[#28C5D8] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            <Lock className="w-4 h-4" /> Sign In Securely
          </Button>
        </form>

        {/* Role-Distinct 1-Click Demo Personas */}
        <div className="pt-5 border-t border-slate-100 dark:border-white/[0.08] space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#367BF5] dark:text-[#28C5D8]" />
            1-Click Demo Workspaces
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() =>
                quickDemoLogin('alex.rivera@candidate.demo', 'Candidate@123!')
              }
              className="group flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[#28C5D8]/35 bg-[#28C5D8]/[0.06] hover:bg-[#28C5D8]/15 text-xs font-bold text-[#101B35] dark:text-white transition-all"
            >
              <Compass className="w-4 h-4 text-[#148898] dark:text-[#28C5D8] group-hover:scale-110 transition-transform" />
              <span>Candidate</span>
            </button>
            <button
              type="button"
              onClick={() =>
                quickDemoLogin('sarah.chen@novatech.demo', 'Recruiter@123!')
              }
              className="group flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[#367BF5]/35 bg-[#367BF5]/[0.06] hover:bg-[#367BF5]/15 text-xs font-bold text-[#101B35] dark:text-white transition-all"
            >
              <Briefcase className="w-4 h-4 text-[#367BF5] group-hover:scale-110 transition-transform" />
              <span>Recruiter</span>
            </button>
            <button
              type="button"
              onClick={() => quickDemoLogin('admin@talentai.demo', 'Admin@123!')}
              className="group flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-100/70 dark:bg-white/[0.04] hover:border-[#28C5D8] text-xs font-bold text-[#101B35] dark:text-white transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-[#101B35] dark:text-[#28C5D8] group-hover:scale-110 transition-transform" />
              <span>Admin</span>
            </button>
          </div>
        </div>
      </Card>

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Don&apos;t have an account yet?{' '}
        <Link
          href="/register"
          className="font-bold text-[#367BF5] dark:text-[#28C5D8] hover:underline"
        >
          Create Free Account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FC] dark:bg-[#070C18]">
      <PublicNavbar />
      <main className="relative flex-1 flex items-center justify-center px-4 py-14 overflow-hidden">
        <div className="absolute inset-0 bg-dot-subtle opacity-60 pointer-events-none" />
        <Suspense fallback={<div className="text-sm text-slate-500">Loading...</div>}>
          <LoginFormContent />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
