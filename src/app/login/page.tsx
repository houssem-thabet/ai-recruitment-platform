'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrainCircuit, Lock, Sparkles } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent, overrideEmail?: string, overridePass?: string) => {
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
    <div className="max-w-md w-full mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#101B35] via-[#367BF5] to-[#28C5D8] text-white flex items-center justify-center mx-auto shadow-lg">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#101B35] dark:text-white">
          Sign in to TalentAI
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Access your Candidate, Recruiter, or Administrator workspace
        </p>
      </div>

      <Card className="p-6 sm:p-8 space-y-5">
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
                className="text-xs font-medium text-[#367BF5] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            <Lock className="w-4 h-4" /> Sign In Securely
          </Button>
        </form>

        {/* Demo Quick Access for Academic Presentation */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#367BF5]" />
            1-Click Seeded Demo Accounts (Presentation Mode)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => quickDemoLogin('alex.rivera@candidate.demo', 'Candidate@123!')}
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#367BF5] text-xs font-semibold text-[#101B35] dark:text-slate-200 transition-colors"
            >
              Candidate
            </button>
            <button
              type="button"
              onClick={() => quickDemoLogin('sarah.chen@novatech.demo', 'Recruiter@123!')}
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#367BF5] text-xs font-semibold text-[#101B35] dark:text-slate-200 transition-colors"
            >
              Recruiter
            </button>
            <button
              type="button"
              onClick={() => quickDemoLogin('admin@talentai.demo', 'Admin@123!')}
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#367BF5] text-xs font-semibold text-[#101B35] dark:text-slate-200 transition-colors"
            >
              Admin
            </button>
          </div>
        </div>
      </Card>

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Don&apos;t have an account yet?{' '}
        <Link href="/register" className="font-bold text-[#367BF5] hover:underline">
          Register Now
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FB] dark:bg-[#090E1D]">
      <PublicNavbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense fallback={<div className="text-sm text-slate-500">Loading...</div>}>
          <LoginFormContent />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
