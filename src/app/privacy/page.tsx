import React from 'react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Card, Badge } from '@/components/ui/primitives';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FB] dark:bg-[#090E1D]">
      <PublicNavbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <div className="space-y-2">
          <Badge variant="cyan">Mandatory Governance &amp; Privacy Notice</Badge>
          <h1 className="text-3xl font-extrabold text-[#101B35] dark:text-white">
            Privacy Policy &amp; CV Processing Notice
          </h1>
          <p className="text-xs text-slate-500">Last Updated: November 2026</p>
        </div>

        <Card className="p-6 sm:p-8 space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#101B35] dark:text-white">
              1. Personal Information &amp; CV Documents Collected
            </h2>
            <p>
              TalentAI processes information voluntarily provided by users, including
              account contact details, professional biography, education, work experience,
              skills, and uploaded PDF/DOCX Curriculum Vitae (CV) documents.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#101B35] dark:text-white">
              2. Private Storage &amp; Access Controls
            </h2>
            <p>
              Uploaded CV files are validated against strict size limits (5 MB) and binary
              file signatures, then stored in a non-public server directory. Your CV is
              accessible strictly to you and to authorized recruiters at companies to which
              you submit an application. Platform administrators do not receive automatic
              access to confidential CV files.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#101B35] dark:text-white">
              3. Responsible AI &amp; Non-Discrimination Safeguards
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Decision Support Only:</strong> Compatibility scores (0–100) are
                advisory estimates; TalentAI never performs automated candidate rejections
                or automated final hiring decisions.
              </li>
              <li>
                <strong>No Protected Attributes:</strong> Race, religion, gender, age,
                disability, and nationality are excluded from matching and ranking models.
              </li>
              <li>
                <strong>Zero Biometric Inference:</strong> Interview evaluation tools
                process written notes with explicit consent only and never analyze voice,
                facial expressions, or personality traits.
              </li>
              <li>
                <strong>Data Minimization:</strong> When an external LLM API is enabled,
                email addresses and phone numbers are redacted prior to transmission.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#101B35] dark:text-white">
              4. Candidate Control, Correction &amp; Permanent Deletion
            </h2>
            <p>
              Candidates can toggle recruiter searchability at any time in Profile Settings,
              review and correct any AI-extracted CV fields, delete individual CV documents
              immediately, or permanently erase their entire account and stored files from
              Account Settings.
            </p>
          </section>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
