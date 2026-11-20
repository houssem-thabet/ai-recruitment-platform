import React from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { AdminUsersTable } from '@/components/admin/AdminUsersTable';

export default function AdminUsersPage() {
  return (
    <DashboardShell
      role="ADMIN"
      title="User Management"
      subtitle="Monitor all registered platform accounts and manage active or suspended status"
    >
      <AdminUsersTable />
    </DashboardShell>
  );
}
