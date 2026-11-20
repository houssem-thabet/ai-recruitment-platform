import React from 'react';
import Link from 'next/link';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Card, Badge, Button } from '@/components/ui/primitives';

export default function HowItWorksPage() {
  const candidateSteps = [
    {
      step: '1. Build Profile & Upload CV',
      desc: 'Register as a Candidate and upload your PDF or DOCX CV. TalentAI extracts skills, education, and experience into an editable structured profile.',
    },
    {
      step: '2. Review AI Skill Gaps & Recommendations',
      desc: 'Explore personalized job matches with transparent 0–100 compatibility breakdowns, or ask the AI Career Assistant for learning project roadmaps.',
    },
    {
      step: '3. Apply, Track & Interview',
      desc: 'Submit applications in one click, track every status transition, accept or reschedule interviews, and message recruiters directly.',
    },
  ];

  const recruiterSteps = [
    {
      step: '1. Configure Company & Publish Jobs',
      desc: 'Create job postings manually or accelerate drafting with the AI Job Description Generator (with human approval required before publishing).',
    },
    {
      step: '2. Evaluate with Configurable AI Matching',
      desc: 'Compare applicants side-by-side, customize scoring weights, inspect matched vs. missing skills, and document human override notes.',
    },
    {
      step: '3. Manage Pipeline, Interviews & Analytics',
      desc: 'Move candidates across the Kanban pipeline, schedule conflict-checked interviews, generate structured rubrics, and export recruitment analytics.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FB] dark:bg-[#090E1D]">
      <PublicNavbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-14">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="electric">Step-by-Step Guide</Badge>
          <h1 className="text-4xl font-extrabold text-[#101B35] dark:text-white">
            How TalentAI Works
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Purpose-built workflows connecting candidates, hiring teams, and platform
            administrators.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#367BF5]">Candidate Workflow</h2>
            {candidateSteps.map((s) => (
              <Card key={s.step} className="p-6 space-y-2">
                <h3 className="font-bold text-[#101B35] dark:text-white">{s.step}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {s.desc}
                </p>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#28C5D8]">Recruiter Workflow</h2>
            {recruiterSteps.map((s) => (
              <Card key={s.step} className="p-6 space-y-2">
                <h3 className="font-bold text-[#101B35] dark:text-white">{s.step}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {s.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Link href="/jobs">
            <Button size="lg">Browse Live Jobs</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              Sign In to Demo Account
            </Button>
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
