'use client';

import React from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { AccountSettingsPanel } from '@/components/settings/AccountSettingsPanel';

export default function RecruiterSettingsPage() {
  return (
    <DashboardShell
      role="RECRUITER"
      title="Recruiter Account Settings"
      subtitle="Update your recruiter profile details, security credentials, and workspace preferences"
    >
      <AccountSettingsPanel />
    </DashboardShell>
  );
}
