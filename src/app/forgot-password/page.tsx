'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Button, Card, Input } from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLink, setDemoLink] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
      if (res.demoResetPath) setDemoLink(res.demoResetPath);
      toast.success('Reset request processed.');
    } catch (err: any) {
      toast.error(err.message || 'Unable to process request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FB] dark:bg-[#090E1D]">
      <PublicNavbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="max-w-md w-full p-8 space-y-5">
          <div className="w-11 h-11 rounded-xl bg-[#367BF5]/10 text-[#367BF5] flex items-center justify-center">
            <MailCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#101B35] dark:text-white">
              Reset Your Password
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Enter your registered email address to receive a secure time-limited reset token.
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Account Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex.rivera@candidate.demo"
              />
              <Button type="submit" loading={loading} className="w-full">
                Send Reset Link
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                If an active account matches <strong>{email}</strong>, password reset
                instructions have been generated.
              </p>
              {demoLink && (
                <div className="p-3.5 rounded-xl bg-[#367BF5]/10 border border-[#367BF5]/25 text-xs space-y-2">
                  <p className="font-bold text-[#367BF5]">
                    Demo Mode (No External SMTP Configured):
                  </p>
                  <Link
                    href={demoLink}
                    className="inline-block font-semibold underline text-[#101B35] dark:text-white break-all"
                  >
                    Click here to open your secure Reset Password link →
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="text-center pt-2">
            <Link href="/login" className="text-xs font-semibold text-[#367BF5] hover:underline">
              ← Back to Sign In
            </Link>
          </div>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
