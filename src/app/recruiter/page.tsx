'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Briefcase,
  ClipboardList,
  Sparkles,
  Calendar,
  PlusCircle,
  Users,
  Award,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  Badge,
  PageLoader,
  PremiumChartTooltip,
  StatusBadge,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { formatDate, formatDateTime } from '@/lib/utils';

export default function RecruiterOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/recruiter/dashboard')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell
      role="RECRUITER"
      title="Recruiter Executive Dashboard"
      subtitle="Real-time hiring funnel velocity, AI compatibility pipeline, and scheduled interview command"
      actions={
        <>
          <Link href="/recruiter/matching">
            <Button variant="outline" size="sm">
              <Sparkles className="w-4 h-4 text-[#367BF5]" /> AI Matching
            </Button>
          </Link>
          <Link href="/recruiter/jobs/new">
            <Button size="sm">
              <PlusCircle className="w-4 h-4" /> Create Job
            </Button>
          </Link>
        </>
      }
    >
      {loading || !data ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          {/* 7 Executive ATS KPI Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              {
                label: 'Published Jobs',
                value: data.metrics.publishedJobs,
                icon: Briefcase,
                bar: 'from-[#367BF5] to-[#2463EB]',
              },
              {
                label: 'Applications',
                value: data.metrics.totalApplications,
                icon: ClipboardList,
                bar: 'from-[#101B35] to-[#367BF5]',
              },
              {
                label: 'New Submitted',
                value: data.metrics.newApplications,
                icon: Clock,
                bar: 'from-amber-400 to-amber-500',
              },
              {
                label: 'Under Review',
                value: data.metrics.underReview,
                icon: Users,
                bar: 'from-[#367BF5] to-[#28C5D8]',
              },
              {
                label: 'Shortlisted',
                value: data.metrics.shortlisted,
                icon: Sparkles,
                bar: 'from-[#28C5D8] to-[#1799A8]',
              },
              {
                label: 'Interviews',
                value: data.metrics.scheduledInterviews,
                icon: Calendar,
                bar: 'from-indigo-500 to-[#367BF5]',
              },
              {
                label: 'Hired',
                value: data.metrics.hiredCandidates,
                icon: Award,
                bar: 'from-emerald-500 to-[#28C5D8]',
              },
            ].map((k) => {
              const Icon = k.icon;
              return (
                <Card
                  key={k.label}
                  className="relative overflow-hidden p-4 hover:-translate-y-0.5 hover:shadow-elevated transition-all"
                >
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${k.bar}`} />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                      {k.label}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-[#367BF5]/10 dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-[#367BF5] dark:text-[#28C5D8]" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold font-mono tabular-nums text-[#101B35] dark:text-white mt-2">
                    {k.value}
                  </p>
                </Card>
              );
            })}
          </div>

          {/* Interactive Funnel & Job Volume Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#101B35] dark:text-white">
                    Recruitment Pipeline Distribution
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Candidates across active ATS workflow stages
                  </p>
                </div>
                <Badge variant="electric">Funnel</Badge>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.pipelineChart}>
                    <defs>
                      <linearGradient id="recPipelineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#367BF5" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#1D58D8" stopOpacity={0.75} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.14} vertical={false} />
                    <XAxis
                      dataKey="stage"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <Tooltip
                      content={<PremiumChartTooltip />}
                      cursor={{ fill: 'rgba(54, 123, 245, 0.06)' }}
                    />
                    <Bar
                      dataKey="count"
                      name="Candidates"
                      fill="url(#recPipelineGrad)"
                      radius={[7, 7, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#101B35] dark:text-white">
                    Applications per Published Role
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Inbound candidate demand across open requisitions
                  </p>
                </div>
                <Badge variant="cyan">Demand</Badge>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.applicationsPerJob}>
                    <defs>
                      <linearGradient id="recAppsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#28C5D8" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#367BF5" stopOpacity={0.75} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.14} vertical={false} />
                    <XAxis
                      dataKey="title"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#64748B' }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <Tooltip
                      content={<PremiumChartTooltip />}
                      cursor={{ fill: 'rgba(40, 197, 216, 0.06)' }}
                    />
                    <Bar
                      dataKey="applications"
                      name="Applications"
                      fill="url(#recAppsGrad)"
                      radius={[7, 7, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Recent Applicants & Upcoming Interviews */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-7 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-[#101B35] dark:text-white">
                  Recent Candidate Applications
                </h3>
                <Link
                  href="/recruiter/applications"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#367BF5] dark:text-[#28C5D8] hover:underline"
                >
                  Open Kanban Pipeline <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-white/[0.07]">
                {data.recentApplications.map((a: any) => {
                  const fn = a.candidateProfile?.user?.firstName || 'C';
                  const ln = a.candidateProfile?.user?.lastName || '';
                  return (
                    <div
                      key={a.id}
                      className="py-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#367BF5]/20 to-[#101B35]/15 border border-[#367BF5]/25 text-[#367BF5] dark:text-[#28C5D8] font-extrabold text-xs flex items-center justify-center shrink-0">
                          {fn[0]}
                          {ln[0] || ''}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#101B35] dark:text-white truncate">
                            {fn} {ln}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {a.job?.title} • {formatDate(a.appliedAt)}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="lg:col-span-5 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-[#101B35] dark:text-white">
                  Upcoming Interviews
                </h3>
                <Link
                  href="/recruiter/interviews"
                  className="text-xs font-bold text-[#367BF5] dark:text-[#28C5D8] hover:underline"
                >
                  Manage Schedule
                </Link>
              </div>
              {data.upcomingInterviews.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">
                  No upcoming interviews scheduled.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.upcomingInterviews.map((iv: any) => (
                    <div
                      key={iv.id}
                      className="p-4 rounded-xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.07] space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-[#101B35] dark:text-white">
                          {iv.candidateProfile?.user?.firstName}{' '}
                          {iv.candidateProfile?.user?.lastName}
                        </span>
                        <StatusBadge status={iv.status} />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400">{iv.job?.title}</p>
                      <p className="font-mono font-bold text-[#367BF5] dark:text-[#28C5D8]">
                        {formatDateTime(iv.scheduledAt)} • {iv.type}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
