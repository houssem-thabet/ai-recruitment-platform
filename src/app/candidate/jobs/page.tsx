'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Bookmark, Briefcase, X } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { JobBoardView } from '@/components/jobs/JobBoardView';
import {
  Button,
  Card,
  Badge,
  ScoreBadge,
  EmptyState,
  PageLoader,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';
import { formatSalaryRange } from '@/lib/utils';

export default function CandidateJobsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'search' | 'recommended' | 'saved'>('search');
  const [recs, setRecs] = useState<any[]>([]);
  const [dismissedCount, setDismissedCount] = useState(0);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loadingTab, setLoadingTab] = useState(false);

  useEffect(() => {
    if (tab === 'recommended') {
      setLoadingTab(true);
      apiFetch('/api/ai/recommendations')
        .then((d) => {
          setRecs(d.recommendations || []);
          setDismissedCount(d.dismissedCount || 0);
        })
        .finally(() => setLoadingTab(false));
    } else if (tab === 'saved') {
      setLoadingTab(true);
      apiFetch('/api/candidates/bookmarks')
        .then((d) => setBookmarks(d.bookmarks || []))
        .finally(() => setLoadingTab(false));
    }
  }, [tab]);

  const dismissRec = async (jobId: string) => {
    await apiFetch('/api/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({ dismissJobId: jobId }),
    });
    setRecs((prev) => prev.filter((r) => r.job.id !== jobId));
    setDismissedCount((c) => c + 1);
    toast.info('Recommendation dismissed.');
  };

  const restoreDismissed = async () => {
    await apiFetch('/api/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({ resetDismissed: true }),
    });
    const d = await apiFetch('/api/ai/recommendations');
    setRecs(d.recommendations || []);
    setDismissedCount(0);
    toast.success('Dismissed recommendations restored.');
  };

  return (
    <DashboardShell
      role="CANDIDATE"
      title="Find Jobs & AI Recommendations"
      subtitle="Search all published jobs, inspect personalized AI recommendations, or manage your saved bookmarks"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <Button
          variant={tab === 'search' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setTab('search')}
        >
          <Briefcase className="w-4 h-4" /> All Open Jobs
        </Button>
        <Button
          variant={tab === 'recommended' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setTab('recommended')}
        >
          <Sparkles className="w-4 h-4" /> AI Recommended For Me
        </Button>
        <Button
          variant={tab === 'saved' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setTab('saved')}
        >
          <Bookmark className="w-4 h-4" /> Saved Bookmarks
        </Button>
      </div>

      {tab === 'search' && <JobBoardView detailBasePath="/candidate/jobs" />}

      {tab === 'recommended' && (
        <div className="space-y-4">
          {dismissedCount > 0 && (
            <div className="flex items-center justify-between text-xs bg-slate-100 dark:bg-slate-800/70 px-4 py-2.5 rounded-xl">
              <span>You dismissed {dismissedCount} recommendation(s).</span>
              <button
                onClick={restoreDismissed}
                className="font-bold text-[#367BF5] hover:underline"
              >
                Restore Dismissed
              </button>
            </div>
          )}

          {loadingTab ? (
            <PageLoader label="Ranking personalized opportunities..." />
          ) : recs.length === 0 ? (
            <EmptyState
              title="No active recommendations"
              description="Update your skills and preferences in My Profile to refresh AI matches."
            />
          ) : (
            recs.map((r) => (
              <Card key={r.job.id} className="p-6 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/candidate/jobs/${r.job.id}`}
                      className="text-lg font-bold text-[#101B35] dark:text-white hover:text-[#367BF5]"
                    >
                      {r.job.title}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {r.job.company?.name} • {r.job.location} ({r.job.workMode}) •{' '}
                      {formatSalaryRange(
                        r.job.salaryMin,
                        r.job.salaryMax,
                        r.job.salaryCurrency
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ScoreBadge score={r.score} />
                    <button
                      onClick={() => dismissRec(r.job.id)}
                      title="Dismiss recommendation"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {r.whyRecommended?.map((reason: string, idx: number) => (
                    <Badge key={idx} variant="cyan">
                      ★ {reason}
                    </Badge>
                  ))}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300">{r.explanation}</p>

                <div className="flex justify-end">
                  <Link href={`/candidate/jobs/${r.job.id}`}>
                    <Button size="sm">Inspect &amp; Apply</Button>
                  </Link>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'saved' && (
        <div className="space-y-4">
          {loadingTab ? (
            <PageLoader />
          ) : bookmarks.length === 0 ? (
            <EmptyState
              icon={<Bookmark className="w-6 h-6" />}
              title="No bookmarked jobs"
              description="Click the bookmark icon on any job card to save it for later."
            />
          ) : (
            bookmarks.map((b) => (
              <Card
                key={b.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <Link
                    href={`/candidate/jobs/${b.job.id}`}
                    className="text-base font-bold text-[#101B35] dark:text-white hover:text-[#367BF5]"
                  >
                    {b.job.title}
                  </Link>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {b.job.company?.name} • {b.job.location}
                  </p>
                </div>
                <Link href={`/candidate/jobs/${b.job.id}`}>
                  <Button size="sm">Open Job</Button>
                </Link>
              </Card>
            ))
          )}
        </div>
      )}
    </DashboardShell>
  );
}
