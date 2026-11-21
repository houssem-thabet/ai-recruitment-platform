'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Zap, Coins, ShieldCheck } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Card,
  Badge,
  KPICard,
  AIModeBadge,
  PageLoader,
} from '@/components/ui/primitives';
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
      title="AI Telemetry & Execution Logs"
      subtitle="Real-time observability of AI invocations, execution mode (LIVE_LLM vs DETERMINISTIC_NLP), latency, and fallback events"
    >
      {loading || !data ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Total AI Invocations"
              value={data.summary.totalCalls}
              icon={Sparkles}
              tone="navy"
            />
            <KPICard
              label="Average Latency"
              value={`${data.summary.avgLatencyMs} ms`}
              icon={Zap}
              tone="electric"
            />
            <KPICard
              label="Estimated Tokens"
              value={data.summary.totalTokensEstimated}
              icon={Coins}
              tone="cyan"
            />
            <KPICard
              label="Hard Error Count"
              value={data.summary.errorCount}
              icon={ShieldCheck}
              tone="emerald"
            />
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/90 dark:bg-[#091022] border-b border-slate-200/80 dark:border-white/[0.08]">
                  <tr>
                    <th className="px-5 py-3.5">AI Subsystem</th>
                    <th className="px-5 py-3.5">Execution Mode</th>
                    <th className="px-5 py-3.5">Model Identifier</th>
                    <th className="px-5 py-3.5">Latency</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {data.logs.map((l: any) => (
                    <tr key={l.id}>
                      <td className="px-5 py-3.5 font-mono text-xs font-extrabold text-[#101B35] dark:text-white">
                        {l.feature}
                      </td>
                      <td className="px-5 py-3.5">
                        <AIModeBadge mode={l.mode} />
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {l.modelName}
                      </td>
                      <td className="px-5 py-3.5 font-mono tabular-nums text-xs font-semibold text-[#367BF5] dark:text-[#28C5D8]">
                        {l.latencyMs} ms
                      </td>
                      <td className="px-5 py-3.5">
                        {l.status === 'SUCCESS' ? (
                          <Badge variant="success" dot>
                            OK
                          </Badge>
                        ) : l.status === 'FALLBACK' ? (
                          <Badge variant="cyan" dot>
                            FALLBACK
                          </Badge>
                        ) : (
                          <Badge variant="danger" dot>
                            {l.status}
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                        {formatDateTime(l.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
