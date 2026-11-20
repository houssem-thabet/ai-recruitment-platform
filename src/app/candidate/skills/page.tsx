'use client';

import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Sparkles, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  Badge,
  Select,
  ScoreBadge,
  AIModeBadge,
  PageLoader,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';

export default function CandidateSkillGapPage() {
  const toast = useToast();
  const [careerPaths, setCareerPaths] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [mode, setMode] = useState<'CAREER_PATH' | 'JOB'>('CAREER_PATH');
  const [selectedCareerPath, setSelectedCareerPath] = useState('fullstack-engineer');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const runAnalysis = async (targetMode: 'CAREER_PATH' | 'JOB', cpId: string, jId: string) => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/ai/skill-gap', {
        method: 'POST',
        body: JSON.stringify(
          targetMode === 'JOB' && jId
            ? { jobId: jId }
            : { careerPathId: cpId }
        ),
      });
      setAnalysis(res.analysis);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiFetch('/api/ai/skill-gap')
      .then((d) => {
        setCareerPaths(d.careerPaths || []);
        setJobs(d.jobs || []);
        const firstJobId = d.jobs?.[0]?.id || '';
        setSelectedJobId(firstJobId);
        runAnalysis('CAREER_PATH', 'fullstack-engineer', firstJobId);
      })
      .catch((err) => toast.error(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardShell
      role="CANDIDATE"
      title="AI Skill Gap Analysis"
      subtitle="Compare your verified skills against target career tracks or live job postings"
    >
      {/* Target Selector */}
      <Card className="p-5 flex flex-col md:flex-row md:items-end gap-4">
        <div className="w-full md:w-52">
          <Select
            label="Benchmark Type"
            value={mode}
            onChange={(e) => setMode(e.target.value as 'CAREER_PATH' | 'JOB')}
          >
            <option value="CAREER_PATH">Career Path Blueprint</option>
            <option value="JOB">Specific Live Job</option>
          </Select>
        </div>

        <div className="flex-1">
          {mode === 'CAREER_PATH' ? (
            <Select
              label="Select Career Path"
              value={selectedCareerPath}
              onChange={(e) => setSelectedCareerPath(e.target.value)}
            >
              {careerPaths.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.title}
                </option>
              ))}
            </Select>
          ) : (
            <Select
              label="Select Open Job Posting"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} — {j.company?.name}
                </option>
              ))}
            </Select>
          )}
        </div>

        <Button
          onClick={() => runAnalysis(mode, selectedCareerPath, selectedJobId)}
        >
          <Sparkles className="w-4 h-4" /> Compare Skills
        </Button>
      </Card>

      {loading || !analysis ? (
        <PageLoader label="Computing skill gap matrix..." />
      ) : (
        <div className="space-y-6">
          {/* Summary Header */}
          <Card className="p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <AIModeBadge mode={analysis.aiMode} />
              <h2 className="text-xl font-extrabold text-[#101B35] dark:text-white pt-1">
                {analysis.targetTitle}
              </h2>
              <p className="text-xs text-slate-500">{analysis.disclaimer}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase text-slate-500 mb-1">
                Readiness Score
              </p>
              <ScoreBadge score={analysis.readinessScore} />
            </div>
          </Card>

          {/* Visual Skill Comparison Chart */}
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-[#101B35] dark:text-white">
              Visual Skill Proficiency vs. Target Benchmark
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="skill" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="candidateScore"
                    name="Your Current Proficiency"
                    fill="#367BF5"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="targetScore"
                    name="Target Role Benchmark"
                    fill="#28C5D8"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Existing vs Missing Skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-3">
              <h3 className="text-sm font-bold uppercase text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Existing Matched Skills (
                {analysis.existingSkills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {analysis.existingSkills.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No matching skills recorded yet. Add skills in My Profile!
                  </p>
                ) : (
                  analysis.existingSkills.map((s: string) => (
                    <Badge key={s} variant="success">
                      ✓ {s}
                    </Badge>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-6 space-y-3">
              <h3 className="text-sm font-bold uppercase text-amber-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Missing Required Skills (
                {analysis.missingRequiredSkills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {analysis.missingRequiredSkills.length === 0 ? (
                  <p className="text-xs text-emerald-600 font-semibold">
                    You cover 100% of core required skills for this target!
                  </p>
                ) : (
                  analysis.missingRequiredSkills.map((s: string) => (
                    <Badge key={s} variant="warning">
                      {s}
                    </Badge>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Learning Priorities & Portfolio Projects */}
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-[#101B35] dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#367BF5]" />
              Prioritized Learning Roadmap &amp; Recommended Projects
            </h3>
            {analysis.learningPriorities.length === 0 ? (
              <p className="text-xs text-slate-500">
                All core and stretch skills are already present on your profile!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.learningPriorities.map((lp: any) => (
                  <div
                    key={lp.skill}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#101B35] dark:text-white">
                        {lp.skill}
                      </span>
                      <Badge
                        variant={
                          lp.priority === 'High'
                            ? 'danger'
                            : lp.priority === 'Medium'
                            ? 'warning'
                            : 'cyan'
                        }
                      >
                        {lp.priority} Priority
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Estimated Difficulty: <strong>{lp.difficulty}</strong> (~
                      {lp.estimatedWeeks} weeks)
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <strong>Portfolio Project Idea:</strong> {lp.recommendedProject}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
