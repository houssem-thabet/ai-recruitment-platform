'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Compass, Building2, ShieldCheck, BrainCircuit } from 'lucide-react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Button, Card, Input, Select, Textarea } from '@/components/ui/primitives';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { apiFetch } from '@/lib/api-client';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSessionAfterAuth } = useAuth();
  const toast = useToast();

  const [accountType, setAccountType] = useState<'CANDIDATE' | 'RECRUITER'>('CANDIDATE');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    companyWebsite: '',
    companyDescription: '',
    industry: 'Information Technology & AI',
    companySize: '51-200',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = searchParams.get('type');
    if (t === 'RECRUITER' || t === 'CANDIDATE') {
      setAccountType(t);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          accountType,
        }),
      });
      setSessionAfterAuth(data.token, data.user);
      toast.success('Account created! Redirecting to your workspace...');
      router.push(data.redirectTo);
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl w-full mx-auto space-y-6 relative z-10 animate-fade-in-up">
      <div className="text-center space-y-2.5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#101B35] via-[#367BF5] to-[#28C5D8] text-white flex items-center justify-center mx-auto shadow-glow">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#101B35] dark:text-white">
          Create Your TalentAI Workspace
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Select your role to tailor your AI career or talent acquisition experience
        </p>
      </div>

      <Card className="relative overflow-hidden p-6 sm:p-8 space-y-6 shadow-elevated">
        <div
          className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${
            accountType === 'CANDIDATE'
              ? 'from-[#28C5D8] to-[#367BF5]'
              : 'from-[#101B35] via-[#367BF5] to-[#28C5D8]'
          }`}
        />

        {/* Role-Distinct Account Type Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <button
            type="button"
            onClick={() => setAccountType('CANDIDATE')}
            className={`flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-all ${
              accountType === 'CANDIDATE'
                ? 'border-[#28C5D8] bg-gradient-to-br from-[#28C5D8]/12 to-[#367BF5]/10 ring-2 ring-[#28C5D8]/25 shadow-sm'
                : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-[#28C5D8]/15 text-[#128392] dark:text-[#28C5D8] flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#101B35] dark:text-white">
                Candidate Studio
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                CV AI audit, skill roadmap &amp; jobs
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAccountType('RECRUITER')}
            className={`flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-all ${
              accountType === 'RECRUITER'
                ? 'border-[#367BF5] bg-gradient-to-br from-[#367BF5]/12 to-[#101B35]/5 ring-2 ring-[#367BF5]/25 shadow-sm'
                : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-[#367BF5]/15 text-[#367BF5] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#101B35] dark:text-white">
                Recruiter Command
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Publish roles, match &amp; hire talent
              </p>
            </div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name *"
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="Alex"
            />
            <Input
              label="Last Name *"
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Rivera"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address *"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="alex@example.com"
            />
            <Input
              label="Phone Number (Optional)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+216 71 000 000"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Password * (8+ chars, Upper + Number)"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
            <Input
              label="Confirm Password *"
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="••••••••"
            />
          </div>

          {accountType === 'RECRUITER' && (
            <div className="pt-4 border-t border-slate-100 dark:border-white/[0.08] space-y-4 animate-fade-in-up">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#367BF5] dark:text-[#28C5D8]">
                Organization Profile
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Company Name *"
                  required
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="Acme Technologies"
                />
                <Input
                  label="Company Website"
                  value={form.companyWebsite}
                  onChange={(e) => setForm({ ...form, companyWebsite: e.target.value })}
                  placeholder="https://acme.example.com"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Industry *"
                  required
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  placeholder="Enterprise Software & AI"
                />
                <Select
                  label="Company Size *"
                  value={form.companySize}
                  onChange={(e) => setForm({ ...form, companySize: e.target.value })}
                >
                  <option value="1-10">1–10 employees</option>
                  <option value="11-50">11–50 employees</option>
                  <option value="51-200">51–200 employees</option>
                  <option value="201-500">201–500 employees</option>
                  <option value="501-1000">501–1,000 employees</option>
                  <option value="1000+">1,000+ employees</option>
                </Select>
              </div>
              <Textarea
                label="Company Description *"
                required
                rows={3}
                value={form.companyDescription}
                onChange={(e) => setForm({ ...form, companyDescription: e.target.value })}
                placeholder="Describe your company mission, engineering culture, and products..."
              />
            </div>
          )}

          <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] p-3.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-[#367BF5] dark:text-[#28C5D8] shrink-0 mt-0.5" />
            <span>
              By registering, you acknowledge our{' '}
              <Link href="/privacy" className="font-semibold text-[#367BF5] underline">
                Privacy &amp; CV Processing Notice
              </Link>{' '}
              and{' '}
              <Link href="/terms" className="font-semibold text-[#367BF5] underline">
                Terms of Service
              </Link>
              .
            </span>
          </div>

          <Button
            type="submit"
            variant={accountType === 'CANDIDATE' ? 'accent' : 'primary'}
            loading={loading}
            size="lg"
            className="w-full"
          >
            Create {accountType === 'CANDIDATE' ? 'Candidate' : 'Recruiter'} Workspace
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Already registered?{' '}
        <Link
          href="/login"
          className="font-bold text-[#367BF5] dark:text-[#28C5D8] hover:underline"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FC] dark:bg-[#070C18]">
      <PublicNavbar />
      <main className="relative flex-1 flex items-center justify-center px-4 py-14 overflow-hidden">
        <div className="absolute inset-0 bg-dot-subtle opacity-60 pointer-events-none" />
        <Suspense fallback={<div className="text-sm text-slate-500">Loading...</div>}>
          <RegisterContent />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
