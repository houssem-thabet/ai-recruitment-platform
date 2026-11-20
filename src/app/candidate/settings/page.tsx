'use client';

import React from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { AccountSettingsPanel } from '@/components/settings/AccountSettingsPanel';

export default function CandidateSettingsPage() {
  return (
    <DashboardShell
      role="CANDIDATE"
      title="Account & Privacy Settings"
      subtitle="Manage your personal credentials, password security, and data deletion controls"
    >
      <AccountSettingsPanel />
    </DashboardShell>
  );
}
