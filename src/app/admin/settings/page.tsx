'use client';

import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Button, Card, Input, PageLoader } from '@/components/ui/primitives';
import { AccountSettingsPanel } from '@/components/settings/AccountSettingsPanel';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';

export default function AdminSettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/api/admin/settings')
      .then((d) => setSettings(d.settings || {}))
      .finally(() => setLoading(false));
  }, []);

  const savePlatformSettings = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      toast.success('Platform governance settings saved.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      role="ADMIN"
      title="Platform Governance & Settings"
      subtitle="Configure global CV upload limits, data retention windows, and Responsible AI guardrails"
    >
      {loading ? (
        <PageLoader />
      ) : (
        <div className="space-y-8">
          <Card className="p-6 max-w-3xl space-y-5">
            <h3 className="text-base font-bold text-[#101B35] dark:text-white">
              Global Platform Parameters
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Max CV Upload Size (MB)"
                type="number"
                value={settings.maxCvSizeMb ?? 5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxCvSizeMb: Number(e.target.value),
                  })
                }
              />
              <Input
                label="Candidate Data Retention (Days)"
                type="number"
                value={settings.dataRetentionDays ?? 365}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    dataRetentionDays: Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requireHumanApprovalForAIJobs !== false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      requireHumanApprovalForAIJobs: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-[#367BF5]"
                />
                <span>
                  Enforce mandatory human approval before publishing AI-generated job
                  descriptions
                </span>
              </label>

              <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowPublicCandidateRegistration !== false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      allowPublicCandidateRegistration: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-[#367BF5]"
                />
                <span>Allow public self-service Candidate registration</span>
              </label>

              <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowPublicRecruiterRegistration !== false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      allowPublicRecruiterRegistration: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-[#367BF5]"
                />
                <span>Allow public self-service Recruiter &amp; Company registration</span>
              </label>
            </div>

            <div className="flex justify-end">
              <Button onClick={savePlatformSettings} loading={saving}>
                <Save className="w-4 h-4" /> Save Governance Configuration
              </Button>
            </div>
          </Card>

          <AccountSettingsPanel />
        </div>
      )}
    </DashboardShell>
  );
}
