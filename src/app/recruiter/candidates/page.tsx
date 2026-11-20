'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Search, MapPin, Briefcase, MessageSquare } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  Badge,
  Input,
  Textarea,
  Modal,
  PageLoader,
  EmptyState,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';

export default function RecruiterCandidateDatabasePage() {
  const toast = useToast();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [skill, setSkill] = useState('');
  const [location, setLocation] = useState('');
  const [minExp, setMinExp] = useState('');
  const [education, setEducation] = useState('');
  const [language, setLanguage] = useState('');

  const [msgTarget, setMsgTarget] = useState<any | null>(null);
  const [msgContent, setMsgContent] = useState('');

  const searchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (q) p.set('q', q);
      if (skill) p.set('skill', skill);
      if (location) p.set('location', location);
      if (minExp) p.set('minExp', minExp);
      if (education) p.set('education', education);
      if (language) p.set('language', language);

      const d = await apiFetch(`/api/candidates?${p.toString()}`);
      setCandidates(d.candidates || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [q, skill, location, minExp, education, language, toast]);

  useEffect(() => {
    searchCandidates();
  }, [searchCandidates]);

  const sendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgTarget || !msgContent.trim()) return;
    try {
      await apiFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          recipientUserId: msgTarget.user.id,
          subject: 'TalentAI Opportunity Outreach',
          content: msgContent,
        }),
      });
      toast.success('Outreach message sent!');
      setMsgTarget(null);
      setMsgContent('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <DashboardShell
      role="RECRUITER"
      title="Authorized Candidate Database"
      subtitle="Search candidates who opted into recruiter discovery across skills, experience, education, location, and languages"
    >
      <Card className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <Input
          placeholder="Name or keyword..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Input
          placeholder="Skill (e.g. Python, React)"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
        />
        <Input
          placeholder="Location (e.g. Tunis, Paris)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <Input
          placeholder="Min Years Exp"
          type="number"
          min={0}
          value={minExp}
          onChange={(e) => setMinExp(e.target.value)}
        />
        <Input
          placeholder="Education (M.Sc, B.Sc)"
          value={education}
          onChange={(e) => setEducation(e.target.value)}
        />
        <Input
          placeholder="Language (English, French)"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        />
      </Card>

      {loading ? (
        <PageLoader />
      ) : candidates.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6" />}
          title="No matching candidates found"
          description="Broaden your skill, experience, or location criteria."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {candidates.map((c) => (
            <Card key={c.id} className="p-6 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-[#101B35] dark:text-white">
                      {c.user.firstName} {c.user.lastName}
                    </h3>
                    <p className="text-xs font-semibold text-[#367BF5]">{c.headline}</p>
                  </div>
                  <Badge variant="cyan">{c.remotePreference}</Badge>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {c.location || 'Flexible'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" /> {c.yearsOfExperience} yrs exp
                  </span>
                </div>

                {c.educations?.[0] && (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    🎓 {c.educations[0].degree} — {c.educations[0].institution}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {c.skills?.slice(0, 7).map((cs: any) => (
                    <Badge key={cs.id} variant="default">
                      {cs.skill.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMsgTarget(c)}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Reach Out
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(msgTarget)}
        onClose={() => setMsgTarget(null)}
        title={`Contact ${msgTarget?.user?.firstName || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={sendDirectMessage} className="space-y-4">
          <Textarea
            label="Outreach Message *"
            rows={4}
            required
            value={msgContent}
            onChange={(e) => setMsgContent(e.target.value)}
            placeholder="Share why their background caught your team's attention..."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setMsgTarget(null)}>
              Cancel
            </Button>
            <Button type="submit">Send Message</Button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
