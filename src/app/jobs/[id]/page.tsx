import React from 'react';
import Link from 'next/link';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { JobDetailView } from '@/components/jobs/JobDetailView';

export default function PublicJobDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FB] dark:bg-[#090E1D]">
      <PublicNavbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-4">
        <Link
          href="/jobs"
          className="inline-flex items-center text-xs font-semibold text-[#367BF5] hover:underline"
        >
          ← Back to All Opportunities
        </Link>
        <JobDetailView jobId={params.id} />
      </main>
      <PublicFooter />
    </div>
  );
}
