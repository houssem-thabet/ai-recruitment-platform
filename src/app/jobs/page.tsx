import React from 'react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { JobBoardView } from '@/components/jobs/JobBoardView';

export default function PublicJobsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FB] dark:bg-[#090E1D]">
      <PublicNavbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#101B35] dark:text-white">
            Discover Open Opportunities
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Filter roles by skill stack, workplace mode, seniority, and compensation
          </p>
        </div>
        <JobBoardView detailBasePath="/jobs" />
      </main>
      <PublicFooter />
    </div>
  );
}
