import React from 'react';
import Link from 'next/link';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Card, Badge, Button } from '@/components/ui/primitives';
import { ShieldCheck, Sparkles, Scale, Code2 } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FB] dark:bg-[#090E1D]">
      <PublicNavbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="text-center space-y-4">
          <Badge variant="electric">About TalentAI</Badge>
          <h1 className="text-4xl font-extrabold text-[#101B35] dark:text-white">
            Find the Right Talent. Hire with Intelligence.
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            TalentAI is an engineering-driven recruitment &amp; career intelligence platform
            designed to make talent discovery faster, fairer, and radically more
            transparent for both candidates and hiring teams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-3">
            <Sparkles className="w-6 h-6 text-[#367BF5]" />
            <h3 className="text-lg font-bold text-[#101B35] dark:text-white">
              Explainable AI Architecture
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Unlike black-box applicant tracking systems, TalentAI breaks every
              compatibility score down into transparent sub-components (Skills, Experience,
              Education, Responsibilities, and Languages) with configurable weights.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <Scale className="w-6 h-6 text-[#28C5D8]" />
            <h3 className="text-lg font-bold text-[#101B35] dark:text-white">
              Ethical &amp; Bias-Aware by Design
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Protected personal attributes are systematically excluded from ranking
              vectors, candidates are never auto-rejected, and human recruiters retain full
              review and override authority.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            <h3 className="text-lg font-bold text-[#101B35] dark:text-white">
              Defense-in-Depth Security
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Built with bcrypt password hashing, cryptographic JWT sessions, RBAC
              middleware, private CV file isolation, binary header verification, and full
              administrative audit trails.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <Code2 className="w-6 h-6 text-indigo-500" />
            <h3 className="text-lg font-bold text-[#101B35] dark:text-white">
              Modern Full-Stack Engineering
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Powered by Next.js 14, TypeScript, Tailwind CSS, PostgreSQL 17, Prisma ORM,
              and a hybrid Deterministic NLP + Optional Live LLM architecture.
            </p>
          </Card>
        </div>

        <Card className="p-8 bg-[#101B35] text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold">Ready to explore TalentAI in action?</h3>
            <p className="text-sm text-slate-300 mt-1">
              Test Candidate, Recruiter, or Administrator workflows immediately.
            </p>
          </div>
          <Link href="/login">
            <Button variant="accent">Try Live Demo Workspace</Button>
          </Link>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
