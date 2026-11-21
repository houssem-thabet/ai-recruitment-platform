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
import { Sparkles, CheckCircle2, AlertCircle, BookOpen, GitBranch } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  Badge,
  Select,
  ScoreBadge,
  AIModeBadge,
  PremiumChartTooltip,
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

  const runAnalysis = async (
    targetMode: 'CAREER_PATH' | 'JOB',
    cpId: string,
    jId: string
  ) => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/ai/skill-gap', {
        method: 'POST',
        body: JSON.stringify(
          targetMode === 'JOB' && jId ? { jobId: jId } : { careerPathId: cpId }
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
      title="AI Skill Gap Analysis & Learning Roadmap"
      subtitle="Benchmark your verified competencies against career tracks or live roles with prerequisite-ordered project roadmaps"
    >
      {/* Target Selector Bar */}
      <Card className="p-5 sm:p-6 flex flex-col md:flex-row md:items-end gap-4 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#28C5D8] to-[#367BF5]" />
        <div className="w-full md:w-56">
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
          variant="accent"
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
          <Card className="p-6 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-white via-white to-[#28C5D8]/[0.06] dark:from-[#0E172C] dark:via-[#0E172C] dark:to-[#28C5D8]/10">
            <div className="space-y-1.5">
              <AIModeBadge mode={analysis.aiMode} />
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#101B35] dark:text-white pt-1">
                {analysis.targetTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {analysis.disclaimer}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Readiness Score
              </p>
              <ScoreBadge score={analysis.readinessScore} />
            </div>
          </Card>

          {/* Visual Skill Comparison Chart */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base font-extrabold text-[#101B35] dark:text-white">
                Proficiency vs. Target Role Benchmark
              </h3>
              <Badge variant="cyan">0–100 Calibrated Scale</Badge>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.chartData} barGap={6}>
                  <defs>
                    <linearGradient id="candSkillGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#367BF5" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#2463EB" stopOpacity={0.75} />
                    </linearGradient>
                    <linearGradient id="targetSkillGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#28C5D8" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#1799A8" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.14} vertical={false} />
                  <XAxis
                    dataKey="skill"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <Tooltip
                    content={<PremiumChartTooltip />}
                    cursor={{ fill: 'rgba(54, 123, 245, 0.06)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar
                    dataKey="candidateScore"
                    name="Your Current Proficiency"
                    fill="url(#candSkillGrad)"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="targetScore"
                    name="Target Role Benchmark"
                    fill="url(#targetSkillGrad)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Existing vs Missing + Ecosystem Bridges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-3.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
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

              {Array.isArray(analysis.adjacentBridges) &&
                analysis.adjacentBridges.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-white/[0.07] space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#367BF5] dark:text-[#28C5D8] flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5" /> Ecosystem Transferability Bridges
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.adjacentBridges.map((b: any) => (
                        <Badge key={b.targetSkill} variant="cyan">
                          {b.candidateSkill} → {b.targetSkill} ({b.transferCredit}%)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </Card>

            <Card className="p-6 space-y-3.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
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

          {/* Prerequisite-Ordered Learning Priorities & Portfolio Projects */}
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-extrabold text-[#101B35] dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#367BF5] dark:text-[#28C5D8]" />
              Prerequisite-Sequenced Learning Roadmap &amp; Portfolio Projects
            </h3>
            {analysis.learningPriorities.length === 0 ? (
              <p className="text-xs text-slate-500">
                All core and stretch skills are already present on your profile!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.learningPriorities.map((lp: any, idx: number) => (
                  <div
                    key={lp.skill}
                    className="relative p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] hover:border-[#367BF5]/40 transition-colors space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 rounded-lg bg-[#101B35] text-[#28C5D8] font-mono text-[11px] font-extrabold">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="font-extrabold text-sm text-[#101B35] dark:text-white">
                          {lp.skill}
                        </span>
                      </div>
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
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Difficulty: <strong>{lp.difficulty}</strong> • Est.{' '}
                      <strong className="font-mono tabular-nums">~{lp.estimatedWeeks}w</strong>
                      {lp.bridgedFrom ? (
                        <span className="text-[#367BF5] dark:text-[#28C5D8]">
                          {' '}
                          (accelerated via {lp.bridgedFrom})
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1 border-t border-slate-200/60 dark:border-white/[0.06]">
                      <strong className="text-[#101B35] dark:text-white">
                        Portfolio Build:
                      </strong>{' '}
                      {lp.recommendedProject}
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
