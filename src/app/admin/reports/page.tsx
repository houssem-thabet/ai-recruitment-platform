'use client';

import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Button, Card, StatusBadge, PageLoader } from '@/components/ui/primitives';
import { apiFetch, getStoredToken } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';
import { formatDate } from '@/lib/utils';

export default function AdminReportsPage() {
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/admin/analytics')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const exportPlatformCsv = async () => {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch('/api/admin/analytics?format=csv', {
      headers,
      credentials: 'include',
    });
    const csv = await res.text();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'talentai-platform-report.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Platform executive report exported!');
  };

  return (
    <DashboardShell
      role="ADMIN"
      title="Executive Platform Reports"
      subtitle="Generate downloadable CSV reports of platform-wide job roles, application volumes, and hiring conversions"
      actions={
        <Button onClick={exportPlatformCsv}>
          <Download className="w-4 h-4" /> Export Executive CSV
        </Button>
      }
    >
      {loading || !data ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="p-4">
              <p className="text-xs text-slate-500">Total Users</p>
              <p className="text-xl font-extrabold font-mono mt-1">
                {data.summary.usersCount}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Companies</p>
              <p className="text-xl font-extrabold font-mono mt-1">
                {data.summary.companiesCount}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Total Jobs</p>
              <p className="text-xl font-extrabold font-mono mt-1">
                {data.summary.jobsCount}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Applications</p>
              <p className="text-xl font-extrabold font-mono mt-1">
                {data.summary.applicationsCount}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Confirmed Hires</p>
              <p className="text-xl font-extrabold font-mono text-emerald-600 mt-1">
                {data.summary.hiredCount}
              </p>
            </Card>
          </div>

          <Card className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Job Title</th>
                  <th className="px-5 py-3.5">Company</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Views</th>
                  <th className="px-5 py-3.5">Total Applications</th>
                  <th className="px-5 py-3.5">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.jobs.map((r: any) => (
                  <tr key={r.id}>
                    <td className="px-5 py-4 font-bold text-[#101B35] dark:text-white">
                      {r.title}
                    </td>
                    <td className="px-5 py-4 text-xs">{r.company?.name}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">{r.viewsCount}</td>
                    <td className="px-5 py-4 font-mono font-bold">
                      {r._count?.applications || 0}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {formatDate(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
