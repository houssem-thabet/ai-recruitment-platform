'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, Input, Badge, PageLoader } from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (actionFilter) p.set('action', actionFilter);
    apiFetch(`/api/admin/audit-logs?${p.toString()}`)
      .then((d) => setLogs(d.logs || []))
      .finally(() => setLoading(false));
  }, [actionFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardShell
      role="ADMIN"
      title="Security & Governance Audit Trail"
      subtitle="Immutable record of authentication, role changes, CV authorizations, AI overrides, and moderation actions"
    >
      <Card className="p-4 sm:p-5 relative">
        <Search className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          className="pl-10"
          placeholder="Filter by action keyword (e.g. AUTH_LOGIN, MATCH_SCORE_OVERRIDDEN, JOB_MODERATED)..."
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        />
      </Card>

      {loading ? (
        <PageLoader />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/90 dark:bg-[#091022] border-b border-slate-200/80 dark:border-white/[0.08]">
                <tr>
                  <th className="px-5 py-3.5">Event Action</th>
                  <th className="px-5 py-3.5">Actor</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Target Entity</th>
                  <th className="px-5 py-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 rounded-lg bg-[#367BF5]/10 dark:bg-[#28C5D8]/15 font-mono text-xs font-extrabold text-[#2463EB] dark:text-[#28C5D8]">
                        {l.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-[#101B35] dark:text-slate-200">
                      {l.actor
                        ? `${l.actor.firstName} ${l.actor.lastName} (${l.actor.email})`
                        : 'System'}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={
                          l.actorRole === 'ADMIN'
                            ? 'navy'
                            : l.actorRole === 'RECRUITER'
                            ? 'electric'
                            : l.actorRole === 'CANDIDATE'
                            ? 'cyan'
                            : 'default'
                        }
                      >
                        {l.actorRole || 'SYSTEM'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {l.entityType} {l.entityId ? `(${l.entityId.slice(0, 8)}…)` : ''}
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
      )}
    </DashboardShell>
  );
}
