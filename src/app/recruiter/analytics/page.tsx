'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Download,
  TrendingUp,
  UserCheck,
  Award,
  Clock,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  Select,
  Badge,
  KPICard,
  PremiumChartTooltip,
  PageLoader,
} from '@/components/ui/primitives';
import { apiDownload, apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';

const PIE_COLORS = ['#367BF5', '#28C5D8', '#101B35', '#10B981', '#F59E0B', '#EF4444'];

export default function RecruiterAnalyticsPage() {
  const toast = useToast();
  const [range, setRange] = useState('all');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch(`/api/recruiter/analytics?range=${range}`);
      setData(d);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [range, toast]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const exportCsv = async () => {
    try {
      await apiDownload(
        `/api/recruiter/analytics?range=${range}&format=csv`,
        `talentai-analytics-${range}.csv`
      );
      toast.success('Analytics report exported!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <DashboardShell
      role="RECRUITER"
      title="Recruitment Funnel Analytics & Reporting"
      subtitle="Database-backed funnel conversion rates, time-to-hire velocity, and skill supply vs. demand"
      actions={
        <>
          <Select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="w-40"
          >
            <option value="all">All Time</option>
            <option value="90d">Last 90 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="7d">Last 7 Days</option>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </>
      }
    >
      {loading || !data ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Badge variant="cyan" dot>
              Computed Live from PostgreSQL Records (Includes Seeded Demo Data)
            </Badge>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Applications / Job Avg"
              value={data.kpis.applicationsPerJobAvg}
              icon={TrendingUp}
              tone="electric"
            />
            <KPICard
              label="Interview Conversion"
              value={`${data.kpis.interviewConversionRate}%`}
              icon={UserCheck}
              tone="cyan"
            />
            <KPICard
              label="Hiring Conversion"
              value={`${data.kpis.hiringConversionRate}%`}
              icon={Award}
              tone="emerald"
            />
            <KPICard
              label="Avg Time to Hire"
              value={
                data.kpis.averageTimeToHireDays > 0
                  ? `${data.kpis.averageTimeToHireDays}d`
                  : '—'
              }
              icon={Clock}
              tone="navy"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-[#101B35] dark:text-white">
                  Application Status Distribution
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Proportional breakdown across recruitment outcomes
                </p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.statusDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={95}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {data.statusDistribution.map((_: any, idx: number) => (
                        <Cell
                          key={idx}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PremiumChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-[#101B35] dark:text-white">
                  Most Requested Skills in Company Roles
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Top technical &amp; domain competencies across open requisitions
                </p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.mostRequestedSkills}>
                    <defs>
                      <linearGradient id="skillDemandGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#367BF5" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#1D58D8" stopOpacity={0.75} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.14} vertical={false} />
                    <XAxis
                      dataKey="skill"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#64748B' }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <Tooltip
                      content={<PremiumChartTooltip />}
                      cursor={{ fill: 'rgba(54, 123, 245, 0.06)' }}
                    />
                    <Bar
                      dataKey="demand"
                      name="Jobs Requesting Skill"
                      fill="url(#skillDemandGrad)"
                      radius={[7, 7, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="p-6 space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-[#101B35] dark:text-white">
                Platform Candidate Skill Supply Overview
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Available verified candidate talent across core skills
              </p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.candidateSkillDistribution}>
                  <defs>
                    <linearGradient id="skillSupplyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#28C5D8" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#367BF5" stopOpacity={0.75} />
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
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <Tooltip
                    content={<PremiumChartTooltip />}
                    cursor={{ fill: 'rgba(40, 197, 216, 0.06)' }}
                  />
                  <Bar
                    dataKey="count"
                    name="Candidates"
                    fill="url(#skillSupplyGrad)"
                    radius={[7, 7, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
