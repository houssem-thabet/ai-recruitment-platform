'use client';

import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Users,
  Building2,
  Briefcase,
  ClipboardList,
  Sparkles,
  Award,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Card,
  AIModeBadge,
  PageLoader,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';

export default function AdminOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/admin/dashboard')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell
      role="ADMIN"
      title="Platform Administration Overview"
      subtitle="Platform-wide telemetry across users, companies, jobs, conversion funnels, AI usage, and security logs"
      actions={data?.aiEngine && <AIModeBadge mode={data.aiEngine.mode} />}
    >
      {loading || !data ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Users', value: data.metrics.totalUsers, icon: Users },
              { label: 'Candidates', value: data.metrics.candidatesCount, icon: Users },
              { label: 'Companies', value: data.metrics.companiesCount, icon: Building2 },
              { label: 'Published Jobs', value: data.metrics.publishedJobsCount, icon: Briefcase },
              { label: 'Applications', value: data.metrics.totalApplicationsCount, icon: ClipboardList },
              { label: 'AI Invocations', value: data.metrics.totalAICalls, icon: Sparkles },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.label} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-semibold">{m.label}</span>
                    <Icon className="w-4 h-4 text-[#367BF5]" />
                  </div>
                  <p className="text-2xl font-extrabold font-mono text-[#101B35] dark:text-white mt-2">
                    {m.value}
                  </p>
                </Card>
              );
            })}
          </div>

          {/* Trends & Funnel Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-3">
              <h3 className="text-base font-bold text-[#101B35] dark:text-white">
                User Registration, Job, Application &amp; Hiring Trends
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trends}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="registrations"
                      name="Registrations"
                      stroke="#367BF5"
                      strokeWidth={2.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="jobsPublished"
                      name="Jobs Published"
                      stroke="#28C5D8"
                      strokeWidth={2.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="applications"
                      name="Applications"
                      stroke="#6366F1"
                      strokeWidth={2.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="hires"
                      name="Hires"
                      stroke="#10B981"
                      strokeWidth={2.5}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6 space-y-3">
              <h3 className="text-base font-bold text-[#101B35] dark:text-white">
                Platform Recruitment Funnel Conversion
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.funnel}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Records" fill="#367BF5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-6 p-6 space-y-3">
              <h3 className="text-base font-bold text-[#101B35] dark:text-white">
                AI Feature Usage Breakdown
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.aiFeatureUsage} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="feature" type="category" width={140} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="calls" name="Invocations" fill="#28C5D8" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="lg:col-span-6 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#101B35] dark:text-white">
                  Recent Security &amp; Governance Audit Events
                </h3>
                <Award className="w-4 h-4 text-[#367BF5]" />
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                {data.recentAuditLogs.map((log: any) => (
                  <div key={log.id} className="py-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#367BF5]">
                        {log.action}
                      </span>
                      <span className="text-slate-400">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      Actor: {log.actor?.email || 'System'} ({log.actorRole || 'SYSTEM'}) •{' '}
                      {log.entityType}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
