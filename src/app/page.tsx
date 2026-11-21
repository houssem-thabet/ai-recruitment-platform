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
  Compass,
  Layers,
} from 'lucide-react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Button, Card, Badge, ScoreBadge } from '@/components/ui/primitives';
import { formatSalaryRange } from '@/lib/utils';

const AI_FEATURES = [
  {
    icon: FileSearch,
    tag: 'Document Intelligence',
    title: 'AI CV Analyzer (PDF & DOCX)',
    description:
      'Extracts skills, merged experience timelines, degrees, projects, and quantified achievements into structured JSON with candidate verification.',
  },
  {
    icon: Target,
    tag: 'Semantic Scoring',
    title: 'Explainable Candidate Matching',
    description:
      'Transparent 0–100 compatibility scoring across configurable weights (Skills 40%, Experience 25%, Education 15%, Projects 15%, Languages 5%).',
  },
  {
    icon: Sparkles,
    tag: 'Recruiter Co-Pilot',
    title: 'AI Job Description Generator',
    description:
      'Generates structured, inclusive job advertisements with mandatory human recruiter approval before publication.',
  },
  {
    icon: Calendar,
    tag: 'Structured Rubrics',
    title: 'Interview Question & Note Assistant',
    description:
      'Creates rubric-backed technical & behavioral questions and organizes consented interview notes without biometric or personality inference.',
  },
  {
    icon: Bot,
    tag: 'Multi-Turn Coaching',
    title: 'Contextual AI Career Assistant',
    description:
      'Conversational career coach grounded strictly on your authorized profile, CV completeness audit, and live skill-matched jobs.',
  },
  {
    icon: BarChart3,
    tag: 'Funnel Telemetry',
    title: 'Visual Skill Gap & Funnel Analytics',
    description:
      'Interactive prerequisite-ordered skill roadmaps for candidates alongside real-time conversion analytics for hiring teams.',
  },
];

const DEMO_TESTIMONIALS = [
  {
    quote:
      'TalentAI cut our initial CV screening time in half while giving every applicant transparent, skill-based consideration.',
    name: 'Sarah Chen (Fictional Demo Persona)',
    role: 'Head of Technical Recruiting, NovaTech AI Systems',
    initials: 'SC',
  },
  {
    quote:
      'Seeing exact matching and missing skills before applying helped me tailor my portfolio and land two technical interviews.',
    name: 'Alex Rivera (Fictional Demo Persona)',
    role: 'Senior Full-Stack Engineer Candidate',
    initials: 'AR',
  },
  {
    quote:
      'The configurable matching weights and mandatory human review guardrails align with responsible hiring governance.',
    name: 'Elena Rossi (Fictional Demo Persona)',
    role: 'VP Talent Acquisition, FinEdge Digital Banking',
    initials: 'ER',
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
    a: 'Strictly no. Gender, age, race, religion, nationality, marital status, and disability status are explicitly excluded from tokenization, scoring, and ranking pipelines.',
  },
  {
    q: 'How does TalentAI work when no external LLM API key is configured?',
    a: 'TalentAI includes a built-in Deterministic NLP & Hybrid IDF Semantic Engine that runs locally with zero external data sharing, clearly badged as Deterministic NLP Mode. Configuring OpenAI, Anthropic, or Gemini upgrades narrative explanations seamlessly.',
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
    <div className="min-h-screen flex flex-col bg-[#F4F7FC] dark:bg-[#070C18]">
      <PublicNavbar />

      {/* 1. ARCHITECTURAL HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0A1124] via-[#101B35] to-[#0B152B] text-white">
        <div className="absolute inset-0 bg-grid-navy opacity-60 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-28 right-1/4 w-[460px] h-[460px] rounded-full bg-[#367BF5]/25 blur-[110px]" />
          <div className="absolute bottom-0 left-12 w-[380px] h-[380px] rounded-full bg-[#28C5D8]/20 blur-[100px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.08] border border-[#28C5D8]/30 text-[#28C5D8] text-xs font-bold tracking-wide shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Find the right talent. Hire with intelligence.
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-extrabold tracking-tight leading-[1.08]">
              Recruit Smarter.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5B9BFF] via-[#367BF5] to-[#28C5D8]">
                Discover Better Talent.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300/95 max-w-2xl leading-relaxed">
              TalentAI unifies structured CV parsing, explainable candidate–job semantic
              matching, career intelligence, and executive hiring pipelines inside one
              transparent SaaS platform.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link href="/jobs">
                <Button size="lg" className="shadow-glow">
                  Explore Open Jobs <ArrowRight className="w-4 h-4" />
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
                  className="bg-white/[0.06] border-white/20 text-white hover:bg-white/15 hover:border-white/35"
                >
                  AI Architecture
                </Button>
              </Link>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-slate-300">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#28C5D8]" />
                Explainable 0–100 Sub-Scores
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#28C5D8]" />
                PDF &amp; DOCX Magic-Byte Parsing
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#28C5D8]" />
                Zero Automated Rejections
              </span>
            </div>
          </div>

          {/* Interactive Hero Explainable Match Showcase Card */}
          <div className="lg:col-span-5 animate-fade-in-up">
            <div className="relative rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.11] to-white/[0.05] backdrop-blur-2xl p-6 sm:p-7 shadow-2xl space-y-5">
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-[#28C5D8] font-extrabold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#28C5D8]" />
                    Explainable Compatibility Audit
                  </div>
                  <h3 className="text-base font-extrabold text-white mt-1">
                    Alex Rivera → Senior Full-Stack Engineer
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    NovaTech AI Systems • Hybrid • €85k–€115k
                  </p>
                </div>
                <ScoreBadge score={89} />
              </div>

              <div className="space-y-3.5 text-xs">
                {[
                  {
                    label: 'Technical & Ecosystem Skills (40% wt)',
                    pct: 92,
                    bar: 'from-[#367BF5] to-[#28C5D8]',
                  },
                  {
                    label: 'Verified Experience Timeline (25% wt)',
                    pct: 88,
                    bar: 'from-[#367BF5] to-[#5F97F7]',
                  },
                  {
                    label: 'Semantic Role Alignment (20% wt)',
                    pct: 86,
                    bar: 'from-[#28C5D8] to-emerald-400',
                  },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-slate-300 mb-1.5">
                      <span className="font-medium">{row.label}</span>
                      <span className="font-mono font-bold tabular-nums text-white">
                        {row.pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${row.bar}`}
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Verified Skill Evidence
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['TypeScript', 'React', 'Next.js', 'Node.js', 'PostgreSQL', 'Prisma'].map(
                    (s) => (
                      <span
                        key={s}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-400/15 text-emerald-200 border border-emerald-400/30"
                      >
                        ✓ {s}
                      </span>
                    )
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-400/15 text-amber-200 border border-amber-400/30">
                    Probe: Docker
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-[#070D1C]/85 border border-white/10 p-4 text-xs text-slate-300 leading-relaxed">
                <strong className="text-[#28C5D8]">Recruiter Rationale:</strong> Strong
                full-stack TypeScript &amp; PostgreSQL track record across 5 merged years.
                Probe container orchestration depth during technical interview.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LIVE DATABASE TELEMETRY BAR */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10 w-full">
        <Card className="p-6 sm:p-8 border-slate-200/90 dark:border-white/10 shadow-elevated">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
            <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[#101B35] dark:text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live PostgreSQL Platform Telemetry
            </span>
            <Badge variant="cyan" dot>
              Seeded Academic Demo Dataset
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-white/[0.07]">
            {[
              { label: 'Published Roles', value: stats.publishedJobsCount, accent: 'text-[#367BF5]' },
              { label: 'Candidate Profiles', value: stats.candidatesCount, accent: 'text-[#101B35] dark:text-white' },
              { label: 'Hiring Companies', value: stats.companiesCount, accent: 'text-[#101B35] dark:text-white' },
              { label: 'Active Applications', value: stats.applicationsCount, accent: 'text-[#101B35] dark:text-white' },
              { label: 'AI Match Audits', value: stats.matchesCount, accent: 'text-[#28C5D8]' },
            ].map((item, idx) => (
              <div
                key={item.label}
                className={idx > 0 ? 'pt-4 md:pt-0 md:pl-6' : ''}
              >
                <p className={`text-3xl font-extrabold font-mono tabular-nums ${item.accent}`}>
                  {item.value}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* 3. CORE AI CAPABILITIES BENTO GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="electric" dot>
            8 Integrated AI Subsystems
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#101B35] dark:text-white mt-3">
            Intelligent Automation Built for Real Recruitment
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
            Every AI capability in TalentAI is grounded in verifiable candidate evidence,
            strict schema validation, and human-in-the-loop governance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AI_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} interactive className="p-6 sm:p-7 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#367BF5]/15 to-[#28C5D8]/20 border border-[#367BF5]/20 text-[#367BF5] dark:text-[#28C5D8] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-[#101B35] dark:text-white">
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
      <section className="bg-white dark:bg-[#0B1325] border-y border-slate-200/80 dark:border-white/[0.07] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="cyan" dot>
              End-to-End Architecture
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#101B35] dark:text-white mt-3">
              How TalentAI Connects Talent &amp; Teams
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Upload CV or Publish Role',
                desc: 'Candidates upload PDF/DOCX CVs for structured extraction; recruiters craft or AI-generate bias-checked job postings.',
                bar: 'from-[#28C5D8] to-[#367BF5]',
              },
              {
                step: '02',
                title: 'Explainable Compatibility Analysis',
                desc: 'TalentAI evaluates exact & ecosystem-adjacent skills, merged experience timelines, education, and semantic role fit.',
                bar: 'from-[#367BF5] to-[#1D58D8]',
              },
              {
                step: '03',
                title: 'Collaborate, Interview & Hire',
                desc: 'Manage Kanban pipelines, schedule conflict-checked interviews, exchange messages, and track funnel conversion live.',
                bar: 'from-[#101B35] via-[#367BF5] to-[#28C5D8]',
              },
            ].map((s) => (
              <div
                key={s.step}
                className="relative overflow-hidden rounded-2xl p-7 bg-[#F4F7FC] dark:bg-[#0E172C] border border-slate-200/80 dark:border-white/[0.08]"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${s.bar}`} />
                <span className="inline-flex items-center justify-center px-3 py-1 rounded-xl bg-[#367BF5]/10 text-[#367BF5] dark:text-[#28C5D8] font-mono text-xs font-extrabold">
                  STEP {s.step}
                </span>
                <h3 className="text-lg font-extrabold text-[#101B35] dark:text-white mt-4">
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

      {/* 5 & 6. DISTINCT ROLE EXPERIENCES + FEATURED LIVE JOBS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Candidate Studio Card */}
          <Card className="relative overflow-hidden p-8 sm:p-9">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#28C5D8] to-[#367BF5]" />
            <div className="flex items-center justify-between">
              <Badge variant="cyan" dot>
                Candidate Career Studio
              </Badge>
              <Compass className="w-5 h-5 text-[#28C5D8]" />
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight text-[#101B35] dark:text-white mt-4">
              Accelerate Your Career with Transparent Feedback
            </h3>
            <ul className="mt-6 space-y-3.5 text-sm text-slate-600 dark:text-slate-300">
              {[
                'Instant PDF & DOCX CV completeness audit with editable extracted fields',
                'See exact matching, adjacent, and missing skills before applying',
                'Prerequisite-ordered Skill Gap charts with hands-on portfolio projects',
                'Multi-turn AI Career Assistant grounded on your verified profile',
                'Real-time application tracker, interview invitations, and direct inbox',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#28C5D8] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/register?type=CANDIDATE">
                <Button variant="accent">
                  Launch Candidate Studio <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* Recruiter Command Card */}
          <Card className="relative overflow-hidden p-8 sm:p-9">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#101B35] via-[#367BF5] to-[#28C5D8]" />
            <div className="flex items-center justify-between">
              <Badge variant="electric" dot>
                Recruiter ATS Command
              </Badge>
              <Layers className="w-5 h-5 text-[#367BF5]" />
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight text-[#101B35] dark:text-white mt-4">
              Hire Faster with Explainable Decision Support
            </h3>
            <ul className="mt-6 space-y-3.5 text-sm text-slate-600 dark:text-slate-300">
              {[
                'Configurable compatibility scoring weights with manual recruiter override',
                'Visual Kanban applicant pipeline with private notes & candidate feedback',
                'AI Job Description & Structured Interview Question generators',
                'Conflict-checked interview scheduling and consented note organization',
                'Live recruitment funnel analytics and one-click CSV candidate export',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#367BF5] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/register?type=RECRUITER">
                <Button>
                  Register Hiring Workspace <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Featured Live Opportunities */}
        {featuredJobs.length > 0 && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
              <div>
                <Badge variant="electric" dot>
                  Open Positions
                </Badge>
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#101B35] dark:text-white mt-2">
                  Latest Featured Opportunities
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Live roles published by hiring teams in PostgreSQL
                </p>
              </div>
              <Link href="/jobs">
                <Button variant="outline" size="sm">
                  Browse All Jobs <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredJobs.map((job) => (
                <Card
                  key={job.id}
                  interactive
                  className="p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#101B35] to-[#367BF5] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                          {(job.company?.name || 'TA').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#101B35] dark:text-slate-200 truncate">
                            {job.company?.name}
                          </p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {job.location}
                          </p>
                        </div>
                      </div>
                      <Badge variant="electric">{job.workMode}</Badge>
                    </div>

                    <Link
                      href={`/jobs/${job.id}`}
                      className="block text-base font-extrabold text-[#101B35] dark:text-white hover:text-[#367BF5] dark:hover:text-[#28C5D8] transition-colors mt-4"
                    >
                      {job.title}
                    </Link>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {job.skills?.slice(0, 4).map((js: any) => (
                        <Badge key={js.id} variant="default">
                          {js.skill.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/[0.07] flex items-center justify-between">
                    <span className="text-xs font-extrabold font-mono tabular-nums text-[#367BF5] dark:text-[#28C5D8]">
                      {formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                    </span>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-xs font-bold text-[#101B35] dark:text-white hover:text-[#367BF5] dark:hover:text-[#28C5D8] inline-flex items-center gap-1"
                    >
                      View Role <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 7. RESPONSIBLE AI & GOVERNANCE STRIP */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0A1124] via-[#101B35] to-[#0D1A36] text-white py-16 border-y border-white/10">
        <div className="absolute inset-0 bg-grid-navy opacity-40 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: ShieldCheck,
              title: 'Enterprise Security & Privacy',
              desc: 'Bcrypt password hashing, signed JWT RBAC, private CV storage, binary magic-byte validation, and strict role isolation.',
            },
            {
              icon: Scale,
              title: 'Demographic-Invariant AI',
              desc: 'Protected personal attributes are mathematically stripped prior to vectorization—ensuring fair, skill-grounded evaluations.',
            },
            {
              icon: Users,
              title: 'Human-in-the-Loop Authority',
              desc: 'Recruiters approve AI job descriptions, override compatibility scores with audit notes, and retain 100% hiring authority.',
            },
          ].map((g) => {
            const Icon = g.icon;
            return (
              <div
                key={g.title}
                className="flex gap-4 p-5 rounded-2xl bg-white/[0.04] border border-white/10"
              >
                <div className="w-11 h-11 rounded-xl bg-[#28C5D8]/15 border border-[#28C5D8]/30 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[#28C5D8]" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-white">{g.title}</h4>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                    {g.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. PERSONA TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="warning" dot>
            Fictional Demo Testimonials
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#101B35] dark:text-white mt-3">
            Designed for Candidate Clarity &amp; Recruiter Precision
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Illustrative personas created for academic demonstration of TalentAI workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DEMO_TESTIMONIALS.map((t) => (
            <Card key={t.name} className="p-6 sm:p-7 flex flex-col justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/[0.07] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#367BF5]/20 to-[#28C5D8]/20 border border-[#367BF5]/25 text-[#367BF5] dark:text-[#28C5D8] font-extrabold text-xs flex items-center justify-center shrink-0">
                  {t.initials}
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#101B35] dark:text-white">
                    {t.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 9. FAQ ACCORDION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 w-full">
        <div className="text-center mb-10">
          <Badge variant="electric">Platform Governance FAQ</Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#101B35] dark:text-white mt-2">
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
                  className="w-full px-6 py-4.5 flex items-center justify-between gap-4 text-left font-bold text-sm text-[#101B35] dark:text-white hover:text-[#367BF5] dark:hover:text-[#28C5D8] transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#367BF5]' : 'text-slate-400'
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-white/[0.07] pt-3.5 animate-fade-in-up">
                    {faq.a}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
