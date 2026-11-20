'use client';

import React, { useCallback, useEffect, useState } from 'react';
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
      title="Security & Governance Audit Logs"
      subtitle="Immutable trail of authentication, role changes, CV authorizations, AI overrides, and moderation actions"
    >
      <Card className="p-4">
        <Input
          placeholder="Filter by action keyword (e.g. AUTH_LOGIN, MATCH_SCORE_OVERRIDDEN, JOB_MODERATED)..."
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        />
      </Card>

      {loading ? (
        <PageLoader />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Entity</th>
                <th className="px-5 py-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-5 py-3.5 font-mono text-xs font-bold text-[#367BF5]">
                    {l.action}
                  </td>
                  <td className="px-5 py-3.5 text-xs">
                    {l.actor ? `${l.actor.firstName} ${l.actor.lastName} (${l.actor.email})` : 'System'}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant="default">{l.actorRole || 'SYSTEM'}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">
                    {l.entityType} {l.entityId ? `(${l.entityId.slice(0, 8)}...)` : ''}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">
                    {formatDateTime(l.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </DashboardShell>
  );
}
