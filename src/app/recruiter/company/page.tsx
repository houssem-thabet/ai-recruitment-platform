'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Save, Building2 } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  Input,
  Select,
  Textarea,
  PageLoader,
  StatusBadge,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';

export default function RecruiterCompanyPage() {
  const toast = useToast();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    industry: '',
    website: '',
    location: '',
    size: '51-200',
    logoUrl: '',
    foundedYear: '2020',
  });

  useEffect(() => {
    apiFetch('/api/recruiter/company')
      .then((d) => {
        const c = d.company;
        setCompany(c);
        if (c) {
          setForm({
            name: c.name || '',
            description: c.description || '',
            industry: c.industry || '',
            website: c.website || '',
            location: c.location || '',
            size: c.size || '51-200',
            logoUrl: c.logoUrl || '',
            foundedYear: c.foundedYear ? String(c.foundedYear) : '2020',
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 120 * 1024) {
      toast.error('Please choose a logo image under 120 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, logoUrl: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/api/recruiter/company', {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          foundedYear: form.foundedYear ? Number(form.foundedYear) : null,
        }),
      });
      setCompany((prev: any) => ({ ...prev, ...res.company }));
      toast.success('Company profile updated!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      role="RECRUITER"
      title="Company Profile"
      subtitle="Manage your public employer brand, logo, industry details, and published jobs"
    >
      {loading ? (
        <PageLoader />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <Card className="p-6 sm:p-8">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex items-center gap-4 pb-2">
                  <div className="w-16 h-16 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                    {form.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.logoUrl}
                        alt={form.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Building2 className="w-7 h-7 text-[#367BF5]" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="cursor-pointer inline-block text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#367BF5]/10 text-[#367BF5] hover:bg-[#367BF5]/20">
                      Upload Logo (PNG/SVG &lt; 120 KB)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFile}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Stored as an inline data URI for instant preview rendering.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Company Name *"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <Input
                    label="Industry *"
                    required
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Website"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                  />
                  <Input
                    label="Headquarters / Location"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                  <Select
                    label="Company Size"
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                  >
                    <option value="1-10">1–10</option>
                    <option value="11-50">11–50</option>
                    <option value="51-200">51–200</option>
                    <option value="201-500">201–500</option>
                    <option value="501-1000">501–1,000</option>
                    <option value="1000+">1,000+</option>
                  </Select>
                </div>

                <Textarea
                  label="Company Description *"
                  rows={4}
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />

                <Button type="submit" loading={saving}>
                  <Save className="w-4 h-4" /> Save Company Profile
                </Button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <Card className="p-6 space-y-3">
              <h3 className="text-base font-bold text-[#101B35] dark:text-white">
                Published Jobs ({company?.jobs?.length || 0})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {company?.jobs?.map((j: any) => (
                  <div key={j.id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#101B35] dark:text-white truncate">
                        {j.title}
                      </span>
                      <StatusBadge status={j.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {j._count?.applications || 0} applications • {j.viewsCount} views
                    </p>
                  </div>
                ))}
              </div>
              <Link href="/recruiter/jobs/new" className="block pt-2">
                <Button variant="outline" size="sm" className="w-full">
                  + Create New Job
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
