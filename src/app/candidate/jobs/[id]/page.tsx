'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { JobDetailView } from '@/components/jobs/JobDetailView';

export default function CandidateJobDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <DashboardShell
      role="CANDIDATE"
      title="Job Opportunity & Compatibility Preview"
      subtitle="Review full role requirements, inspect your AI match breakdown, and submit your application"
    >
      <Link
        href="/candidate/jobs"
        className="inline-flex items-center text-xs font-semibold text-[#367BF5] hover:underline"
      >
        ← Back to Find Jobs
      </Link>
      <JobDetailView jobId={params.id} />
    </DashboardShell>
  );
}
