'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Sliders, ShieldAlert, CheckCircle2 } from 'lucide-react';
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
  AIModeBadge,
  PageLoader,
  EmptyState,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';

export default function RecruiterAIMatchingPage() {
  const toast = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [scope, setScope] = useState<'applicants' | 'all_searchable'>('applicants');
  const [weights, setWeights] = useState({
    skills: 40,
    experience: 25,
    education: 15,
    responsibilities: 15,
    language: 5,
  });

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const [overrideTarget, setOverrideTarget] = useState<any | null>(null);
  const [overrideScore, setOverrideScore] = useState('');
  const [overrideNote, setOverrideNote] = useState('');

  useEffect(() => {
    apiFetch('/api/jobs?mine=1&limit=30')
      .then((d) => {
        const list = d.jobs || [];
        setJobs(list);
        if (list.length > 0) {
          setSelectedJobId(list[0].id);
          return apiFetch(`/api/ai/match-candidate?jobId=${list[0].id}`);
        }
        return { results: [] };
      })
      .then((m) => setResults(m?.results || []))
      .finally(() => setLoading(false));
  }, []);

  const handleRunMatching = async () => {
    if (!selectedJobId) return;
    setRunning(true);
    try {
      const res = await apiFetch('/api/ai/match-candidate', {
        method: 'POST',
        body: JSON.stringify({
          jobId: selectedJobId,
          scope,
          weights,
        }),
      });
      setResults(res.results || []);
      toast.success(`Evaluated ${res.results?.length || 0} candidate compatibility profiles!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideTarget) return;
    try {
      await apiFetch('/api/ai/match-candidate', {
        method: 'PUT',
        body: JSON.stringify({
          matchResultId: overrideTarget.id,
          overrideScore: overrideScore !== '' ? Number(overrideScore) : null,
          overrideNote,
        }),
      });
      toast.success('Recruiter review & score override saved.');
      setOverrideTarget(null);
      const refreshed = await apiFetch(
        `/api/ai/match-candidate?jobId=${selectedJobId}`
      );
      setResults(refreshed.results || []);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <DashboardShell
      role="RECRUITER"
      title="AI Candidate–Job Matching Engine"
      subtitle="Transparent 0–100 compatibility scoring with configurable weights and human recruiter override"
    >
      {/* Responsible AI Banner */}
      <div className="p-4 rounded-2xl bg-[#101B35] text-slate-200 flex items-start gap-3 text-xs">
        <ShieldAlert className="w-5 h-5 text-[#28C5D8] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-white">Decision-Support Governance:</strong> Scores are
          explainable mathematical estimates derived strictly from job-relevant skills,
          experience, education, projects, and languages. Protected characteristics are
          never used, candidates are never auto-rejected, and recruiters may override any
          score.
        </p>
      </div>

      {/* Job + Configurable Weights Controls */}
      <Card className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6">
            <Select
              label="Target Company Job"
              value={selectedJobId}
              onChange={async (e) => {
                const id = e.target.value;
                setSelectedJobId(id);
                const m = await apiFetch(`/api/ai/match-candidate?jobId=${id}`);
                setResults(m.results || []);
              }}
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.status})
                </option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-3">
            <Select
              label="Candidate Pool Scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
            >
              <option value="applicants">Job Applicants</option>
              <option value="all_searchable">All Opted-In Talent Pool</option>
            </Select>
          </div>

          <div className="md:col-span-3">
            <Button
              onClick={handleRunMatching}
              loading={running}
              className="w-full"
            >
              <Sparkles className="w-4 h-4" /> Run Matching Engine
            </Button>
          </div>
        </div>

        {/* Configurable Weights */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <Sliders className="w-3.5 h-3.5 text-[#367BF5]" />
            Configurable Scoring Model Weights (Normalized to 100%)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { key: 'skills', label: 'Skills %' },
              { key: 'experience', label: 'Experience %' },
              { key: 'education', label: 'Education/Certs %' },
              { key: 'responsibilities', label: 'Projects/Resp %' },
              { key: 'language', label: 'Languages %' },
            ].map((w) => (
              <Input
                key={w.key}
                label={w.label}
                type="number"
                min={0}
                max={100}
                value={(weights as any)[w.key]}
                onChange={(e) =>
                  setWeights({ ...weights, [w.key]: Number(e.target.value) })
                }
              />
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <PageLoader />
      ) : results.length === 0 ? (
        <EmptyState
          title="No compatibility records computed yet for this job"
          description="Click 'Run Matching Engine' above to evaluate applicants or discoverable candidates."
        />
      ) : (
        <div className="space-y-4">
          {results.map((r) => {
            const effectiveScore = r.recruiterOverrideScore ?? r.overallScore;
            return (
              <Card key={r.id} className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-lg font-bold text-[#101B35] dark:text-white">
                        {r.candidateProfile?.user?.firstName}{' '}
                        {r.candidateProfile?.user?.lastName}
                      </h3>
                      <AIModeBadge mode={r.aiMode} />
                      {r.reviewedByRecruiter && (
                        <Badge variant="success">
                          <CheckCircle2 className="w-3 h-3" /> Recruiter Reviewed
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {r.candidateProfile?.headline} • {r.relevantExperience}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-slate-400 font-bold">
                        {r.recruiterOverrideScore !== null
                          ? `Override (AI: ${r.overallScore})`
                          : 'Compatibility'}
                      </p>
                      <ScoreBadge score={effectiveScore} />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOverrideTarget(r);
                        setOverrideScore(
                          r.recruiterOverrideScore !== null
                            ? String(r.recruiterOverrideScore)
                            : String(r.overallScore)
                        );
                        setOverrideNote(r.recruiterOverrideNote || '');
                      }}
                    >
                      Review / Override
                    </Button>
                  </div>
                </div>

                {/* Transparent Sub-Score Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                  {[
                    { label: 'Skills', val: r.skillScore },
                    { label: 'Experience', val: r.experienceScore },
                    { label: 'Education', val: r.educationScore },
                    { label: 'Projects/Semantic', val: r.responsibilityScore },
                    { label: 'Languages', val: r.languageScore },
                  ].map((sub) => (
                    <div
                      key={sub.label}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800"
                    >
                      <span className="text-slate-500">{sub.label}</span>
                      <p className="font-mono font-bold text-sm text-[#101B35] dark:text-white">
                        {Math.round(sub.val)}/100
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <p className="font-bold text-emerald-700 dark:text-emerald-400">
                      Matching Skills:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.matchingSkills?.length > 0 ? (
                        r.matchingSkills.map((s: string) => (
                          <Badge key={s} variant="success">
                            ✓ {s}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-slate-400">None directly listed</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-bold text-amber-700 dark:text-amber-400">
                      Missing Required Skills:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.missingSkills?.length > 0 ? (
                        r.missingSkills.map((s: string) => (
                          <Badge key={s} variant="warning">
                            {s}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-emerald-600 font-semibold">
                          All required skills matched!
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-xs space-y-1.5">
                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                    <strong>Explanation:</strong> {r.explanation}
                  </p>
                  {r.verificationAreas?.length > 0 && (
                    <p className="text-slate-500">
                      <strong>Human Verification Areas:</strong>{' '}
                      {r.verificationAreas.join(' ')}
                    </p>
                  )}
                  {r.recruiterOverrideNote && (
                    <p className="text-[#367BF5] font-semibold">
                      Recruiter Override Note: {r.recruiterOverrideNote}
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recruiter Review & Override Modal */}
      <Modal
        open={Boolean(overrideTarget)}
        onClose={() => setOverrideTarget(null)}
        title="Recruiter Review & Manual Score Override"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveOverride} className="space-y-4">
          <Input
            label="Recruiter Adjusted Score (0–100)"
            type="number"
            min={0}
            max={100}
            value={overrideScore}
            onChange={(e) => setOverrideScore(e.target.value)}
          />
          <Textarea
            label="Human Assessment & Verification Note"
            rows={3}
            value={overrideNote}
            onChange={(e) => setOverrideNote(e.target.value)}
            placeholder="Document why you adjusted or confirmed the AI score..."
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOverrideTarget(null)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Human Review</Button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
