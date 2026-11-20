'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  MapPin,
  Building2,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  PageLoader,
  EmptyState,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { formatDate, formatSalaryRange } from '@/lib/utils';

export function JobBoardView({
  detailBasePath = '/jobs',
}: {
  detailBasePath?: string;
}) {
  const { user } = useAuth();
  const toast = useToast();

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  const [q, setQ] = useState('');
  const [location, setLocation] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (location) params.set('location', location);
      if (workMode) params.set('workMode', workMode);
      if (employmentType) params.set('employmentType', employmentType);
      if (experienceLevel) params.set('experienceLevel', experienceLevel);
      params.set('sort', sort);
      params.set('page', String(page));
      params.set('limit', '6');

      const data = await apiFetch(`/api/jobs?${params.toString()}`);
      setJobs(data.jobs || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err: any) {
      toast.error(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [q, location, workMode, employmentType, experienceLevel, sort, page, toast]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const toggleBookmark = async (jobId: string) => {
    if (!user || user.role !== 'CANDIDATE') {
      toast.info('Sign in with a Candidate account to save jobs.');
      return;
    }
    try {
      const res = await apiFetch('/api/candidates/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      });
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, isBookmarked: res.bookmarked } : j))
      );
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters Card */}
      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Input
              placeholder="Search title, skill (React, Python, Kubernetes), or company..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="md:col-span-3">
            <Input
              placeholder="Location (Paris, Remote, Tunis...)"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="md:col-span-2">
            <Select
              value={workMode}
              onChange={(e) => {
                setWorkMode(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Work Modes</option>
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ONSITE">On-Site</option>
              <option value="FLEXIBLE">Flexible</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="newest">Newest First</option>
              <option value="salary_desc">Highest Salary</option>
              <option value="views">Most Viewed</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <Select
            value={experienceLevel}
            onChange={(e) => {
              setExperienceLevel(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Experience Levels</option>
            <option value="ENTRY">Entry-Level</option>
            <option value="JUNIOR">Junior</option>
            <option value="MID">Mid-Level</option>
            <option value="SENIOR">Senior</option>
            <option value="LEAD">Lead / Staff</option>
          </Select>

          <Select
            value={employmentType}
            onChange={(e) => {
              setEmploymentType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Employment Types</option>
            <option value="FULL_TIME">Full-Time</option>
            <option value="PART_TIME">Part-Time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERNSHIP">Internship</option>
          </Select>

          <div className="flex items-center justify-between px-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Showing <strong>{jobs.length}</strong> of <strong>{pagination.total}</strong>{' '}
              opportunities
            </span>
            {(q || location || workMode || employmentType || experienceLevel) && (
              <button
                onClick={() => {
                  setQ('');
                  setLocation('');
                  setWorkMode('');
                  setEmploymentType('');
                  setExperienceLevel('');
                  setPage(1);
                }}
                className="text-[#367BF5] font-semibold hover:underline"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </Card>

      {loading ? (
        <PageLoader label="Searching open opportunities..." />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6" />}
          title="No matching jobs found"
          description="Try broadening your search keywords or clearing active filters."
        />
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className="p-6 hover:border-[#367BF5]/50 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2.5 flex-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <Badge variant="electric">{job.workMode}</Badge>
                    <Badge variant="default">
                      {job.employmentType.replace('_', ' ')}
                    </Badge>
                    <Badge variant="cyan">{job.experienceLevel}</Badge>
                    {job.hasApplied && (
                      <Badge variant="success">
                        <CheckCircle2 className="w-3 h-3" /> Applied
                      </Badge>
                    )}
                  </div>

                  <Link
                    href={`${detailBasePath}/${job.id}`}
                    className="block text-xl font-bold text-[#101B35] dark:text-white hover:text-[#367BF5]"
                  >
                    {job.title}
                  </Link>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                      <Building2 className="w-3.5 h-3.5 text-[#367BF5]" />
                      {job.company?.name}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {job.location}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" /> {job.minYearsExperience}+ yrs exp
                    </span>
                    <span>Published {formatDate(job.publishedAt)}</span>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {job.skills?.map((js: any) => (
                      <Badge key={js.id} variant="default">
                        {js.skill.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0">
                  <p className="text-sm font-extrabold text-[#367BF5]">
                    {formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleBookmark(job.id)}
                      aria-label="Bookmark job"
                      className={`p-2.5 rounded-xl border transition-colors ${
                        job.isBookmarked
                          ? 'bg-[#367BF5]/10 border-[#367BF5] text-[#367BF5]'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#367BF5]'
                      }`}
                    >
                      {job.isBookmarked ? (
                        <BookmarkCheck className="w-4 h-4" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>
                    <Link href={`${detailBasePath}/${job.id}`}>
                      <Button size="sm">
                        View &amp; Apply <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
