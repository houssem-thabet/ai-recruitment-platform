'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  Input,
  Select,
  Textarea,
  PageLoader,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';

export default function EditJobPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    location: '',
    workMode: 'HYBRID',
    employmentType: 'FULL_TIME',
    experienceLevel: 'MID',
    minYearsExperience: 2,
    salaryMin: '',
    salaryMax: '',
    technicalSkillsText: '',
    softSkillsText: '',
    description: '',
    responsibilitiesText: '',
    qualificationsText: '',
    status: 'PUBLISHED',
  });

  useEffect(() => {
    apiFetch(`/api/jobs/${params.id}`)
      .then((d) => {
        const j = d.job;
        if (!j) return;
        setForm({
          title: j.title || '',
          location: j.location || '',
          workMode: j.workMode || 'HYBRID',
          employmentType: j.employmentType || 'FULL_TIME',
          experienceLevel: j.experienceLevel || 'MID',
          minYearsExperience: j.minYearsExperience || 0,
          salaryMin: j.salaryMin ? String(j.salaryMin) : '',
          salaryMax: j.salaryMax ? String(j.salaryMax) : '',
          technicalSkillsText: (j.skills || []).map((s: any) => s.skill.name).join(', '),
          softSkillsText: (j.softSkills || []).join(', '),
          description: j.description || '',
          responsibilitiesText: (j.responsibilities || []).join('\n'),
          qualificationsText: (j.qualifications || []).join('\n'),
          status: j.status || 'PUBLISHED',
        });
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/api/jobs/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: form.title,
          location: form.location,
          workMode: form.workMode,
          employmentType: form.employmentType,
          experienceLevel: form.experienceLevel,
          minYearsExperience: Number(form.minYearsExperience),
          salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
          salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
          technicalSkills: form.technicalSkillsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          softSkills: form.softSkillsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          description: form.description,
          responsibilities: form.responsibilitiesText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          qualifications: form.qualificationsText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          ...(form.status !== 'MODERATION_HOLD' ? { status: form.status } : {}),
        }),
      });
      toast.success('Job advertisement updated!');
      router.push('/recruiter/jobs');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      role="RECRUITER"
      title="Edit Job Advertisement"
      subtitle="Update requirements, compensation, skills, or publication status"
    >
      {loading ? (
        <PageLoader />
      ) : (
        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Job Title *"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <Input
                label="Location *"
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Select
                label="Status"
                value={form.status}
                disabled={form.status === 'MODERATION_HOLD'}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {form.status === 'MODERATION_HOLD' && (
                  <option value="MODERATION_HOLD">Moderation Hold (Admin Only)</option>
                )}
                <option value="PUBLISHED">Published</option>
                <option value="PAUSED">Paused</option>
                <option value="CLOSED">Closed</option>
                <option value="DRAFT">Draft</option>
              </Select>
              <Select
                label="Work Mode"
                value={form.workMode}
                onChange={(e) => setForm({ ...form, workMode: e.target.value })}
              >
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ONSITE">On-Site</option>
                <option value="FLEXIBLE">Flexible</option>
              </Select>
              <Input
                label="Salary Min"
                type="number"
                value={form.salaryMin}
                onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
              />
              <Input
                label="Salary Max"
                type="number"
                value={form.salaryMax}
                onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
              />
            </div>

            <Input
              label="Required Technical Skills (comma-separated)"
              value={form.technicalSkillsText}
              onChange={(e) => setForm({ ...form, technicalSkillsText: e.target.value })}
            />

            <Textarea
              label="Description *"
              rows={4}
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Textarea
                label="Responsibilities (one per line)"
                rows={4}
                value={form.responsibilitiesText}
                onChange={(e) => setForm({ ...form, responsibilitiesText: e.target.value })}
              />
              <Textarea
                label="Qualifications (one per line)"
                rows={4}
                value={form.qualificationsText}
                onChange={(e) => setForm({ ...form, qualificationsText: e.target.value })}
              />
            </div>

            <Button type="submit" loading={saving}>
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </form>
        </Card>
      )}
    </DashboardShell>
  );
}
