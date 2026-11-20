'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Button, Card, Badge, PageLoader } from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';

export default function AdminCompaniesPage() {
  const toast = useToast();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiFetch('/api/admin/companies')
      .then((d) => setCompanies(d.companies || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const toggleVerify = async (companyId: string, verified: boolean) => {
    await apiFetch('/api/admin/companies', {
      method: 'PUT',
      body: JSON.stringify({ companyId, verified }),
    });
    toast.success('Company verification status updated.');
    load();
  };

  return (
    <DashboardShell
      role="ADMIN"
      title="Company Management"
      subtitle="Review registered hiring companies, industries, and employer verification status"
    >
      {loading ? (
        <PageLoader />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {companies.map((c) => (
            <Card key={c.id} className="p-6 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-[#101B35] dark:text-white">
                    {c.name}
                  </h3>
                  <p className="text-xs text-[#367BF5] font-semibold">
                    {c.industry} • {c.size} employees • {c.location}
                  </p>
                </div>
                {c.verified ? (
                  <Badge variant="success">Verified</Badge>
                ) : (
                  <Badge variant="warning">Unverified</Badge>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {c.description}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-500">
                  {c._count?.jobs || 0} Jobs • {c.recruiters?.length || 0} Recruiter(s)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleVerify(c.id, !c.verified)}
                >
                  {c.verified ? (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Revoke Badge
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Verify
                      Employer
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
