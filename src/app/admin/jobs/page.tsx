'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  StatusBadge,
  Textarea,
  Modal,
  PageLoader,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';
import { formatDate } from '@/lib/utils';

export default function AdminJobsModerationPage() {
  const toast = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [moderationNote, setModerationNote] = useState('');
  const [targetStatus, setTargetStatus] = useState<'MODERATION_HOLD' | 'PUBLISHED' | 'CLOSED'>('MODERATION_HOLD');

  const load = () => {
    setLoading(true);
    apiFetch('/api/admin/jobs')
      .then((d) => setJobs(d.jobs || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const submitModeration = async () => {
    if (!selectedJob) return;
    await apiFetch('/api/admin/jobs', {
      method: 'PUT',
      body: JSON.stringify({
        jobId: selectedJob.id,
        status: targetStatus,
        moderationNote,
      }),
    });
    toast.success(`Job status updated to ${targetStatus}.`);
    setSelectedJob(null);
    setModerationNote('');
    load();
  };

  return (
    <DashboardShell
      role="ADMIN"
      title="Job Moderation"
      subtitle="Audit published job listings, place non-compliant postings on moderation hold, or restore verified roles"
    >
      {loading ? (
        <PageLoader />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Job Title</th>
                <th className="px-5 py-3.5">Company</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Applications</th>
                <th className="px-5 py-3.5">Published</th>
                <th className="px-5 py-3.5 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className="px-5 py-4">
                    <p className="font-bold text-[#101B35] dark:text-white">{j.title}</p>
                    {j.moderationNote && (
                      <p className="text-xs text-rose-500 mt-0.5">
                        Note: {j.moderationNote}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs">{j.company?.name}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={j.status} />
                  </td>
                  <td className="px-5 py-4 font-mono font-bold">
                    {j._count?.applications || 0}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {formatDate(j.publishedAt || j.createdAt)}
                  </td>
                  <td className="px-5 py-4 text-right space-x-2">
                    {j.status !== 'MODERATION_HOLD' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedJob(j);
                          setTargetStatus('MODERATION_HOLD');
                        }}
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Hold
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedJob(j);
                          setTargetStatus('PUBLISHED');
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Restore
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={Boolean(selectedJob)}
        onClose={() => setSelectedJob(null)}
        title={`Moderate Job: ${selectedJob?.title || ''}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Setting job status to <strong>{targetStatus}</strong>. This action will be
            recorded in the Audit Log and sent to the recruiter.
          </p>
          <Textarea
            label="Moderation Reason / Policy Note"
            value={moderationNote}
            onChange={(e) => setModerationNote(e.target.value)}
            placeholder="Document reason for moderation action..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedJob(null)}>
              Cancel
            </Button>
            <Button onClick={submitModeration}>Confirm Action</Button>
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}
