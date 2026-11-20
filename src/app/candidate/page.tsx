'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  ClipboardList,
  Calendar,
  Sparkles,
  FileText,
  ArrowRight,
  Bookmark,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  Badge,
  PageLoader,
  ScoreBadge,
  StatusBadge,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { formatDate, formatDateTime, formatSalaryRange } from '@/lib/utils';

export default function CandidateOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/candidates/dashboard')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell
      role="CANDIDATE"
      title="Candidate Overview"
      subtitle="Your personalized AI career intelligence, application status, and job recommendations"
      actions={
        <>
          <Link href="/candidate/cv">
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4" /> Analyze CV
            </Button>
          </Link>
          <Link href="/candidate/jobs">
            <Button size="sm">
              <Briefcase className="w-4 h-4" /> Find Jobs
            </Button>
          </Link>
        </>
      }
    >
      {loading || !data ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                label: 'Active Applications',
                value: data.metrics.activeApplications,
                icon: ClipboardList,
                accent: 'text-[#367BF5]',
              },
              {
                label: 'Shortlisted / Advanced',
                value: data.metrics.shortlistedCount,
                icon: Sparkles,
                accent: 'text-[#28C5D8]',
              },
              {
                label: 'Upcoming Interviews',
                value: data.metrics.upcomingInterviewsCount,
                icon: Calendar,
                accent: 'text-indigo-500',
              },
              {
                label: 'Bookmarked Jobs',
                value: data.metrics.savedJobsCount,
                icon: Bookmark,
                accent: 'text-amber-500',
              },
              {
                label: 'CV AI Completeness',
                value:
                  data.metrics.cvCompleteness !== null
                    ? `${data.metrics.cvCompleteness}%`
                    : 'Upload CV',
                icon: FileText,
                accent: 'text-emerald-500',
              },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label} className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {kpi.label}
                    </span>
                    <Icon className={`w-4 h-4 ${kpi.accent}`} />
                  </div>
                  <p className="text-2xl font-extrabold font-mono text-[#101B35] dark:text-white mt-2">
                    {kpi.value}
                  </p>
                </Card>
              );
            })}
          </div>

          {/* Profile Strength Banner */}
          <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Profile Readiness Score</span>
                <span className="font-mono text-[#367BF5]">
                  {data.metrics.profileCompleteness}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#367BF5] to-[#28C5D8]"
                  style={{ width: `${data.metrics.profileCompleteness}%` }}
                />
              </div>
            </div>
            <Link href="/candidate/profile">
              <Button variant="outline" size="sm">
                Enhance Profile <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* AI Recommended Jobs */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#101B35] dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#367BF5]" />
                  AI Job Recommendations for You
                </h2>
                <Link
                  href="/candidate/jobs"
                  className="text-xs font-semibold text-[#367BF5] hover:underline"
                >
                  See All Recommendations →
                </Link>
              </div>

              <div className="space-y-3">
                {data.recommendations.map((rec: any) => (
                  <Card key={rec.job.id} className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/candidate/jobs/${rec.job.id}`}
                          className="text-base font-bold text-[#101B35] dark:text-white hover:text-[#367BF5]"
                        >
                          {rec.job.title}
                        </Link>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {rec.job.company?.name} • {rec.job.location} ({rec.job.workMode}) •{' '}
                          {formatSalaryRange(
                            rec.job.salaryMin,
                            rec.job.salaryMax,
                            rec.job.salaryCurrency
                          )}
                        </p>
                      </div>
                      <ScoreBadge score={rec.compatibilityScore} />
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {rec.matchingSkills?.slice(0, 4).map((s: string) => (
                        <Badge key={s} variant="success">
                          ✓ {s}
                        </Badge>
                      ))}
                      {rec.missingSkills?.slice(0, 2).map((s: string) => (
                        <Badge key={s} variant="warning">
                          Learn: {s}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {rec.reason}
                    </p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Upcoming Interviews & Recent Applications */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#101B35] dark:text-white">
                    Upcoming Interviews
                  </h3>
                  <Link
                    href="/candidate/applications"
                    className="text-xs font-semibold text-[#367BF5]"
                  >
                    Manage
                  </Link>
                </div>
                {data.upcomingInterviews.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">
                    No upcoming interviews scheduled yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.upcomingInterviews.map((iv: any) => (
                      <div
                        key={iv.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#101B35] dark:text-white">
                            {iv.title}
                          </span>
                          <StatusBadge status={iv.status} />
                        </div>
                        <p className="text-xs text-slate-500">
                          {iv.job?.title} — {iv.job?.company?.name}
                        </p>
                        <p className="text-xs font-semibold text-[#367BF5]">
                          {formatDateTime(iv.scheduledAt)} ({iv.type})
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#101B35] dark:text-white">
                    Recent Applications
                  </h3>
                  <Link
                    href="/candidate/applications"
                    className="text-xs font-semibold text-[#367BF5]"
                  >
                    View All
                  </Link>
                </div>
                {data.recentApplications.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">
                    You haven&apos;t applied to any positions yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.recentApplications.map((app: any) => (
                      <div
                        key={app.id}
                        className="py-3 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#101B35] dark:text-white truncate">
                            {app.job?.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {app.job?.company?.name} • {formatDate(app.appliedAt)}
                          </p>
                        </div>
                        <StatusBadge status={app.status} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
