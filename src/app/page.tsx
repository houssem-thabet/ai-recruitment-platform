'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  FileSearch,
  Target,
  Bot,
  ShieldCheck,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Building2,
  MapPin,
  Briefcase,
  ChevronDown,
  Scale,
  Users,
  Calendar,
} from 'lucide-react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Button, Card, Badge, ScoreBadge } from '@/components/ui/primitives';
import { formatSalaryRange } from '@/lib/utils';

const AI_FEATURES = [
  {
    icon: FileSearch,
    title: 'AI CV Analyzer (PDF & DOCX)',
    description:
      'Extracts skills, experience timelines, degrees, projects, and achievements into structured JSON with completeness scoring and candidate review.',
  },
  {
    icon: Target,
    title: 'Explainable Candidate Matching',
    description:
      'Transparent 0–100 compatibility scoring across configurable weights (Skills 40%, Experience 25%, Education 15%, Projects 15%, Languages 5%).',
  },
  {
    icon: Sparkles,
    title: 'AI Job Description Generator',
    description:
      'Generates structured, inclusive job advertisements with mandatory human recruiter approval before publication.',
  },
  {
    icon: Calendar,
    title: 'Interview Question & Note Assistant',
    description:
      'Creates rubric-backed technical & behavioral questions and organizes consented interview notes without biometric or personality inference.',
  },
  {
    icon: Bot,
    title: 'Contextual AI Career Assistant',
    description:
      'Conversational career coach grounded on the candidate’s authorized profile, CV completeness, and live skill-matched jobs.',
  },
  {
    icon: BarChart3,
    title: 'Visual Skill Gap & Funnel Analytics',
    description:
      'Interactive charts comparing candidate competencies to target roles alongside real-time recruiter conversion metrics.',
  },
];

const DEMO_TESTIMONIALS = [
  {
    quote:
      'TalentAI cut our initial CV screening time in half while giving every applicant transparent, skill-based consideration.',
    name: 'Sarah Chen (Fictional Demo Persona)',
    role: 'Head of Technical Recruiting, NovaTech AI Systems',
  },
  {
    quote:
      'Seeing exact matching and missing skills before applying helped me tailor my portfolio and land two technical interviews.',
    name: 'Alex Rivera (Fictional Demo Persona)',
    role: 'Senior Full-Stack Engineer Candidate',
  },
  {
    quote:
      'The configurable matching weights and mandatory human review guardrails align with responsible hiring governance.',
    name: 'Elena Rossi (Fictional Demo Persona)',
    role: 'VP Talent Acquisition, FinEdge Digital Banking',
  },
];

const FAQS = [
  {
    q: 'Does TalentAI automatically reject candidates based on AI compatibility scores?',
    a: 'Never. Every compatibility score (0–100) is an explainable decision-support estimate. Human recruiters review all applications, can adjust category weights, and can override any AI score.',
  },
  {
    q: 'How are uploaded PDF and DOCX CVs stored and protected?',
    a: 'Uploaded CVs are validated by extension, size limit (5 MB), and binary magic-byte headers, then stored in a private server directory outside web-accessible folders. Only you and recruiters of jobs you apply to can view your CV.',
  },
  {
    q: 'Are protected demographic characteristics used in ranking?',
    a: 'Strictly no. Gender, age, race, religion, nationality, and disability status are explicitly excluded from tokenization, scoring, and ranking pipelines.',
  },
  {
    q: 'How does TalentAI work when no external LLM API key is configured?',
    a: 'TalentAI includes a built-in Deterministic NLP & Cosine Semantic Vector Engine that runs locally with zero external data sharing, clearly badged as Deterministic NLP Mode. Adding OPENAI_API_KEY upgrades narrative explanations seamlessly.',
  },
];

export default function LandingPage() {
  const [stats, setStats] = useState({
    candidatesCount: 10,
    companiesCount: 3,
    publishedJobsCount: 10,
    applicationsCount: 24,
    matchesCount: 24,
  });
  const [featuredJobs, setFeaturedJobs] = useState<any[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    fetch('/api/public/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d?.stats) setStats(d.stats);
        if (Array.isArray(d?.featuredJobs)) setFeaturedJobs(d.featuredJobs);
      })
      .catch(() => null);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FB] dark:bg-[#090E1D]">
      <PublicNavbar />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#101B35] via-[#132347] to-[#0B142B] text-white">
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#367BF5] blur-3xl" />
          <div className="absolute bottom-0 left-10 w-80 h-80 rounded-full bg-[#28C5D8] blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[#28C5D8] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Find the right talent. Hire with intelligence.
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12]">
              Recruit Smarter.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#367BF5] to-[#28C5D8]">
                Discover Better Talent.
              </span>
            </h1>

            <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
              TalentAI combines intelligent CV analysis, advanced candidate matching,
              and powerful recruitment tools to transform the way companies discover
              talent.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link href="/jobs">
                <Button size="lg" className="shadow-glow">
                  Find a Job <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/register?type=RECRUITER">
                <Button variant="accent" size="lg">
                  Hire Talent
                </Button>
              </Link>
              <Link href="/features">
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-white/5 border-white/20 text-white hover:bg-white/15"
                >
                  Explore Features
                </Button>
              </Link>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#28C5D8]" />
                Explainable 0–100 Matching
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#28C5D8]" />
                PDF &amp; DOCX CV Parsing
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#28C5D8]" />
                Zero Automated Rejections
              </span>
            </div>
          </div>

          {/* Interactive Hero Visual Preview Card */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-[#28C5D8] font-semibold">
                    Sample Explainable Match Card
                  </p>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Alex Rivera → Senior Full-Stack Engineer
                  </h3>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-400/20 border border-emerald-400/40 text-emerald-300 font-mono text-sm font-extrabold">
                  89/100
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Technical &amp; Professional Skills (40% wt)</span>
                    <span className="font-mono text-white">92%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-[92%] bg-gradient-to-r from-[#367BF5] to-[#28C5D8]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Relevant Experience &amp; Projects (40% wt)</span>
                    <span className="font-mono text-white">88%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-[88%] bg-[#367BF5]" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-300">Matched Skills:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['TypeScript', 'React', 'Next.js', 'Node.js', 'PostgreSQL', 'Prisma'].map(
                    (s) => (
                      <span
                        key={s}
                        className="px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-400/15 text-emerald-200 border border-emerald-400/30"
                      >
                        ✓ {s}
                      </span>
                    )
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-amber-400/15 text-amber-200 border border-amber-400/30">
                    Verify: Docker
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-[#0A1124]/80 border border-white/10 p-3.5 text-xs text-slate-300 leading-relaxed">
                <strong className="text-white">AI Explanation:</strong> Strong alignment
                across full-stack TypeScript &amp; PostgreSQL requirements. Verify container
                deployment experience during technical interview.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PLATFORM STATISTICS (LIVE FROM DB — CLEARLY LABELED DEMO DATA) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <Card className="p-6 sm:p-8">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Live Database Telemetry
            </span>
            <Badge variant="cyan">Seeded Academic Demo Dataset — Live PostgreSQL</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { label: 'Active Jobs', value: stats.publishedJobsCount },
              { label: 'Candidate Profiles', value: stats.candidatesCount },
              { label: 'Hiring Companies', value: stats.companiesCount },
              { label: 'Submitted Applications', value: stats.applicationsCount },
              { label: 'AI Compatibility Audits', value: stats.matchesCount },
            ].map((item) => (
              <div key={item.label} className="text-center sm:text-left">
                <p className="text-3xl font-extrabold font-mono text-[#101B35] dark:text-white">
                  {item.value}
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* 3. CORE AI FEATURES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="electric">8 Integrated AI Engines</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#101B35] dark:text-white mt-3">
            Intelligent Automation Built for Real Recruitment
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-3">
            Every AI capability in TalentAI is grounded in verifiable candidate data,
            structured validation, and human-in-the-loop governance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AI_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Card
                key={f.title}
                className="p-6 hover:-translate-y-1 transition-transform duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#367BF5]/15 to-[#28C5D8]/20 text-[#367BF5] dark:text-[#28C5D8] flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#101B35] dark:text-white">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  {f.description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 4. HOW THE PLATFORM WORKS */}
      <section className="bg-white dark:bg-[#101B35]/60 border-y border-slate-200/80 dark:border-slate-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="cyan">End-to-End Workflow</Badge>
            <h2 className="text-3xl font-extrabold text-[#101B35] dark:text-white mt-3">
              How TalentAI Connects Talent &amp; Teams
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Upload CV or Publish Role',
                desc: 'Candidates upload PDF/DOCX CVs for structured extraction; recruiters craft or AI-generate bias-checked job postings.',
              },
              {
                step: '02',
                title: 'Explainable Compatibility Analysis',
                desc: 'TalentAI compares skills, experience, education, projects, and languages with transparent sub-scores and verification notes.',
              },
              {
                step: '03',
                title: 'Collaborate, Interview & Hire',
                desc: 'Manage Kanban pipelines, schedule conflict-checked interviews, exchange messages, and track analytics in real time.',
              },
            ].map((s) => (
              <div
                key={s.step}
                className="relative rounded-2xl p-6 bg-[#F4F7FB] dark:bg-[#090E1D] border border-slate-200/80 dark:border-slate-800"
              >
                <span className="text-4xl font-black font-mono text-[#367BF5]/25">
                  {s.step}
                </span>
                <h3 className="text-lg font-bold text-[#101B35] dark:text-white mt-2">
                  {s.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 & 6. CANDIDATE BENEFITS + RECRUITER BENEFITS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-8 border-t-4 border-t-[#367BF5]">
            <Badge variant="electric">For Candidates</Badge>
            <h3 className="text-2xl font-extrabold text-[#101B35] dark:text-white mt-3">
              Accelerate Your Career with Transparent Feedback
            </h3>
            <ul className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {[
                'Instant PDF & DOCX CV completeness audit with editable extracted fields',
                'See exact matching and missing skills before submitting an application',
                'Visual Skill Gap charts with prioritized learning projects',
                '24/7 AI Career Assistant contextualized to your profile and target roles',
                'Real-time application timeline, interview invitations, and direct messaging',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#367BF5] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <Link href="/register?type=CANDIDATE">
                <Button>Create Candidate Account</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-8 border-t-4 border-t-[#28C5D8]">
            <Badge variant="cyan">For Recruiters &amp; Companies</Badge>
            <h3 className="text-2xl font-extrabold text-[#101B35] dark:text-white mt-3">
              Hire Faster with Explainable Decision Support
            </h3>
            <ul className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {[
                'Configurable compatibility scoring weights with manual recruiter override',
                'Kanban recruitment pipeline with private notes and documented feedback',
                'AI Job Description & Structured Interview Question generators',
                'Conflict-checked interview scheduling and consented note organization',
                'Live recruitment funnel analytics and one-click CSV candidate export',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#28C5D8] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <Link href="/register?type=RECRUITER">
                <Button variant="secondary">Register Company Workspace</Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Featured Live Opportunities */}
        {featuredJobs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-extrabold text-[#101B35] dark:text-white">
                  Latest Open Positions
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Live opportunities from our PostgreSQL database (seeded demo companies)
                </p>
              </div>
              <Link href="/jobs">
                <Button variant="outline" size="sm">
                  View All Jobs <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredJobs.map((job) => (
                <Card key={job.id} className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="electric">{job.workMode}</Badge>
                      <span className="text-xs font-semibold text-slate-500">
                        {job.employmentType.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-[#101B35] dark:text-white mt-3">
                      {job.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                      <Building2 className="w-3.5 h-3.5" /> {job.company?.name} •{' '}
                      <MapPin className="w-3.5 h-3.5" /> {job.location}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {job.skills?.slice(0, 4).map((js: any) => (
                        <Badge key={js.id} variant="default">
                          {js.skill.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#367BF5]">
                      {formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                    </span>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-xs font-semibold text-[#101B35] dark:text-white hover:text-[#367BF5] inline-flex items-center gap-1"
                    >
                      Details <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 7. PLATFORM ADVANTAGES & RESPONSIBLE AI */}
      <section className="bg-[#101B35] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex gap-4">
            <ShieldCheck className="w-8 h-8 text-[#28C5D8] shrink-0" />
            <div>
              <h4 className="font-bold text-lg">Enterprise Security &amp; Privacy</h4>
              <p className="text-sm text-slate-300 mt-1">
                Bcrypt password hashing, signed JWT RBAC, private CV storage, magic-byte
                validation, and strict role isolation.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <Scale className="w-8 h-8 text-[#28C5D8] shrink-0" />
            <div>
              <h4 className="font-bold text-lg">Fair &amp; Explainable AI</h4>
              <p className="text-sm text-slate-300 mt-1">
                Zero protected-characteristic ranking, zero biometric inference, and full
                mathematical sub-score transparency.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <Users className="w-8 h-8 text-[#28C5D8] shrink-0" />
            <div>
              <h4 className="font-bold text-lg">Human-Centered Decisions</h4>
              <p className="text-sm text-slate-300 mt-1">
                Recruiters approve AI job descriptions, override scores with notes, and
                retain 100% authority over hiring outcomes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. TESTIMONIALS (CLEARLY LABELED FICTIONAL DEMO TESTIMONIALS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="warning">Fictional Demo Testimonials</Badge>
          <h2 className="text-3xl font-extrabold text-[#101B35] dark:text-white mt-3">
            Designed for Candidate Clarity &amp; Recruiter Precision
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Illustrative personas created for academic demonstration of TalentAI workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DEMO_TESTIMONIALS.map((t) => (
            <Card key={t.name} className="p-6 flex flex-col justify-between">
              <p className="text-sm italic text-slate-600 dark:text-slate-300 leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-sm font-bold text-[#101B35] dark:text-white">
                  {t.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.role}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 9. FAQ SECTION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 w-full">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-[#101B35] dark:text-white">
            Frequently Asked Questions
          </h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <Card key={faq.q} className="overflow-hidden">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left font-semibold text-sm text-[#101B35] dark:text-white"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isOpen ? 'rotate-180 text-[#367BF5]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                    {faq.a}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* 10. FOOTER */}
      <PublicFooter />
    </div>
  );
}
