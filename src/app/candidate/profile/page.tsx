'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  Textarea,
  PageLoader,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';

export default function CandidateProfilePage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState(0);
  const [remotePreference, setRemotePreference] = useState('FLEXIBLE');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [careerInterestsInput, setCareerInterestsInput] = useState('');
  const [isSearchable, setIsSearchable] = useState(true);

  const [skills, setSkills] = useState<Array<{ name: string; category: string; level: string }>>([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('TECHNICAL');
  const [newSkillLevel, setNewSkillLevel] = useState('INTERMEDIATE');

  const [languages, setLanguages] = useState<Array<{ name: string; proficiency: string }>>([]);
  const [educations, setEducations] = useState<any[]>([]);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/api/candidates/profile')
      .then((d) => {
        const p = d.profile;
        if (!p) return;
        setHeadline(p.headline || '');
        setBio(p.bio || '');
        setLocation(p.location || '');
        setYearsOfExperience(p.yearsOfExperience || 0);
        setRemotePreference(p.remotePreference || 'FLEXIBLE');
        setLinkedinUrl(p.linkedinUrl || '');
        setGithubUrl(p.githubUrl || '');
        setPortfolioUrl(p.portfolioUrl || '');
        setCareerInterestsInput((p.careerInterests || []).join(', '));
        setIsSearchable(p.isSearchableByRecruiters ?? true);
        setSkills(
          (p.skills || []).map((cs: any) => ({
            name: cs.skill.name,
            category: cs.skill.category,
            level: cs.level,
          }))
        );
        setLanguages(Array.isArray(p.languages) ? p.languages : []);
        setEducations(
          (p.educations || []).map((e: any) => ({
            institution: e.institution,
            degree: e.degree,
            fieldOfStudy: e.fieldOfStudy,
            grade: e.grade || '',
          }))
        );
        setExperiences(
          (p.experiences || []).map((e: any) => ({
            company: e.company,
            title: e.title,
            location: e.location || '',
            startDate: e.startDate ? e.startDate.slice(0, 10) : '2022-01-01',
            current: e.current,
            description: e.description || '',
          }))
        );
        setCertifications(
          (p.certifications || []).map((c: any) => ({
            name: c.name,
            issuer: c.issuer,
          }))
        );
        setProjects(
          (p.projects || []).map((pr: any) => ({
            title: pr.title,
            description: pr.description || '',
            technologiesText: (pr.technologies || []).join(', '),
            repoUrl: pr.repoUrl || '',
          }))
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const addSkill = () => {
    if (!newSkillName.trim()) return;
    setSkills([
      ...skills,
      { name: newSkillName.trim(), category: newSkillCategory, level: newSkillLevel },
    ]);
    setNewSkillName('');
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/candidates/profile', {
        method: 'PUT',
        body: JSON.stringify({
          headline,
          bio,
          location,
          yearsOfExperience: Number(yearsOfExperience),
          remotePreference,
          linkedinUrl,
          githubUrl,
          portfolioUrl,
          careerInterests: careerInterestsInput
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          isSearchableByRecruiters: isSearchable,
          skills,
          languages,
          educations,
          experiences,
          certifications,
          projects: projects.map((pr) => ({
            title: pr.title,
            description: pr.description,
            technologies: (pr.technologiesText || '')
              .split(',')
              .map((t: string) => t.trim())
              .filter(Boolean),
            repoUrl: pr.repoUrl,
          })),
        }),
      });
      toast.success('Profile saved and AI matching vectors updated!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      role="CANDIDATE"
      title="My Professional Profile"
      subtitle="Manage your biography, technical & soft skills, education, work history, certifications, and projects"
      actions={
        <Button onClick={handleSaveAll} loading={saving}>
          <Save className="w-4 h-4" /> Save Complete Profile
        </Button>
      }
    >
      {loading ? (
        <PageLoader />
      ) : (
        <form onSubmit={handleSaveAll} className="space-y-6">
          {/* Personal & Links */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-bold text-[#101B35] dark:text-white">
                Professional Biography &amp; Links
              </h2>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSearchable}
                  onChange={(e) => setIsSearchable(e.target.checked)}
                  className="rounded border-slate-300 text-[#367BF5]"
                />
                Allow verified recruiters to discover my profile
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Professional Headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Senior Full-Stack Software Engineer"
                />
              </div>
              <Input
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Tunis, Tunisia / Paris"
              />
            </div>

            <Textarea
              label="Professional Biography"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Summarize your core strengths, architectural impact, and career goals..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Years of Experience"
                type="number"
                min={0}
                max={45}
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(Number(e.target.value))}
              />
              <Select
                label="Workplace Preference"
                value={remotePreference}
                onChange={(e) => setRemotePreference(e.target.value)}
              >
                <option value="FLEXIBLE">Flexible</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ONSITE">On-Site</option>
              </Select>
              <Input
                label="Career Interests (comma-separated)"
                value={careerInterestsInput}
                onChange={(e) => setCareerInterestsInput(e.target.value)}
                placeholder="AI & Machine Learning, FinTech"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="LinkedIn URL"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
              <Input
                label="GitHub URL"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/..."
              />
              <Input
                label="Portfolio Website"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </Card>

          {/* Technical & Soft Skills */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#101B35] dark:text-white">
              Technical &amp; Soft Skills
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <Input
                  placeholder="Add skill (e.g. TypeScript, Docker, Communication)..."
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                />
              </div>
              <div className="sm:col-span-3">
                <Select
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value)}
                >
                  <option value="TECHNICAL">Technical Skill</option>
                  <option value="SOFT">Soft Skill</option>
                  <option value="TOOL">Tool / Platform</option>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Select
                  value={newSkillLevel}
                  onChange={(e) => setNewSkillLevel(e.target.value)}
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={addSkill} className="w-full">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {skills.map((s, idx) => (
                <Badge
                  key={`${s.name}-${idx}`}
                  variant={s.category === 'SOFT' ? 'cyan' : 'electric'}
                  className="py-1 px-3"
                >
                  <span>
                    {s.name} ({s.level.toLowerCase()})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSkills(skills.filter((_, i) => i !== idx))}
                    className="ml-1.5 hover:text-rose-500"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </Card>

          {/* Spoken Languages */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#101B35] dark:text-white">Languages</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setLanguages([...languages, { name: 'French', proficiency: 'Fluent' }])
                }
              >
                <Plus className="w-3.5 h-3.5" /> Add Language
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {languages.map((lang, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={lang.name}
                    onChange={(e) => {
                      const next = [...languages];
                      next[idx].name = e.target.value;
                      setLanguages(next);
                    }}
                    placeholder="Language"
                  />
                  <Select
                    value={lang.proficiency}
                    onChange={(e) => {
                      const next = [...languages];
                      next[idx].proficiency = e.target.value;
                      setLanguages(next);
                    }}
                  >
                    <option value="Native">Native</option>
                    <option value="Fluent">Fluent</option>
                    <option value="Professional">Professional</option>
                    <option value="Conversational">Conversational</option>
                  </Select>
                  <button
                    type="button"
                    onClick={() => setLanguages(languages.filter((_, i) => i !== idx))}
                    className="p-2 text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Work Experience */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#101B35] dark:text-white">
                Work Experience
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setExperiences([
                    ...experiences,
                    {
                      company: '',
                      title: '',
                      location: '',
                      startDate: '2023-01-01',
                      current: true,
                      description: '',
                    },
                  ])
                }
              >
                <Plus className="w-3.5 h-3.5" /> Add Experience
              </Button>
            </div>
            {experiences.map((exp, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Role Title"
                    value={exp.title}
                    onChange={(e) => {
                      const n = [...experiences];
                      n[idx].title = e.target.value;
                      setExperiences(n);
                    }}
                  />
                  <Input
                    label="Company"
                    value={exp.company}
                    onChange={(e) => {
                      const n = [...experiences];
                      n[idx].company = e.target.value;
                      setExperiences(n);
                    }}
                  />
                  <Input
                    label="Start Date"
                    type="date"
                    value={exp.startDate}
                    onChange={(e) => {
                      const n = [...experiences];
                      n[idx].startDate = e.target.value;
                      setExperiences(n);
                    }}
                  />
                </div>
                <Textarea
                  label="Responsibilities & Achievements"
                  rows={2}
                  value={exp.description}
                  onChange={(e) => {
                    const n = [...experiences];
                    n[idx].description = e.target.value;
                    setExperiences(n);
                  }}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExperiences(experiences.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </Card>

          {/* Education, Certifications & Projects */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#101B35] dark:text-white">Education</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEducations([
                      ...educations,
                      { institution: '', degree: '', fieldOfStudy: 'Computer Science', grade: '' },
                    ])
                  }
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
              {educations.map((edu, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <Input
                    label="Degree"
                    value={edu.degree}
                    onChange={(e) => {
                      const n = [...educations];
                      n[idx].degree = e.target.value;
                      setEducations(n);
                    }}
                  />
                  <Input
                    label="Institution"
                    value={edu.institution}
                    onChange={(e) => {
                      const n = [...educations];
                      n[idx].institution = e.target.value;
                      setEducations(n);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEducations(educations.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Remove
                  </Button>
                </div>
              ))}
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#101B35] dark:text-white">
                  Certifications
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCertifications([...certifications, { name: '', issuer: '' }])
                  }
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
              {certifications.map((cert, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <Input
                    label="Certification Title"
                    value={cert.name}
                    onChange={(e) => {
                      const n = [...certifications];
                      n[idx].name = e.target.value;
                      setCertifications(n);
                    }}
                  />
                  <Input
                    label="Issuing Organization"
                    value={cert.issuer}
                    onChange={(e) => {
                      const n = [...certifications];
                      n[idx].issuer = e.target.value;
                      setCertifications(n);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setCertifications(certifications.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Remove
                  </Button>
                </div>
              ))}
            </Card>
          </div>

          {/* Portfolio Projects */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#101B35] dark:text-white">
                Technical &amp; Portfolio Projects
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setProjects([
                    ...projects,
                    { title: '', description: '', technologiesText: '', repoUrl: '' },
                  ])
                }
              >
                <Plus className="w-3.5 h-3.5" /> Add Project
              </Button>
            </div>
            {projects.map((pr, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Project Title"
                    value={pr.title}
                    onChange={(e) => {
                      const n = [...projects];
                      n[idx].title = e.target.value;
                      setProjects(n);
                    }}
                  />
                  <Input
                    label="Technologies (comma-separated)"
                    value={pr.technologiesText}
                    onChange={(e) => {
                      const n = [...projects];
                      n[idx].technologiesText = e.target.value;
                      setProjects(n);
                    }}
                  />
                </div>
                <Textarea
                  label="Description"
                  rows={2}
                  value={pr.description}
                  onChange={(e) => {
                    const n = [...projects];
                    n[idx].description = e.target.value;
                    setProjects(n);
                  }}
                />
                <div className="flex justify-between items-center gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Repository or Live URL (https://...)"
                      value={pr.repoUrl}
                      onChange={(e) => {
                        const n = [...projects];
                        n[idx].repoUrl = e.target.value;
                        setProjects(n);
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setProjects(projects.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" loading={saving}>
              <Save className="w-4 h-4" /> Save All Profile Changes
            </Button>
          </div>
        </form>
      )}
    </DashboardShell>
  );
}
