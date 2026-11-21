'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  LayoutGrid,
  List,
  Download,
  Calendar,
  FileText,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  Textarea,
  Modal,
  ScoreBadge,
  StatusBadge,
  PageLoader,
  EmptyState,
} from '@/components/ui/primitives';
import { apiFetch, getStoredToken } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';
import { formatDate } from '@/lib/utils';

const KANBAN_COLUMNS = [
  { key: 'SUBMITTED', label: 'Submitted', dot: 'bg-slate-400' },
  { key: 'UNDER_REVIEW', label: 'Under Review', dot: 'bg-[#367BF5]' },
  { key: 'SHORTLISTED', label: 'Shortlisted', dot: 'bg-[#28C5D8]' },
  { key: 'INTERVIEW_SCHEDULED', label: 'Interview', dot: 'bg-indigo-500' },
  { key: 'OFFERED', label: 'Offered', dot: 'bg-emerald-500' },
  { key: 'HIRED', label: 'Hired', dot: 'bg-emerald-600' },
  { key: 'REJECTED', label: 'Rejected', dot: 'bg-rose-500' },
];

function RecruiterApplicationsContent() {
  const searchParams = useSearchParams();
  const toast = useToast();

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [applications, setApplications] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobFilter, setJobFilter] = useState(searchParams.get('jobId') || '');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('score_desc');
  const [loading, setLoading] = useState(true);

  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [statusInput, setStatusInput] = useState('SHORTLISTED');
  const [privateNotes, setPrivateNotes] = useState('');
  const [candidateFeedback, setCandidateFeedback] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const [scheduleApp, setScheduleApp] = useState<any | null>(null);
  const [ivForm, setIvForm] = useState({
    title: 'Technical & Culture Alignment Interview',
    type: 'TECHNICAL',
    scheduledAt: '',
    durationMinutes: 45,
    meetingLink: 'https://meet.talentai.demo/interview-room',
    instructions: 'Please be prepared to discuss relevant projects and technical trade-offs.',
    interviewersText: 'Hiring Lead',
  });

  const [msgTarget, setMsgTarget] = useState<any | null>(null);
  const [msgBody, setMsgBody] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (jobFilter) p.set('jobId', jobFilter);
      if (search) p.set('q', search);
      p.set('sort', sort);

      const [appsRes, jobsRes] = await Promise.all([
        apiFetch(`/api/applications?${p.toString()}`),
        apiFetch('/api/jobs?mine=1&limit=50'),
      ]);
      setApplications(appsRes.applications || []);
      setJobs(jobsRes.jobs || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [jobFilter, search, sort, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openApplicantModal = (app: any) => {
    setSelectedApp(app);
    setStatusInput(app.status);
    setPrivateNotes(app.privateNotes || '');
    setCandidateFeedback(app.candidateFeedback || '');
    setRejectionReason(app.rejectionReason || '');
  };

  const handleSaveApplicantDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setSavingStatus(true);
    try {
      await apiFetch(`/api/applications/${selectedApp.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: statusInput,
          privateNotes,
          candidateFeedback,
          rejectionReason: statusInput === 'REJECTED' ? rejectionReason : undefined,
        }),
      });
      toast.success('Application pipeline updated!');
      setSelectedApp(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleApp) return;
    try {
      await apiFetch('/api/interviews', {
        method: 'POST',
        body: JSON.stringify({
          applicationId: scheduleApp.id,
          title: ivForm.title,
          type: ivForm.type,
          scheduledAt: ivForm.scheduledAt,
          durationMinutes: Number(ivForm.durationMinutes),
          meetingLink: ivForm.meetingLink,
          instructions: ivForm.instructions,
          interviewers: ivForm.interviewersText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      toast.success('Interview scheduled and candidate notified!');
      setScheduleApp(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgTarget || !msgBody.trim()) return;
    try {
      await apiFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          recipientUserId: msgTarget.candidateProfile.user.id,
          jobId: msgTarget.job.id,
          subject: `${msgTarget.job.title} — Recruitment Follow-up`,
          content: msgBody,
        }),
      });
      toast.success('Message delivered to candidate!');
      setMsgTarget(null);
      setMsgBody('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleExportCsv = async () => {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch('/api/applications?format=csv', {
      headers,
      credentials: 'include',
    });
    const csvText = await res.text();
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'talentai-candidates-export.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported candidate list to CSV!');
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="w-60">
            <Input
              placeholder="Search candidate or job..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-56">
            <Select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
              <option value="">All Company Jobs</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-48">
            <Select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="score_desc">Sort: Highest AI Match</option>
              <option value="recent">Sort: Most Recent</option>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'kanban' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="w-4 h-4" /> Kanban
          </Button>
          <Button
            variant={viewMode === 'table' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <List className="w-4 h-4" /> Table
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </Card>

      {loading ? (
        <PageLoader label="Loading recruitment pipeline..." />
      ) : applications.length === 0 ? (
        <EmptyState
          title="No applications match your filters"
          description="Clear search filters or publish new job opportunities."
        />
      ) : viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => {
            const colApps = applications.filter((a) =>
              col.key === 'INTERVIEW_SCHEDULED'
                ? ['INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED'].includes(a.status)
                : a.status === col.key
            );
            return (
              <div
                key={col.key}
                className="w-72 shrink-0 rounded-2xl bg-slate-100/80 dark:bg-[#0B1325]/90 border border-slate-200/80 dark:border-white/[0.08] p-3.5 space-y-3"
              >
                <div className="flex items-center justify-between px-1.5 py-0.5">
                  <h3 className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    {col.label}
                  </h3>
                  <Badge variant="default">{colApps.length}</Badge>
                </div>

                <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-0.5">
                  {colApps.map((app) => {
                    const score =
                      app.matchResult?.recruiterOverrideScore ??
                      app.matchResult?.overallScore ??
                      0;
                    return (
                      <Card
                        key={app.id}
                        interactive
                        className="p-4 space-y-2.5 cursor-pointer"
                        onClick={() => openApplicantModal(app)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-[#101B35] dark:text-white">
                              {app.candidateProfile.user.firstName}{' '}
                              {app.candidateProfile.user.lastName}
                            </p>
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {app.job.title}
                            </p>
                          </div>
                          {score > 0 && <ScoreBadge score={score} />}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {app.matchResult?.matchingSkills?.slice(0, 3).map((s: string) => (
                            <Badge key={s} variant="electric">
                              {s}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                          <span>{formatDate(app.appliedAt)}</span>
                          <span className="text-[#367BF5] font-semibold">Inspect →</span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Candidate</th>
                <th className="px-5 py-3.5">Job Title</th>
                <th className="px-5 py-3.5">AI Match</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Applied</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {applications.map((app) => {
                const score =
                  app.matchResult?.recruiterOverrideScore ??
                  app.matchResult?.overallScore ??
                  0;
                return (
                  <tr key={app.id}>
                    <td className="px-5 py-4 font-semibold">
                      {app.candidateProfile.user.firstName}{' '}
                      {app.candidateProfile.user.lastName}
                      <p className="text-xs font-normal text-slate-500">
                        {app.candidateProfile.user.email}
                      </p>
                    </td>
                    <td className="px-5 py-4">{app.job.title}</td>
                    <td className="px-5 py-4">
                      {score > 0 ? <ScoreBadge score={score} /> : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {formatDate(app.appliedAt)}
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openApplicantModal(app)}
                      >
                        Review
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setScheduleApp(app)}
                      >
                        <Calendar className="w-3.5 h-3.5" /> Interview
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Applicant Detail & Decision Modal */}
      <Modal
        open={Boolean(selectedApp)}
        onClose={() => setSelectedApp(null)}
        title={`Applicant Review — ${selectedApp?.candidateProfile?.user?.firstName || ''} ${
          selectedApp?.candidateProfile?.user?.lastName || ''
        }`}
        maxWidth="max-w-3xl"
      >
        {selectedApp && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60">
              <div>
                <p className="text-sm font-bold">{selectedApp.job.title}</p>
                <p className="text-xs text-slate-500">
                  {selectedApp.candidateProfile.headline} •{' '}
                  {selectedApp.candidateProfile.yearsOfExperience} yrs exp
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedApp.candidateProfile.cvDocuments?.[0] && (
                  <a
                    href={`/api/candidates/cv/${selectedApp.candidateProfile.cvDocuments[0].id}?download=1`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <FileText className="w-3.5 h-3.5" /> View CV
                    </Button>
                  </a>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = selectedApp;
                    setSelectedApp(null);
                    setScheduleApp(target);
                  }}
                >
                  <Calendar className="w-3.5 h-3.5" /> Schedule Interview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = selectedApp;
                    setSelectedApp(null);
                    setMsgTarget(target);
                  }}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Message
                </Button>
              </div>
            </div>

            {selectedApp.matchResult && (
              <div className="p-4 rounded-xl border border-[#367BF5]/30 bg-[#367BF5]/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-[#367BF5] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> AI Compatibility Analysis
                  </span>
                  <ScoreBadge
                    score={
                      selectedApp.matchResult.recruiterOverrideScore ??
                      selectedApp.matchResult.overallScore
                    }
                  />
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  {selectedApp.matchResult.explanation}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedApp.matchResult.matchingSkills?.map((s: string) => (
                    <Badge key={s} variant="success">
                      ✓ {s}
                    </Badge>
                  ))}
                  {selectedApp.matchResult.missingSkills?.map((s: string) => (
                    <Badge key={s} variant="warning">
                      Missing: {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedApp.coverLetter && (
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase text-slate-500">Cover Letter</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                  {selectedApp.coverLetter}
                </p>
              </div>
            )}

            <form onSubmit={handleSaveApplicantDecision} className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Select
                label="Update Pipeline Status"
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
              >
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="SHORTLISTED">Shortlisted</option>
                <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                <option value="INTERVIEW_COMPLETED">Interview Completed</option>
                <option value="OFFERED">Offered</option>
                <option value="HIRED">Hired</option>
                <option value="REJECTED">Rejected (Requires Documented Reason)</option>
              </Select>

              {statusInput === 'REJECTED' && (
                <Textarea
                  label="Documented Rejection Reason * (Shared Constructively)"
                  rows={2}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Document objective job-relevant reasons..."
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Textarea
                  label="Private Recruiter Notes (Internal Only)"
                  rows={3}
                  value={privateNotes}
                  onChange={(e) => setPrivateNotes(e.target.value)}
                />
                <Textarea
                  label="Feedback Visible to Candidate"
                  rows={3}
                  value={candidateFeedback}
                  onChange={(e) => setCandidateFeedback(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedApp(null)}
                >
                  Close
                </Button>
                <Button type="submit" loading={savingStatus}>
                  Save Status &amp; Notes
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Schedule Interview Modal */}
      <Modal
        open={Boolean(scheduleApp)}
        onClose={() => setScheduleApp(null)}
        title={`Schedule Interview — ${scheduleApp?.candidateProfile?.user?.firstName || ''}`}
      >
        <form onSubmit={handleScheduleInterview} className="space-y-4">
          <Input
            label="Interview Title *"
            required
            value={ivForm.title}
            onChange={(e) => setIvForm({ ...ivForm, title: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Interview Type"
              value={ivForm.type}
              onChange={(e) => setIvForm({ ...ivForm, type: e.target.value })}
            >
              <option value="ONLINE">Online</option>
              <option value="TECHNICAL">Technical</option>
              <option value="HR">HR</option>
              <option value="IN_PERSON">In-Person</option>
              <option value="FINAL">Final Interview</option>
            </Select>
            <Input
              label="Date & Time *"
              type="datetime-local"
              required
              value={ivForm.scheduledAt}
              onChange={(e) => setIvForm({ ...ivForm, scheduledAt: e.target.value })}
            />
            <Input
              label="Duration (min)"
              type="number"
              value={ivForm.durationMinutes}
              onChange={(e) =>
                setIvForm({ ...ivForm, durationMinutes: Number(e.target.value) })
              }
            />
          </div>
          <Input
            label="Meeting Link or Office Location"
            value={ivForm.meetingLink}
            onChange={(e) => setIvForm({ ...ivForm, meetingLink: e.target.value })}
          />
          <Input
            label="Interviewers (comma-separated)"
            value={ivForm.interviewersText}
            onChange={(e) => setIvForm({ ...ivForm, interviewersText: e.target.value })}
          />
          <Textarea
            label="Candidate Preparation Instructions"
            rows={3}
            value={ivForm.instructions}
            onChange={(e) => setIvForm({ ...ivForm, instructions: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setScheduleApp(null)}>
              Cancel
            </Button>
            <Button type="submit">Send Interview Invitation</Button>
          </div>
        </form>
      </Modal>

      {/* Direct Message Modal */}
      <Modal
        open={Boolean(msgTarget)}
        onClose={() => setMsgTarget(null)}
        title={`Message ${msgTarget?.candidateProfile?.user?.firstName || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSendMessage} className="space-y-4">
          <Textarea
            label="Message *"
            rows={4}
            required
            value={msgBody}
            onChange={(e) => setMsgBody(e.target.value)}
            placeholder="Write a message to the candidate..."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setMsgTarget(null)}>
              Cancel
            </Button>
            <Button type="submit">Send Message</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function RecruiterApplicationsPage() {
  return (
    <DashboardShell
      role="RECRUITER"
      title="Applications & Recruitment Pipeline"
      subtitle="Evaluate applicants, review CVs & AI compatibility, manage Kanban stages, and schedule interviews"
    >
      <Suspense fallback={<PageLoader />}>
        <RecruiterApplicationsContent />
      </Suspense>
    </DashboardShell>
  );
}
