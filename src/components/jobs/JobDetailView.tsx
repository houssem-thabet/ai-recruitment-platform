'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Briefcase,
  CheckCircle2,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Send,
  AlertTriangle,
} from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  Textarea,
  PageLoader,
  ScoreBadge,
  AIModeBadge,
  StatusBadge,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { formatDate, formatSalaryRange } from '@/lib/utils';

export function JobDetailView({ jobId }: { jobId: string }) {
  const { user } = useAuth();
  const toast = useToast();

  const [job, setJob] = useState<any>(null);
  const [candidateState, setCandidateState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/jobs/${jobId}`)
      .then((d) => {
        setJob(d.job);
        setCandidateState(d.candidateState);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [jobId, toast]);

  const handleBookmark = async () => {
    if (!user || user.role !== 'CANDIDATE') {
      toast.info('Please sign in as a Candidate to bookmark jobs.');
      return;
    }
    try {
      const res = await apiFetch('/api/candidates/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ jobId: job.id }),
      });
      setCandidateState((prev: any) => ({ ...prev, isBookmarked: res.bookmarked }));
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/applications', {
        method: 'POST',
        body: JSON.stringify({
          jobId: job.id,
          coverLetter,
        }),
      });
      setCandidateState((prev: any) => ({ ...prev, application: res.application }));
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err.message || 'Unable to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader label="Loading job details..." />;
  if (!job) {
    return (
      <Card className="p-8 text-center">
        <p className="font-bold">Job advertisement not found.</p>
      </Card>
    );
  }

  const match = candidateState?.matchPreview;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-6">
        <Card className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="electric">{job.workMode}</Badge>
              <Badge variant="default">{job.employmentType.replace('_', ' ')}</Badge>
              <Badge variant="cyan">{job.experienceLevel}</Badge>
              {job.aiGenerated && (
                <Badge variant="purple">AI-Assisted &amp; Recruiter Verified</Badge>
              )}
            </div>
            <button
              onClick={handleBookmark}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#367BF5]"
            >
              {candidateState?.isBookmarked ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-[#367BF5]" /> Saved
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" /> Save Job
                </>
              )}
            </button>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101B35] dark:text-white">
            {job.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Building2 className="w-4 h-4 text-[#367BF5]" />
              {job.company?.name}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {job.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <Briefcase className="w-4 h-4" /> {job.minYearsExperience}+ years experience
            </span>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs text-slate-500">Compensation Range</p>
              <p className="text-lg font-extrabold text-[#367BF5]">
                {formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency)}
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Published {formatDate(job.publishedAt)} •{' '}
              {job.deadline ? `Apply before ${formatDate(job.deadline)}` : 'Open rolling review'}
            </div>
          </div>
        </Card>

        <Card className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[#101B35] dark:text-white mb-2">
              Role Overview
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {job.description}
            </p>
          </div>

          {job.responsibilities?.length > 0 && (
            <div>
              <h3 className="text-base font-bold text-[#101B35] dark:text-white mb-2.5">
                Key Responsibilities
              </h3>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {job.responsibilities.map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#367BF5] shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {job.qualifications?.length > 0 && (
            <div>
              <h3 className="text-base font-bold text-[#101B35] dark:text-white mb-2.5">
                Required Qualifications
              </h3>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {job.qualifications.map((q: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#28C5D8] shrink-0 mt-0.5" />
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="text-base font-bold text-[#101B35] dark:text-white mb-2.5">
              Required Technical &amp; Professional Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {job.skills?.map((js: any) => (
                <Badge key={js.id} variant="electric">
                  {js.skill.name}
                </Badge>
              ))}
              {job.softSkills?.map((ss: string) => (
                <Badge key={ss} variant="default">
                  {ss}
                </Badge>
              ))}
            </div>
          </div>

          {job.benefits?.length > 0 && (
            <div>
              <h3 className="text-base font-bold text-[#101B35] dark:text-white mb-2.5">
                Benefits &amp; Culture
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-300">
                {job.benefits.map((b: string, i: number) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#367BF5]" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* Right Column: AI Compatibility Preview + Application Submission */}
      <div className="lg:col-span-4 space-y-6">
        {match && (
          <Card className="p-6 space-y-4 border-t-4 border-t-[#367BF5]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-bold text-[#101B35] dark:text-white">
                <Sparkles className="w-4 h-4 text-[#367BF5]" />
                Your AI Compatibility
              </div>
              <ScoreBadge score={match.overallScore} />
            </div>

            <AIModeBadge mode={match.aiMode} />

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {match.explanation}
            </p>

            {match.matchingSkills?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">
                  Matching Skills ({match.matchingSkills.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {match.matchingSkills.map((s: string) => (
                    <Badge key={s} variant="success">
                      ✓ {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {match.missingSkills?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
                  Missing Skills ({match.missingSkills.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {match.missingSkills.map((s: string) => (
                    <Badge key={s} variant="warning">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>
                Decision-support estimate only. You can apply regardless of score — every
                application is reviewed by a human recruiter.
              </span>
            </div>
          </Card>
        )}

        {/* Application Card */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-bold text-[#101B35] dark:text-white">
            Apply for this Position
          </h3>

          {!user ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Sign in or create a free Candidate account to submit your CV and view your
                compatibility breakdown.
              </p>
              <Link href={`/login?redirect=/jobs/${job.id}`} className="block">
                <Button className="w-full">Sign In to Apply</Button>
              </Link>
              <Link href="/register?type=CANDIDATE" className="block">
                <Button variant="outline" className="w-full">
                  Create Candidate Account
                </Button>
              </Link>
            </div>
          ) : user.role !== 'CANDIDATE' ? (
            <p className="text-xs text-slate-500">
              Signed in as <strong>{user.role}</strong>. Switch to a Candidate account to
              submit job applications.
            </p>
          ) : candidateState?.application ? (
            <div className="space-y-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Application Submitted
                </span>
                <StatusBadge status={candidateState.application.status} />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Submitted on {formatDate(candidateState.application.appliedAt)}. Track updates
                in your Candidate Dashboard.
              </p>
              <Link href="/candidate/applications" className="block">
                <Button variant="outline" size="sm" className="w-full">
                  Track Application Status
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleApply} className="space-y-4">
              <Textarea
                label="Cover Letter / Pitch (Optional)"
                rows={4}
                placeholder="Highlight relevant projects, motivation, and availability..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
              <Button type="submit" loading={submitting} className="w-full">
                <Send className="w-4 h-4" /> Submit Application
              </Button>
              <p className="text-[11px] text-slate-500">
                Your primary uploaded CV and authorized profile will be shared with{' '}
                {job.company?.name}.
              </p>
            </form>
          )}
        </Card>

        {/* Company Snapshot */}
        <Card className="p-6 space-y-2.5">
          <h4 className="text-sm font-bold text-[#101B35] dark:text-white">
            About {job.company?.name}
          </h4>
          <p className="text-xs text-[#367BF5] font-semibold">
            {job.company?.industry} • {job.company?.size} employees
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {job.company?.description}
          </p>
        </Card>
      </div>
    </div>
  );
}
