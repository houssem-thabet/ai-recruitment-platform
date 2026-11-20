'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, CheckCircle2, Save } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  Input,
  Select,
  Textarea,
  AIModeBadge,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';

export default function CreateJobPage() {
  const router = useRouter();
  const toast = useToast();

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [aiMode, setAiMode] = useState('DETERMINISTIC_NLP');
  const [humanApproved, setHumanApproved] = useState(false);

  const [form, setForm] = useState({
    title: '',
    industry: 'Enterprise Software & AI',
    location: 'Paris, France',
    workMode: 'HYBRID',
    employmentType: 'FULL_TIME',
    experienceLevel: 'MID',
    minYearsExperience: 3,
    educationRequirement: "Bachelor's or Master's degree in Computer Science or equivalent",
    salaryMin: '65000',
    salaryMax: '88000',
    deadline: '',
    technicalSkillsText: 'TypeScript, React, Next.js, Node.js, PostgreSQL',
    softSkillsText: 'Communication, Problem Solving, Agile & Scrum',
    description: '',
    responsibilitiesText: '',
    qualificationsText: '',
    preferredQualificationsText: '',
    benefitsText:
      'Competitive salary & annual equity review\nFlexible hybrid work & learning budget\nComprehensive health coverage',
    status: 'PUBLISHED',
  });

  const handleGenerateWithAI = async () => {
    if (!form.title.trim()) {
      toast.error('Enter a Job Title first so the AI can tailor the description.');
      return;
    }
    setGenerating(true);
    try {
      const skillsArr = form.technicalSkillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await apiFetch('/api/ai/generate-job-description', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          industry: form.industry,
          requiredSkills: skillsArr,
          experienceLevel: form.experienceLevel,
          responsibilitiesHint: form.responsibilitiesText,
          employmentType: form.employmentType,
          location: form.location,
          workMode: form.workMode,
        }),
      });
      const g = res.generated;
      setForm((prev) => ({
        ...prev,
        title: g.professionalTitle || prev.title,
        description: `${g.overview}\n\nApplication Instructions:\n${g.applicationInstructions}`,
        responsibilitiesText: (g.responsibilities || []).join('\n'),
        qualificationsText: (g.requiredQualifications || []).join('\n'),
        preferredQualificationsText: (g.preferredQualifications || []).join('\n'),
        technicalSkillsText: (g.requiredSkills || []).join(', '),
        softSkillsText: (g.softSkills || []).join(', '),
        benefitsText: (g.benefits || []).join('\n'),
      }));
      setAiGenerated(true);
      setAiMode(g.aiMode);
      setHumanApproved(false);
      toast.success('AI Job Description generated! Review & approve below before publishing.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (aiGenerated && form.status === 'PUBLISHED' && !humanApproved) {
      toast.error('Please check the Human Approval box to confirm you reviewed the AI draft.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          responsibilities: form.responsibilitiesText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          qualifications: form.qualificationsText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          preferredQualifications: form.preferredQualificationsText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          benefits: form.benefitsText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          technicalSkills: form.technicalSkillsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          softSkills: form.softSkillsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          experienceLevel: form.experienceLevel,
          minYearsExperience: Number(form.minYearsExperience),
          educationRequirement: form.educationRequirement,
          employmentType: form.employmentType,
          location: form.location,
          workMode: form.workMode,
          salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
          salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
          deadline: form.deadline || null,
          status: form.status,
          aiGenerated,
          humanApproved: aiGenerated ? humanApproved : true,
        }),
      });
      toast.success('Job advertisement saved!');
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
      title="Create Job & AI Description Generator"
      subtitle="Craft a structured job opportunity manually or generate a bias-checked draft with TalentAI"
    >
      {/* AI Job Description Generator Banner */}
      <Card className="p-5 bg-gradient-to-r from-[#101B35] to-[#182B54] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#28C5D8]" />
            <h3 className="text-sm font-bold">AI Job Description Generator</h3>
          </div>
          <p className="text-xs text-slate-300">
            Fill in Job Title, Required Skills, Seniority, and Location below, then click
            Generate to draft a complete structured posting.
          </p>
        </div>
        <Button
          type="button"
          variant="accent"
          loading={generating}
          onClick={handleGenerateWithAI}
        >
          <Sparkles className="w-4 h-4" /> Generate / Regenerate with AI
        </Button>
      </Card>

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {aiGenerated && <AIModeBadge mode={aiMode} />}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Job Title *"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Senior Full-Stack Engineer"
              />
            </div>
            <Input
              label="Industry"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Required Technical Skills * (comma-separated)"
              required
              value={form.technicalSkillsText}
              onChange={(e) => setForm({ ...form, technicalSkillsText: e.target.value })}
            />
            <Input
              label="Required Soft Skills (comma-separated)"
              value={form.softSkillsText}
              onChange={(e) => setForm({ ...form, softSkillsText: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Select
              label="Experience Level"
              value={form.experienceLevel}
              onChange={(e) => setForm({ ...form, experienceLevel: e.target.value })}
            >
              <option value="ENTRY">Entry</option>
              <option value="JUNIOR">Junior</option>
              <option value="MID">Mid-Level</option>
              <option value="SENIOR">Senior</option>
              <option value="LEAD">Lead / Staff</option>
              <option value="EXECUTIVE">Executive</option>
            </Select>
            <Input
              label="Min Years Exp"
              type="number"
              min={0}
              value={form.minYearsExperience}
              onChange={(e) =>
                setForm({ ...form, minYearsExperience: Number(e.target.value) })
              }
            />
            <Select
              label="Employment Type"
              value={form.employmentType}
              onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
            >
              <option value="FULL_TIME">Full-Time</option>
              <option value="PART_TIME">Part-Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERNSHIP">Internship</option>
            </Select>
            <Select
              label="Workplace Mode"
              value={form.workMode}
              onChange={(e) => setForm({ ...form, workMode: e.target.value })}
            >
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ONSITE">On-Site</option>
              <option value="FLEXIBLE">Flexible</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Input
              label="Location *"
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <Input
              label="Salary Min (USD)"
              type="number"
              value={form.salaryMin}
              onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
            />
            <Input
              label="Salary Max (USD)"
              type="number"
              value={form.salaryMax}
              onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
            />
            <Input
              label="Application Deadline"
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>

          <Input
            label="Education Requirements"
            value={form.educationRequirement}
            onChange={(e) => setForm({ ...form, educationRequirement: e.target.value })}
          />

          <Textarea
            label="Job Overview & Description *"
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
              label="Required Qualifications (one per line)"
              rows={4}
              value={form.qualificationsText}
              onChange={(e) => setForm({ ...form, qualificationsText: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Textarea
              label="Preferred Qualifications (one per line)"
              rows={3}
              value={form.preferredQualificationsText}
              onChange={(e) =>
                setForm({ ...form, preferredQualificationsText: e.target.value })
              }
            />
            <Textarea
              label="Benefits (one per line)"
              rows={3}
              value={form.benefitsText}
              onChange={(e) => setForm({ ...form, benefitsText: e.target.value })}
            />
          </div>

          {aiGenerated && (
            <label className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={humanApproved}
                onChange={(e) => setHumanApproved(e.target.checked)}
                className="mt-0.5 rounded border-amber-400 text-[#367BF5]"
              />
              <span className="text-amber-900 dark:text-amber-200">
                <strong>Mandatory Human Recruiter Approval:</strong> I confirm that I have
                reviewed, edited where needed, and approved this AI-assisted job
                description as accurate and non-discriminatory.
              </span>
            </label>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="w-48">
              <Select
                label="Publication Status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="PUBLISHED">Publish Immediately</option>
                <option value="DRAFT">Save as Draft</option>
              </Select>
            </div>

            <Button type="submit" size="lg" loading={saving}>
              {form.status === 'PUBLISHED' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Publish Job Advertisement
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Draft
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}
