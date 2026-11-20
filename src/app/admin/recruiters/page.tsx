import React from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { AdminUsersTable } from '@/components/admin/AdminUsersTable';

export default function AdminRecruitersPage() {
  return (
    <DashboardShell
      role="ADMIN"
      title="Recruiter Management"
      subtitle="Monitor recruiter accounts, associated organizations, and publishing privileges"
    >
      <AdminUsersTable fixedRole="RECRUITER" />
    </DashboardShell>
  );
}
