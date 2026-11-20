import React from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { AdminUsersTable } from '@/components/admin/AdminUsersTable';

export default function AdminCandidatesPage() {
  return (
    <DashboardShell
      role="ADMIN"
      title="Candidate Management"
      subtitle="Manage candidate accounts while preserving strict confidentiality of private CV documents"
    >
      <AdminUsersTable fixedRole="CANDIDATE" />
    </DashboardShell>
  );
}
