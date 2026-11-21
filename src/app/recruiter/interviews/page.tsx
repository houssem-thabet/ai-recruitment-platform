'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  Sparkles,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  ShieldAlert,
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
  StatusBadge,
  AIModeBadge,
  PageLoader,
  EmptyState,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';
import { formatDateTime } from '@/lib/utils';

export default function RecruiterInterviewsPage() {
  const toast = useToast();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Question Generator Modal
  const [questionTarget, setQuestionTarget] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  // Consent-Gated AI Interview Evaluation Modal
  const [evalTarget, setEvalTarget] = useState<any | null>(null);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [rawNotes, setRawNotes] = useState('');
  const [humanRecommendation, setHumanRecommendation] = useState('YES');
  const [evalResult, setEvalResult] = useState<any | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  // Reschedule Modal
  const [rescheduleTarget, setRescheduleTarget] = useState<any | null>(null);
  const [newTime, setNewTime] = useState('');

  const loadInterviews = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch('/api/interviews');
      setInterviews(d.interviews || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  const handleGenerateQuestions = async (interview: any) => {
    setQuestionTarget(interview);
    if (Array.isArray(interview.generatedQuestions) && interview.generatedQuestions.length > 0) {
      setQuestions(interview.generatedQuestions);
      return;
    }
    setGeneratingQuestions(true);
    try {
      const res = await apiFetch('/api/ai/generate-interview-questions', {
        method: 'POST',
        body: JSON.stringify({
          interviewId: interview.id,
          saveToInterview: true,
        }),
      });
      setQuestions(res.questions || []);
      toast.success('Structured interview rubric generated & saved!');
      await loadInterviews();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handleSaveCustomQuestions = async () => {
    if (!questionTarget) return;
    try {
      await apiFetch(`/api/interviews/${questionTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({ generatedQuestions: questions }),
      });
      toast.success('Customized interview questions saved!');
      setQuestionTarget(null);
      await loadInterviews();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openEvaluationWorkspace = (interview: any) => {
    setEvalTarget(interview);
    setEvalResult(interview.evaluation || null);
    setRawNotes(interview.evaluation?.rawNotes || '');
    setConsentConfirmed(Boolean(interview.evaluation?.consentConfirmed));
    setHumanRecommendation(interview.evaluation?.humanRecommendation || 'YES');
  };

  const handleRunEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalTarget) return;
    setEvaluating(true);
    try {
      const res = await apiFetch('/api/ai/evaluate-interview', {
        method: 'POST',
        body: JSON.stringify({
          interviewId: evalTarget.id,
          consentConfirmed,
          rawNotes,
          humanRecommendation,
        }),
      });
      setEvalResult(res.evaluation);
      toast.success('Interview notes organized and structured evaluation saved!');
      await loadInterviews();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEvaluating(false);
    }
  };

  const updateInterviewStatus = async (id: string, status: string, scheduledAt?: string) => {
    try {
      await apiFetch(`/api/interviews/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          ...(scheduledAt ? { scheduledAt } : {}),
        }),
      });
      toast.success(`Interview updated (${status}).`);
      setRescheduleTarget(null);
      await loadInterviews();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <DashboardShell
      role="RECRUITER"
      title="Interviews, AI Question Rubrics & Note Evaluation"
      subtitle="Manage interview calendar, generate structured competency questions, and organize consented interview notes"
    >
      {loading ? (
        <PageLoader />
      ) : interviews.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-6 h-6" />}
          title="No interviews scheduled yet"
          description="Schedule an interview from any candidate card inside Applications."
        />
      ) : (
        <div className="space-y-4">
          {interviews.map((iv) => (
            <Card key={iv.id} className="p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={iv.status} />
                    <Badge variant="electric">{iv.type}</Badge>
                    <span className="text-xs font-semibold text-[#367BF5]">
                      {formatDateTime(iv.scheduledAt)} ({iv.durationMinutes} min)
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#101B35] dark:text-white">
                    {iv.title} — {iv.candidateProfile?.user?.firstName}{' '}
                    {iv.candidateProfile?.user?.lastName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Role: {iv.job?.title} • Interviewers:{' '}
                    {(iv.interviewers || []).join(', ') || 'Hiring Lead'}
                  </p>
                  {iv.rescheduleNote && (
                    <p className="text-xs font-semibold text-amber-600">
                      Candidate Reschedule Request: &ldquo;{iv.rescheduleNote}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateQuestions(iv)}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#367BF5]" /> AI Questions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEvaluationWorkspace(iv)}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-[#28C5D8]" /> AI Note Eval
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRescheduleTarget(iv)}
                  >
                    Reschedule
                  </Button>
                  {iv.status !== 'COMPLETED' && iv.status !== 'CANCELLED' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateInterviewStatus(iv.id, 'COMPLETED')}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Complete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateInterviewStatus(iv.id, 'CANCELLED')}
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-500" /> Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* AI Interview Question Generator Modal */}
      <Modal
        open={Boolean(questionTarget)}
        onClose={() => setQuestionTarget(null)}
        title={`AI Interview Question Rubric — ${questionTarget?.job?.title || ''}`}
        maxWidth="max-w-3xl"
      >
        {generatingQuestions ? (
          <PageLoader label="Generating structured technical & behavioral questions..." />
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="electric">{q.category}</Badge>
                  <span className="text-xs font-semibold text-slate-500">
                    Assesses: {q.skillAssessed}
                  </span>
                </div>
                <Textarea
                  rows={2}
                  value={q.question}
                  onChange={(e) => {
                    const next = [...questions];
                    next[idx] = { ...next[idx], question: e.target.value };
                    setQuestions(next);
                  }}
                />
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  <strong>Strong Answer Demonstrates:</strong> {q.strongAnswerIndicators}
                </p>
                <p className="text-xs text-slate-500">
                  <strong>Evaluation Criteria:</strong> {q.evaluationCriteria}
                </p>
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setQuestionTarget(null)}>
                Close
              </Button>
              <Button onClick={handleSaveCustomQuestions}>
                Save Customized Rubric
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* AI Interview Evaluation Workspace Modal */}
      <Modal
        open={Boolean(evalTarget)}
        onClose={() => setEvalTarget(null)}
        title="AI Interview Evaluation Workspace (Human-Led)"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-5">
          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-[#28C5D8] shrink-0 mt-0.5" />
            <span>
              Ethical AI Guardrail: Processes written interviewer notes only with explicit
              consent. Never infers personality, emotion, honesty, or mental traits, and
              never makes an automated hiring decision.
            </span>
          </div>

          <form onSubmit={handleRunEvaluation} className="space-y-4">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={consentConfirmed}
                onChange={(e) => setConsentConfirmed(e.target.checked)}
              />
              I confirm candidate note-taking consent was obtained for this interview.
            </label>

            <Textarea
              label="Interviewer Notes & Candidate Responses *"
              rows={5}
              required
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder="Enter objective technical and project evidence discussed during the interview..."
            />

            <Select
              label="Human Interviewer Recommendation (Never Automated)"
              value={humanRecommendation}
              onChange={(e) => setHumanRecommendation(e.target.value)}
            >
              <option value="STRONG_YES">Strong Yes (Human Decision)</option>
              <option value="YES">Yes (Human Decision)</option>
              <option value="MIXED">Mixed / Follow-Up Needed</option>
              <option value="NO">No (Human Decision)</option>
              <option value="PENDING">Pending Team Debrief</option>
            </Select>

            <Button type="submit" loading={evaluating}>
              <Sparkles className="w-4 h-4" /> Organize Notes &amp; Map Job Evidence
            </Button>
          </form>

          {evalResult && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              <AIModeBadge mode={evalResult.aiMode} />
              <p className="font-semibold text-sm text-[#101B35] dark:text-white">
                {evalResult.structuredSummary}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {evalResult.demonstratedSkills?.map((s: string) => (
                  <Badge key={s} variant="success">
                    Demonstrated: {s}
                  </Badge>
                ))}
              </div>
              {evalResult.suggestedFollowUps?.length > 0 && (
                <div>
                  <p className="font-bold text-slate-600 dark:text-slate-300">
                    Suggested Follow-Up Questions:
                  </p>
                  <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-600 dark:text-slate-300">
                    {evalResult.suggestedFollowUps.map((f: string, idx: number) => (
                      <li key={idx}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        open={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        title="Reschedule Interview"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <Input
            label="New Date & Time"
            type="datetime-local"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRescheduleTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                rescheduleTarget &&
                newTime &&
                updateInterviewStatus(rescheduleTarget.id, 'RESCHEDULED', newTime)
              }
            >
              Confirm Reschedule
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}
