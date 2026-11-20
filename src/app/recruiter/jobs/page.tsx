'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  PlusCircle,
  Edit3,
  PauseCircle,
  PlayCircle,
  XCircle,
  Trash2,
  Eye,
  Users,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  Badge,
  StatusBadge,
  PageLoader,
  EmptyState,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';
import { formatDate, formatSalaryRange } from '@/lib/utils';

export default function RecruiterJobsPage() {
  const toast = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch('/api/jobs?mine=1&limit=50');
      setJobs(d.jobs || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const updateJobStatus = async (jobId: string, status: string) => {
    try {
      await apiFetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      toast.success(`Job status changed to ${status}.`);
      await loadJobs();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      await apiFetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      toast.info('Job advertisement deleted.');
      await loadJobs();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <DashboardShell
      role="RECRUITER"
      title="Job Management"
      subtitle="Publish, pause, close, edit, and monitor applicant traffic across all company advertisements"
      actions={
        <Link href="/recruiter/jobs/new">
          <Button size="sm">
            <PlusCircle className="w-4 h-4" /> Create New Job
          </Button>
        </Link>
      }
    >
      {loading ? (
        <PageLoader />
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No job advertisements created yet"
          description="Use our AI Job Description Generator to publish your first position."
          action={
            <Link href="/recruiter/jobs/new">
              <Button>Create First Job</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id} className="p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={job.status} />
                    <Badge variant="electric">{job.workMode}</Badge>
                    <Badge variant="default">
                      {job.employmentType.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      Created {formatDate(job.createdAt)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#101B35] dark:text-white">
                    {job.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {job.location} •{' '}
                    {formatSalaryRange(
                      job.salaryMin,
                      job.salaryMax,
                      job.salaryCurrency
                    )}
                  </p>
                  {job.moderationNote && (
                    <p className="text-xs text-rose-600 font-semibold">
                      Admin Moderation Note: {job.moderationNote}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <Eye className="w-3.5 h-3.5 text-[#367BF5]" /> {job.viewsCount} Views
                  </span>
                  <Link
                    href={`/recruiter/applications?jobId=${job.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#367BF5]/10 text-[#367BF5]"
                  >
                    <Users className="w-3.5 h-3.5" /> {job._count?.applications || 0}{' '}
                    Applicants
                  </Link>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {job.skills?.slice(0, 6).map((js: any) => (
                    <Badge key={js.id} variant="default">
                      {js.skill.name}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/recruiter/jobs/${job.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </Button>
                  </Link>
                  {job.status !== 'PUBLISHED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateJobStatus(job.id, 'PUBLISHED')}
                    >
                      <PlayCircle className="w-3.5 h-3.5 text-emerald-500" /> Publish
                    </Button>
                  )}
                  {job.status === 'PUBLISHED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateJobStatus(job.id, 'PAUSED')}
                    >
                      <PauseCircle className="w-3.5 h-3.5 text-amber-500" /> Pause
                    </Button>
                  )}
                  {job.status !== 'CLOSED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateJobStatus(job.id, 'CLOSED')}
                    >
                      <XCircle className="w-3.5 h-3.5 text-slate-500" /> Close
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteJob(job.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
