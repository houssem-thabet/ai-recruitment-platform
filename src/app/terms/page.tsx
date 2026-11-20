import React from 'react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Card } from '@/components/ui/primitives';

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FB] dark:bg-[#090E1D]">
      <PublicNavbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <h1 className="text-3xl font-extrabold text-[#101B35] dark:text-white">
          Terms of Service
        </h1>
        <Card className="p-6 sm:p-8 space-y-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#101B35] dark:text-white">
              1. Acceptable Platform Use
            </h2>
            <p>
              Candidates agree to provide truthful qualifications and work history.
              Recruiters agree to publish genuine, non-discriminatory job opportunities and
              to review AI compatibility insights responsibly with human judgment.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#101B35] dark:text-white">
              2. Human-in-the-Loop Requirement
            </h2>
            <p>
              AI-generated job descriptions require explicit recruiter review and approval
              prior to publication. AI compatibility scores and interview note summaries
              must never be used as sole automated determinants of employment eligibility.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#101B35] dark:text-white">
              3. Account Security &amp; Moderation
            </h2>
            <p>
              Users are responsible for safeguarding account credentials. Platform
              administrators may place non-compliant job advertisements on moderation hold
              or suspend abusive accounts with logged audit accountability.
            </p>
          </section>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
