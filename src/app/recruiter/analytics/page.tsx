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
} from 'recharts';
import { Download } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  Select,
  Badge,
  PageLoader,
} from '@/components/ui/primitives';
import { apiFetch, getStoredToken } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';

const PIE_COLORS = ['#367BF5', '#28C5D8', '#6366F1', '#10B981', '#F59E0B', '#EF4444'];

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
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`/api/recruiter/analytics?range=${range}&format=csv`, {
      headers,
      credentials: 'include',
    });
    const csvText = await res.text();
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `talentai-analytics-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Analytics report exported!');
  };

  return (
    <DashboardShell
      role="RECRUITER"
      title="Recruitment Analytics & Reporting"
      subtitle="Database-backed funnel conversion metrics, time-to-hire, and skill supply vs. demand"
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
          <div className="flex items-center justify-between">
            <Badge variant="cyan">
              Computed Live from PostgreSQL Records (Includes Seeded Demo Data)
            </Badge>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Applications / Job Avg', value: data.kpis.applicationsPerJobAvg },
              {
                label: 'Interview Conversion',
                value: `${data.kpis.interviewConversionRate}%`,
              },
              {
                label: 'Hiring Conversion',
                value: `${data.kpis.hiringConversionRate}%`,
              },
              {
                label: 'Average Time to Hire',
                value:
                  data.kpis.averageTimeToHireDays > 0
                    ? `${data.kpis.averageTimeToHireDays} days`
                    : '—',
              },
            ].map((k) => (
              <Card key={k.label} className="p-5">
                <p className="text-xs text-slate-500 font-semibold">{k.label}</p>
                <p className="text-2xl font-extrabold font-mono text-[#101B35] dark:text-white mt-2">
                  {k.value}
                </p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-3">
              <h3 className="text-base font-bold text-[#101B35] dark:text-white">
                Application Status Distribution
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.statusDistribution}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={95}
                      label
                    >
                      {data.statusDistribution.map((_: any, idx: number) => (
                        <Cell
                          key={idx}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6 space-y-3">
              <h3 className="text-base font-bold text-[#101B35] dark:text-white">
                Most Requested Skills in Company Jobs
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.mostRequestedSkills}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="skill" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="demand" name="Jobs Requesting Skill" fill="#367BF5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="p-6 space-y-3">
            <h3 className="text-base font-bold text-[#101B35] dark:text-white">
              Platform Candidate Skill Distribution (Supply Overview)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.candidateSkillDistribution}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="skill" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Candidates" fill="#28C5D8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
