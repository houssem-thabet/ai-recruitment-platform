'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
  ShieldCheck,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Card,
  Badge,
  KPICard,
  AIModeBadge,
  PremiumChartTooltip,
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
      title="Platform Governance & Telemetry Overview"
      subtitle="System-wide observability across accounts, organizations, hiring funnels, AI invocations, and security audit trails"
      actions={data?.aiEngine && <AIModeBadge mode={data.aiEngine.mode} />}
    >
      {loading || !data ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <KPICard
              label="Total Accounts"
              value={data.metrics.totalUsers}
              icon={Users}
              tone="navy"
            />
            <KPICard
              label="Candidates"
              value={data.metrics.candidatesCount}
              icon={UserCheck}
              tone="cyan"
            />
            <KPICard
              label="Organizations"
              value={data.metrics.companiesCount}
              icon={Building2}
              tone="electric"
            />
            <KPICard
              label="Published Jobs"
              value={data.metrics.publishedJobsCount}
              icon={Briefcase}
              tone="indigo"
            />
            <KPICard
              label="Applications"
              value={data.metrics.totalApplicationsCount}
              icon={ClipboardList}
              tone="emerald"
            />
            <KPICard
              label="AI Invocations"
              value={data.metrics.totalAICalls}
              icon={Sparkles}
              tone="cyan"
            />
          </div>

          {/* Trends & Funnel Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#101B35] dark:text-white">
                    Platform Growth &amp; Hiring Activity
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Monthly registrations, published jobs, applications &amp; hires
                  </p>
                </div>
                <Badge variant="cyan" dot>
                  Time Series
                </Badge>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trends}>
                    <defs>
                      <linearGradient id="adminAppsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#367BF5" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#367BF5" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="adminRegFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#28C5D8" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#28C5D8" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.14} vertical={false} />
                    <XAxis
                      dataKey="month"
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
                    <Tooltip content={<PremiumChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="applications"
                      name="Applications"
                      stroke="#367BF5"
                      fill="url(#adminAppsFill)"
                      strokeWidth={2.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="registrations"
                      name="Registrations"
                      stroke="#28C5D8"
                      fill="url(#adminRegFill)"
                      strokeWidth={2.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="jobsPublished"
                      name="Jobs Published"
                      stroke="#6366F1"
                      fill="transparent"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="hires"
                      name="Hires"
                      stroke="#10B981"
                      fill="transparent"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#101B35] dark:text-white">
                    Global Recruitment Funnel Conversion
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Aggregate progression across all active organizations
                  </p>
                </div>
                <Badge variant="electric">Funnel</Badge>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.funnel}>
                    <defs>
                      <linearGradient id="adminFunnelGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#367BF5" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#101B35" stopOpacity={0.85} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.14} vertical={false} />
                    <XAxis
                      dataKey="stage"
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
                      cursor={{ fill: 'rgba(54, 123, 245, 0.06)' }}
                    />
                    <Bar
                      dataKey="count"
                      name="Records"
                      fill="url(#adminFunnelGrad)"
                      radius={[7, 7, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-6 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-[#101B35] dark:text-white">
                  AI Feature Telemetry Breakdown
                </h3>
                <Link
                  href="/admin/ai-usage"
                  className="text-xs font-bold text-[#367BF5] dark:text-[#28C5D8] hover:underline inline-flex items-center gap-1"
                >
                  Inspect Logs <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.aiFeatureUsage} layout="vertical">
                    <defs>
                      <linearGradient id="adminAiBar" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#367BF5" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#28C5D8" stopOpacity={0.95} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.14} horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <YAxis
                      dataKey="feature"
                      type="category"
                      width={145}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#64748B' }}
                    />
                    <Tooltip
                      content={<PremiumChartTooltip />}
                      cursor={{ fill: 'rgba(40, 197, 216, 0.06)' }}
                    />
                    <Bar
                      dataKey="calls"
                      name="Invocations"
                      fill="url(#adminAiBar)"
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="lg:col-span-6 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-[#101B35] dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#28C5D8]" />
                  Recent Security &amp; Governance Audit Stream
                </h3>
                <Link
                  href="/admin/audit-logs"
                  className="text-xs font-bold text-[#367BF5] dark:text-[#28C5D8] hover:underline"
                >
                  Full Trail →
                </Link>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/[0.07] max-h-64 overflow-y-auto pr-1">
                {data.recentAuditLogs.map((log: any) => (
                  <div key={log.id} className="py-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#101B35]/[0.06] dark:bg-[#28C5D8]/15 font-mono text-[11px] font-extrabold text-[#367BF5] dark:text-[#28C5D8]">
                        {log.action}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                      Actor: <strong className="text-slate-700 dark:text-slate-300">{log.actor?.email || 'System'}</strong> ({log.actorRole || 'SYSTEM'}) •{' '}
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
