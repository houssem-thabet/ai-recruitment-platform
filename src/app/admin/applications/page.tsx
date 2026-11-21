'use client';

import React, { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, StatusBadge, ScoreBadge, PageLoader } from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';

export default function AdminApplicationsMonitoringPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/applications')
      .then((d) => setApplications(d.applications || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell
      role="ADMIN"
      title="Platform Application Monitoring"
      subtitle="Aggregate pipeline health across hiring organizations (confidential candidate attachments excluded)"
    >
      {loading ? (
        <PageLoader />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Candidate</th>
                <th className="px-5 py-3.5">Job Role</th>
                <th className="px-5 py-3.5">Company</th>
                <th className="px-5 py-3.5">Stage</th>
                <th className="px-5 py-3.5">AI Match</th>
                <th className="px-5 py-3.5">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {applications.map((a) => {
                const resolvedScore =
                  a.matchResult?.recruiterOverrideScore ??
                  a.matchResult?.overallScore ??
                  a.aiMatchScore;
                return (
                  <tr key={a.id}>
                    <td className="px-5 py-4 font-semibold text-[#101B35] dark:text-white">
                      {a.candidateProfile?.user?.firstName}{' '}
                      {a.candidateProfile?.user?.lastName}
                    </td>
                    <td className="px-5 py-4 text-xs">{a.job?.title}</td>
                    <td className="px-5 py-4 text-xs">{a.job?.company?.name}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-[#367BF5]">
                      {resolvedScore !== null && resolvedScore !== undefined ? (
                        <ScoreBadge score={Math.round(Number(resolvedScore))} />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {formatDate(a.appliedAt || a.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </DashboardShell>
  );
}
