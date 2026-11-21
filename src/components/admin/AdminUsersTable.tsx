'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Ban, RotateCcw, Search } from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  StatusBadge,
  PageLoader,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';
import { formatDate } from '@/lib/utils';

export function AdminUsersTable({
  fixedRole,
}: {
  fixedRole?: 'CANDIDATE' | 'RECRUITER';
}) {
  const toast = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState(fixedRole || '');
  const [statusFilter, setStatusFilter] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (q) p.set('q', q);
      if (fixedRole || roleFilter) p.set('role', fixedRole || roleFilter);
      if (statusFilter) p.set('status', statusFilter);

      const d = await apiFetch(`/api/admin/users?${p.toString()}`);
      setUsers(d.users || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [q, fixedRole, roleFilter, statusFilter, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleStatus = async (userId: string, nextStatus: 'ACTIVE' | 'SUSPENDED') => {
    try {
      await apiFetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      toast.success(`Account ${nextStatus.toLowerCase()}.`);
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0A1124] via-[#101B35] to-[#132347] border border-[#28C5D8]/25 text-xs text-slate-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#28C5D8]/15 border border-[#28C5D8]/30 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-[#28C5D8]" />
        </div>
        <span>
          <strong className="text-white">Privacy Governance:</strong> Administrator views
          display non-confidential account metadata only. Private CV documents remain
          isolated to authorized candidate applications.
        </span>
      </div>

      <Card className="p-4 sm:p-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-10"
            placeholder="Search name or email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {!fixedRole && (
          <div className="w-44">
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="CANDIDATE">Candidates</option>
              <option value="RECRUITER">Recruiters</option>
              <option value="ADMIN">Administrators</option>
            </Select>
          </div>
        )}
        <div className="w-44">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
        </div>
      </Card>

      {loading ? (
        <PageLoader />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/90 dark:bg-[#091022] border-b border-slate-200/80 dark:border-white/[0.08]">
                <tr>
                  <th className="px-5 py-3.5">Account</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Workspace Context</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Joined</th>
                  <th className="px-5 py-3.5 text-right">Governance Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#101B35] to-[#367BF5] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                          {u.firstName?.[0]}
                          {u.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-[#101B35] dark:text-white">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant={
                          u.role === 'ADMIN'
                            ? 'navy'
                            : u.role === 'RECRUITER'
                            ? 'electric'
                            : 'cyan'
                        }
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-300">
                      {u.candidateProfile
                        ? `${u.candidateProfile.headline || 'Candidate'} • ${
                            u.candidateProfile._count.applications
                          } apps`
                        : u.recruiterProfile
                        ? `${u.recruiterProfile.company?.name} • ${u.recruiterProfile._count.jobs} jobs`
                        : 'System Governance'}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {u.role !== 'ADMIN' &&
                        (u.status === 'ACTIVE' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleStatus(u.id, 'SUSPENDED')}
                          >
                            <Ban className="w-3.5 h-3.5 text-rose-500" /> Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleStatus(u.id, 'ACTIVE')}
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-500" /> Reactivate
                          </Button>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
