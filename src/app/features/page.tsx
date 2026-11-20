import React from 'react';
import Link from 'next/link';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Card, Badge, Button } from '@/components/ui/primitives';
import {
  FileText,
  Target,
  Wand2,
  HelpCircle,
  ClipboardCheck,
  Bot,
  BarChart2,
  Compass,
} from 'lucide-react';

const EIGHT_MODULES = [
  {
    num: '01',
    icon: FileText,
    title: 'AI CV Analyzer (PDF & DOCX)',
    detail:
      'Extracts candidate summaries, technical & soft skills, work timelines, degrees, certifications, projects, and quantified achievements with completeness scoring and candidate verification.',
  },
  {
    num: '02',
    icon: Target,
    title: 'Intelligent Job–Candidate Matching',
    detail:
      'Computes explainable 0–100 compatibility scores across configurable weights (40% Skills, 25% Experience, 15% Education, 15% Responsibilities/Projects, 5% Languages) with recruiter override.',
  },
  {
    num: '03',
    icon: Wand2,
    title: 'AI Job Description Generator',
    detail:
      'Drafts structured, bias-checked job postings including overview, responsibilities, required/preferred qualifications, skills, and benefits — requiring human recruiter sign-off prior to publication.',
  },
  {
    num: '04',
    icon: HelpCircle,
    title: 'AI Interview Question Generator',
    detail:
      'Produces tailored Technical, Behavioral, Situational, Problem-Solving, and Project questions complete with assessed skill, strong-answer indicators, and evaluation criteria.',
  },
  {
    num: '05',
    icon: ClipboardCheck,
    title: 'Consent-Gated Interview Evaluation Assistant',
    detail:
      'Organizes interviewer-entered notes against job requirements, highlights demonstrated competencies, and flags unanswered areas — with zero personality/biometric inference.',
  },
  {
    num: '06',
    icon: Bot,
    title: 'Contextual AI Career Assistant',
    detail:
      'Conversational coach for candidates grounded on their live profile, CV completeness audit, skill gaps, and highest-matching open positions.',
  },
  {
    num: '07',
    icon: BarChart2,
    title: 'Visual Skill Gap Analysis',
    detail:
      'Compares candidate skills against any live job or career path blueprint with interactive charts, learning priority order, estimated weeks, and portfolio project blueprints.',
  },
  {
    num: '08',
    icon: Compass,
    title: 'Personalized AI Job Recommendations',
    detail:
      'Ranks open jobs using skills, experience, workplace preferences, and career interests with transparent "Why Recommended" badges and one-click dismissal.',
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FB] dark:bg-[#090E1D]">
      <PublicNavbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="cyan">Platform Capabilities</Badge>
          <h1 className="text-4xl font-extrabold text-[#101B35] dark:text-white">
            8 Core AI Engines + Complete Recruitment Suite
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            Every AI module operates transparently in Deterministic NLP Mode out-of-the-box
            and upgrades seamlessly when external LLM credentials are configured.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {EIGHT_MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.num} className="p-6 flex gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#367BF5]/10 text-[#367BF5] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-bold text-[#28C5D8]">
                    FEATURE {m.num}
                  </span>
                  <h3 className="text-lg font-bold text-[#101B35] dark:text-white">
                    {m.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {m.detail}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="text-center pt-4">
          <Link href="/register">
            <Button size="lg">Get Started with TalentAI</Button>
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
