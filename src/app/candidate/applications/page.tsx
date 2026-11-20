'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Calendar,
  Check,
  Clock,
  MessageSquare,
  XCircle,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  Select,
  StatusBadge,
  Modal,
  Input,
  Textarea,
  PageLoader,
  EmptyState,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';
import { formatDate, formatDateTime } from '@/lib/utils';

export default function CandidateApplicationsPage() {
  const toast = useToast();
  const [applications, setApplications] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [rescheduleModal, setRescheduleModal] = useState<any | null>(null);
  const [proposedTime, setProposedTime] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');

  const [messageModal, setMessageModal] = useState<any | null>(null);
  const [msgText, setMsgText] = useState('');

  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : '';
      const data = await apiFetch(`/api/applications${qs}`);
      setApplications(data.applications || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  const handleWithdraw = async (appId: string) => {
    try {
      await apiFetch(`/api/applications/${appId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'WITHDRAWN' }),
      });
      toast.info('Application withdrawn.');
      await loadApps();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAcceptInterview = async (interviewId: string) => {
    try {
      await apiFetch(`/api/interviews/${interviewId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'ACCEPTED' }),
      });
      toast.success('Interview invitation accepted!');
      await loadApps();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRequestReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleModal) return;
    try {
      await apiFetch(`/api/interviews/${rescheduleModal.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'RESCHEDULE_REQUESTED',
          proposedNewTime: proposedTime || undefined,
          rescheduleNote,
        }),
      });
      toast.success('Reschedule request sent to recruiter.');
      setRescheduleModal(null);
      setRescheduleNote('');
      await loadApps();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSendRecruiterMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageModal || !msgText.trim()) return;
    try {
      await apiFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          recipientUserId: messageModal.job.recruiter.userId,
          jobId: messageModal.job.id,
          subject: `Application Inquiry: ${messageModal.job.title}`,
          content: msgText,
        }),
      });
      toast.success('Message sent to recruiter!');
      setMessageModal(null);
      setMsgText('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <DashboardShell
      role="CANDIDATE"
      title="My Applications & Interview Invitations"
      subtitle="Track every stage of your applications, read recruiter feedback, and respond to interview invitations"
      actions={
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-48"
        >
          <option value="">All Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="SHORTLISTED">Shortlisted</option>
          <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
          <option value="INTERVIEW_COMPLETED">Interview Completed</option>
          <option value="OFFERED">Offered</option>
          <option value="HIRED">Hired</option>
          <option value="REJECTED">Rejected</option>
          <option value="WITHDRAWN">Withdrawn</option>
        </Select>
      }
    >
      {loading ? (
        <PageLoader />
      ) : applications.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-6 h-6" />}
          title="No applications found"
          description="Explore open opportunities and submit your first application."
          action={
            <Link href="/candidate/jobs">
              <Button>Browse Open Jobs</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          {applications.map((app) => (
            <Card key={app.id} className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <Link
                    href={`/candidate/jobs/${app.job.id}`}
                    className="text-lg font-bold text-[#101B35] dark:text-white hover:text-[#367BF5]"
                  >
                    {app.job.title}
                  </Link>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {app.job.company?.name} • {app.job.location} • Applied{' '}
                    {formatDate(app.appliedAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={app.status} />
                  {app.job?.recruiter?.userId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMessageModal(app)}
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Message Recruiter
                    </Button>
                  )}
                  {!['WITHDRAWN', 'REJECTED', 'HIRED'].includes(app.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleWithdraw(app.id)}
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-500" /> Withdraw
                    </Button>
                  )}
                </div>
              </div>

              {(app.candidateFeedback || app.rejectionReason) && (
                <div className="p-3.5 rounded-xl bg-[#367BF5]/5 border border-[#367BF5]/20 text-xs space-y-1">
                  <p className="font-bold text-[#367BF5]">Recruiter Feedback:</p>
                  <p className="text-slate-700 dark:text-slate-200">
                    {app.candidateFeedback || app.rejectionReason}
                  </p>
                </div>
              )}

              {/* Scheduled Interviews for this Application */}
              {app.interviews?.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#367BF5]" />
                    Scheduled Interviews
                  </p>
                  {app.interviews.map((iv: any) => (
                    <div
                      key={iv.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#101B35] dark:text-white">
                            {iv.title}
                          </span>
                          <StatusBadge status={iv.status} />
                        </div>
                        <p className="text-[#367BF5] font-semibold">
                          {formatDateTime(iv.scheduledAt)} ({iv.durationMinutes} min •{' '}
                          {iv.type})
                        </p>
                        {iv.instructions && (
                          <p className="text-slate-600 dark:text-slate-300">
                            Instructions: {iv.instructions}
                          </p>
                        )}
                        {iv.meetingLink && (
                          <p className="text-slate-500">
                            Link/Venue: <span className="font-mono">{iv.meetingLink}</span>
                          </p>
                        )}
                      </div>

                      {['INVITED', 'RESCHEDULED'].includes(iv.status) && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptInterview(iv.id)}
                          >
                            <Check className="w-3.5 h-3.5" /> Accept Invitation
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRescheduleModal(iv)}
                          >
                            <Clock className="w-3.5 h-3.5" /> Request Reschedule
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Status History Timeline */}
              {Array.isArray(app.statusHistory) && app.statusHistory.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-bold uppercase text-slate-400 mb-2">
                    Application Timeline
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {app.statusHistory.map((h: any, idx: number) => (
                      <div
                        key={idx}
                        className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                      >
                        <span className="font-bold">{h.status.replace(/_/g, ' ')}</span> •{' '}
                        <span className="text-slate-500">{formatDate(h.changedAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Reschedule Request Modal */}
      <Modal
        open={Boolean(rescheduleModal)}
        onClose={() => setRescheduleModal(null)}
        title="Request Interview Reschedule"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRequestReschedule} className="space-y-4">
          <Input
            label="Proposed Alternative Date & Time"
            type="datetime-local"
            value={proposedTime}
            onChange={(e) => setProposedTime(e.target.value)}
          />
          <Textarea
            label="Reason / Availability Note *"
            rows={3}
            required
            value={rescheduleNote}
            onChange={(e) => setRescheduleNote(e.target.value)}
            placeholder="Share 2–3 convenient time windows..."
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRescheduleModal(null)}
            >
              Cancel
            </Button>
            <Button type="submit">Send Request</Button>
          </div>
        </form>
      </Modal>

      {/* Message Recruiter Modal */}
      <Modal
        open={Boolean(messageModal)}
        onClose={() => setMessageModal(null)}
        title={`Message Hiring Team — ${messageModal?.job?.title || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSendRecruiterMessage} className="space-y-4">
          <Textarea
            label="Message *"
            rows={4}
            required
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            placeholder="Write a polite follow-up or question regarding the position..."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setMessageModal(null)}>
              Cancel
            </Button>
            <Button type="submit">Send Message</Button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
