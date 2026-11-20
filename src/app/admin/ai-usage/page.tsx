'use client';

import React, { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, Badge, AIModeBadge, PageLoader } from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';

export default function AdminAIUsagePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/admin/ai-logs')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell
      role="ADMIN"
      title="AI Usage & Telemetry Statistics"
      subtitle="Real-time audit log of AI invocations, execution mode (LIVE_LLM vs DETERMINISTIC_NLP), latency, and error rates"
    >
      {loading || !data ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5">
              <p className="text-xs text-slate-500 font-semibold">Total AI Invocations</p>
              <p className="text-2xl font-extrabold font-mono text-[#101B35] dark:text-white mt-2">
                {data.summary.totalCalls}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-slate-500 font-semibold">Avg Latency</p>
              <p className="text-2xl font-extrabold font-mono text-[#367BF5] mt-2">
                {data.summary.avgLatencyMs} ms
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-slate-500 font-semibold">Estimated Tokens</p>
              <p className="text-2xl font-extrabold font-mono text-[#101B35] dark:text-white mt-2">
                {data.summary.totalTokensEstimated}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-slate-500 font-semibold">Error Count</p>
              <p className="text-2xl font-extrabold font-mono text-emerald-600 mt-2">
                {data.summary.errorCount}
              </p>
            </Card>
          </div>

          <Card className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Feature</th>
                  <th className="px-5 py-3.5">Execution Mode</th>
                  <th className="px-5 py-3.5">Model</th>
                  <th className="px-5 py-3.5">Latency</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.logs.map((l: any) => (
                  <tr key={l.id}>
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-[#101B35] dark:text-white">
                      {l.feature}
                    </td>
                    <td className="px-5 py-3.5">
                      <AIModeBadge mode={l.mode} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {l.modelName}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs">{l.latencyMs} ms</td>
                    <td className="px-5 py-3.5">
                      {l.status === 'SUCCESS' ? (
                        <Badge variant="success">OK</Badge>
                      ) : (
                        <Badge variant="warning">{l.status}</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {formatDateTime(l.createdAt)}
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
