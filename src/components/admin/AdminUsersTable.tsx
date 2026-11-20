'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Ban, RotateCcw } from 'lucide-react';
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
      <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/70 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-[#367BF5] shrink-0" />
        <span>
          Privacy Governance: Administrator views display non-confidential account metadata
          only. Private CV documents remain encrypted/restricted to authorized candidate
          applications.
        </span>
      </div>

      <Card className="p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <Input
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
        <Card className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Details</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Joined</th>
                <th className="px-5 py-3.5 text-right">Account Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-4">
                    <p className="font-bold text-[#101B35] dark:text-white">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      variant={
                        u.role === 'ADMIN'
                          ? 'purple'
                          : u.role === 'RECRUITER'
                          ? 'cyan'
                          : 'electric'
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
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {u.role !== 'ADMIN' && (
                      u.status === 'ACTIVE' ? (
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
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
