'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserCircle, Building2, ShieldCheck } from 'lucide-react';
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
    <div className="max-w-2xl w-full mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-[#101B35] dark:text-white">
          Create Your TalentAI Account
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Choose your account type to personalize your intelligent workspace
        </p>
      </div>

      <Card className="p-6 sm:p-8 space-y-6">
        {/* Account Type Selector */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAccountType('CANDIDATE')}
            className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
              accountType === 'CANDIDATE'
                ? 'border-[#367BF5] bg-[#367BF5]/10 ring-2 ring-[#367BF5]/20'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <UserCircle className="w-6 h-6 text-[#367BF5] shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#101B35] dark:text-white">Candidate</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Find jobs &amp; analyze CV
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAccountType('RECRUITER')}
            className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
              accountType === 'RECRUITER'
                ? 'border-[#367BF5] bg-[#367BF5]/10 ring-2 ring-[#367BF5]/20'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-6 h-6 text-[#28C5D8] shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#101B35] dark:text-white">Recruiter</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Publish jobs &amp; match talent
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
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-[#101B35] dark:text-white">
                Company Information
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

          <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-[#367BF5] shrink-0 mt-0.5" />
            <span>
              By registering, you acknowledge our{' '}
              <Link href="/privacy" className="text-[#367BF5] underline">
                Privacy &amp; CV Processing Notice
              </Link>{' '}
              and{' '}
              <Link href="/terms" className="text-[#367BF5] underline">
                Terms of Service
              </Link>
              .
            </span>
          </div>

          <Button type="submit" loading={loading} size="lg" className="w-full">
            Create {accountType === 'CANDIDATE' ? 'Candidate' : 'Recruiter'} Account
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Already registered?{' '}
        <Link href="/login" className="font-bold text-[#367BF5] hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FB] dark:bg-[#090E1D]">
      <PublicNavbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense fallback={<div className="text-sm text-slate-500">Loading...</div>}>
          <RegisterContent />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
