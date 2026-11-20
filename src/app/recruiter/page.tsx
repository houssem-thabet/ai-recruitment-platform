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
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  PageLoader,
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
      title="Recruiter Dashboard"
      subtitle="Real-time hiring funnel performance, AI candidate matching, and upcoming interviews"
      actions={
        <>
          <Link href="/recruiter/matching">
            <Button variant="outline" size="sm">
              <Sparkles className="w-4 h-4" /> AI Matching
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
          {/* 7 Required KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Published Jobs', value: data.metrics.publishedJobs, icon: Briefcase },
              { label: 'Total Applications', value: data.metrics.totalApplications, icon: ClipboardList },
              { label: 'New (Submitted)', value: data.metrics.newApplications, icon: Clock },
              { label: 'Under Review', value: data.metrics.underReview, icon: Users },
              { label: 'Shortlisted', value: data.metrics.shortlisted, icon: Sparkles },
              { label: 'Interviews', value: data.metrics.scheduledInterviews, icon: Calendar },
              { label: 'Hired', value: data.metrics.hiredCandidates, icon: Award },
            ].map((k) => {
              const Icon = k.icon;
              return (
                <Card key={k.label} className="p-4">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {k.label}
                    </span>
                    <Icon className="w-3.5 h-3.5 text-[#367BF5]" />
                  </div>
                  <p className="text-2xl font-extrabold font-mono text-[#101B35] dark:text-white mt-2">
                    {k.value}
                  </p>
                </Card>
              );
            })}
          </div>

          {/* Interactive Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-3">
              <h3 className="text-base font-bold text-[#101B35] dark:text-white">
                Recruitment Pipeline Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.pipelineChart}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Candidates" fill="#367BF5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6 space-y-3">
              <h3 className="text-base font-bold text-[#101B35] dark:text-white">
                Applications &amp; Views per Job
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.applicationsPerJob}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="title" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="applications" name="Applications" fill="#28C5D8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Recent Applicants & Upcoming Interviews */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-7 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#101B35] dark:text-white">
                  Recent Candidate Applications
                </h3>
                <Link
                  href="/recruiter/applications"
                  className="text-xs font-semibold text-[#367BF5] hover:underline"
                >
                  Open Pipeline →
                </Link>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.recentApplications.map((a: any) => (
                  <div
                    key={a.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#101B35] dark:text-white">
                        {a.candidateProfile?.user?.firstName}{' '}
                        {a.candidateProfile?.user?.lastName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {a.job?.title} • {formatDate(a.appliedAt)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="lg:col-span-5 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#101B35] dark:text-white">
                  Upcoming Interviews
                </h3>
                <Link
                  href="/recruiter/interviews"
                  className="text-xs font-semibold text-[#367BF5] hover:underline"
                >
                  Manage All
                </Link>
              </div>
              {data.upcomingInterviews.length === 0 ? (
                <p className="text-xs text-slate-500">No upcoming interviews scheduled.</p>
              ) : (
                <div className="space-y-3">
                  {data.upcomingInterviews.map((iv: any) => (
                    <div
                      key={iv.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#101B35] dark:text-white">
                          {iv.candidateProfile?.user?.firstName}{' '}
                          {iv.candidateProfile?.user?.lastName}
                        </span>
                        <StatusBadge status={iv.status} />
                      </div>
                      <p className="text-slate-500">{iv.job?.title}</p>
                      <p className="font-semibold text-[#367BF5]">
                        {formatDateTime(iv.scheduledAt)} ({iv.type})
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
