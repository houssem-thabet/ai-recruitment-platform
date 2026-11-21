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
  MapPin,
  Building2,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  Badge,
  KPICard,
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
      title="Candidate Career Studio"
      subtitle="Your personalized AI career intelligence, live application tracker, and skill-matched opportunities"
      actions={
        <>
          <Link href="/candidate/cv">
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4" /> Analyze CV
            </Button>
          </Link>
          <Link href="/candidate/jobs">
            <Button variant="accent" size="sm">
              <Briefcase className="w-4 h-4" /> Explore Jobs
            </Button>
          </Link>
        </>
      }
    >
      {loading || !data ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          {/* Candidate Career Studio KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard
              label="Active Applications"
              value={data.metrics.activeApplications}
              icon={ClipboardList}
              tone="electric"
            />
            <KPICard
              label="Shortlisted / Advanced"
              value={data.metrics.shortlistedCount}
              icon={Sparkles}
              tone="cyan"
            />
            <KPICard
              label="Upcoming Interviews"
              value={data.metrics.upcomingInterviewsCount}
              icon={Calendar}
              tone="indigo"
            />
            <KPICard
              label="Saved Roles"
              value={data.metrics.savedJobsCount}
              icon={Bookmark}
              tone="amber"
            />
            <KPICard
              label="CV AI Completeness"
              value={
                data.metrics.cvCompleteness !== null
                  ? `${data.metrics.cvCompleteness}%`
                  : 'Upload'
              }
              icon={FileText}
              tone="emerald"
            />
          </div>

          {/* Signature Career Readiness Banner */}
          <Card className="relative overflow-hidden p-6 bg-gradient-to-r from-[#0E1C3A] via-[#13264E] to-[#0F2347] text-white border-[#28C5D8]/25">
            <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full bg-[#28C5D8]/15 blur-3xl pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex-1 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-[#28C5D8]">Profile &amp; Career Readiness Index</span>
                  <span className="font-mono text-sm font-extrabold tabular-nums text-white">
                    {data.metrics.profileCompleteness}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#28C5D8] via-[#367BF5] to-emerald-400 transition-all duration-500"
                    style={{ width: `${data.metrics.profileCompleteness}%` }}
                  />
                </div>
                <p className="text-xs text-slate-300">
                  Keep your verified skills, experience timeline, and CV audit up to date for
                  sharper semantic job matching.
                </p>
              </div>
              <Link href="/candidate/profile" className="shrink-0">
                <Button variant="accent" size="sm">
                  Enhance Profile <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* AI Recommended Jobs */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-[#101B35] dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#28C5D8]" />
                  AI Job Recommendations for You
                </h2>
                <Link
                  href="/candidate/jobs"
                  className="text-xs font-bold text-[#367BF5] dark:text-[#28C5D8] hover:underline"
                >
                  Browse All Roles →
                </Link>
              </div>

              <div className="space-y-3.5">
                {data.recommendations.map((rec: any) => (
                  <Card key={rec.job.id} interactive className="p-5 space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#28C5D8]/20 to-[#367BF5]/20 border border-[#28C5D8]/30 text-[#101B35] dark:text-[#28C5D8] font-extrabold text-xs flex items-center justify-center shrink-0">
                          {(rec.job.company?.name || 'TA').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/candidate/jobs/${rec.job.id}`}
                            className="text-base font-extrabold text-[#101B35] dark:text-white hover:text-[#367BF5] dark:hover:text-[#28C5D8] transition-colors block truncate"
                          >
                            {rec.job.title}
                          </Link>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                              <Building2 className="w-3 h-3 text-[#367BF5]" />
                              {rec.job.company?.name}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {rec.job.location} ({rec.job.workMode})
                            </span>
                            <span className="font-mono font-bold text-[#367BF5] dark:text-[#28C5D8]">
                              {formatSalaryRange(
                                rec.job.salaryMin,
                                rec.job.salaryMax,
                                rec.job.salaryCurrency
                              )}
                            </span>
                          </p>
                        </div>
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

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {rec.reason}
                    </p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Upcoming Interviews & Recent Applications */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-[#101B35] dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#367BF5]" />
                    Upcoming Interviews
                  </h3>
                  <Link
                    href="/candidate/applications"
                    className="text-xs font-bold text-[#367BF5] dark:text-[#28C5D8] hover:underline"
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
                        className="p-4 rounded-xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.07] space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-[#101B35] dark:text-white">
                            {iv.title}
                          </span>
                          <StatusBadge status={iv.status} />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {iv.job?.title} — {iv.job?.company?.name}
                        </p>
                        <p className="text-xs font-mono font-bold text-[#367BF5] dark:text-[#28C5D8]">
                          {formatDateTime(iv.scheduledAt)} • {iv.type}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-[#101B35] dark:text-white flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-[#28C5D8]" />
                    Recent Applications
                  </h3>
                  <Link
                    href="/candidate/applications"
                    className="text-xs font-bold text-[#367BF5] dark:text-[#28C5D8] hover:underline"
                  >
                    View All
                  </Link>
                </div>
                {data.recentApplications.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">
                    You haven&apos;t applied to any positions yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-white/[0.07]">
                    {data.recentApplications.map((app: any) => (
                      <div
                        key={app.id}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#101B35] dark:text-white truncate">
                            {app.job?.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
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
