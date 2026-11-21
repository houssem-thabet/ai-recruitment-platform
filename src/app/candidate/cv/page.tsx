'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  UploadCloud,
  FileText,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Download,
  Save,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  Badge,
  Input,
  Textarea,
  Modal,
  PageLoader,
  ScoreBadge,
  AIModeBadge,
  EmptyState,
} from '@/components/ui/primitives';
import { apiDownload, apiFetch, getStoredToken } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';
import { formatDateTime } from '@/lib/utils';

export default function CandidateCVPage() {
  const toast = useToast();
  const [cvDocuments, setCvDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  // Editable extracted data state for Candidate Review & Correction (Part 4B & Part 6 Feature 1)
  const [editOpen, setEditOpen] = useState(false);
  const [editingCvId, setEditingCvId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editTechSkills, setEditTechSkills] = useState('');
  const [editSoftSkills, setEditSoftSkills] = useState('');
  const [editYears, setEditYears] = useState('');
  const [savingCorrection, setSavingCorrection] = useState(false);

  const loadCVs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/candidates/cv');
      setCvDocuments(data.cvDocuments || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCVs();
  }, [loadCVs]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('syncToProfile', 'true');

      const token = getStoredToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/candidates/cv', {
        method: 'POST',
        headers,
        body: fd,
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');

      toast.success('CV uploaded, text extracted, and AI analysis saved!');
      await loadCVs();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const openCorrectionModal = (cv: any) => {
    const ext = cv.analysis?.extractedData || {};
    setEditingCvId(cv.id);
    setEditFullName(ext.fullName || '');
    setEditSummary(ext.summary || '');
    setEditTechSkills((ext.technicalSkills || []).join(', '));
    setEditSoftSkills((ext.softSkills || []).join(', '));
    setEditYears(ext.yearsOfExperience !== null && ext.yearsOfExperience !== undefined ? String(ext.yearsOfExperience) : '');
    setEditOpen(true);
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCvId) return;
    const targetCv = cvDocuments.find((c) => c.id === editingCvId);
    const prevExt = targetCv?.analysis?.extractedData || {};
    setSavingCorrection(true);
    try {
      await apiFetch(`/api/candidates/cv/${editingCvId}`, {
        method: 'PUT',
        body: JSON.stringify({
          extractedData: {
            ...prevExt,
            fullName: editFullName,
            summary: editSummary,
            technicalSkills: editTechSkills
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
            softSkills: editSoftSkills
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
            yearsOfExperience: editYears ? Number(editYears) : null,
          },
        }),
      });
      toast.success('Extracted CV information corrected and verified!');
      setEditOpen(false);
      await loadCVs();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingCorrection(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/candidates/cv/${id}`, { method: 'DELETE' });
      toast.success('CV deleted permanently.');
      await loadCVs();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const primaryCv = cvDocuments.find((c) => c.isPrimary) || cvDocuments[0];
  const analysis = primaryCv?.analysis;

  return (
    <DashboardShell
      role="CANDIDATE"
      title="My CV & AI CV Analyzer"
      subtitle="Upload PDF or DOCX CVs for structured extraction, completeness scoring, and candidate verification"
    >
      {/* Upload Card */}
      <Card className="p-6 sm:p-8 border-2 border-dashed border-[#367BF5]/40 bg-gradient-to-br from-white to-[#367BF5]/5 dark:from-[#101B35] dark:to-[#367BF5]/10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#367BF5]/15 text-[#367BF5] flex items-center justify-center shrink-0">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#101B35] dark:text-white">
                Upload or Replace Your CV (PDF or DOCX)
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl">
                Maximum size 5 MB. Stored privately outside web-accessible folders. TalentAI
                extracts skills, experience, education, and achievements without inventing
                qualifications.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1.5 text-xs">
                <a
                  href="/sample-cvs/sample-fullstack-cv.pdf"
                  download
                  className="text-[#367BF5] font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Download Sample PDF CV
                </a>
                <a
                  href="/sample-cvs/sample-ai-engineer-cv.docx"
                  download
                  className="text-[#28C5D8] font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Download Sample DOCX CV
                </a>
              </div>
            </div>
          </div>

          <label className="cursor-pointer shrink-0">
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <span className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#367BF5] hover:bg-[#1A62E6] text-white text-sm font-semibold shadow-md transition-all">
              <UploadCloud className="w-4 h-4" />
              {uploading ? 'Extracting & Analyzing...' : 'Select PDF / DOCX File'}
            </span>
          </label>
        </div>
      </Card>

      {loading ? (
        <PageLoader />
      ) : cvDocuments.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title="No CV uploaded yet"
          description="Upload a PDF or DOCX CV above to run the AI CV Analyzer."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Uploaded CV Files */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-base font-bold text-[#101B35] dark:text-white">
              Uploaded Documents ({cvDocuments.length})
            </h3>
            {cvDocuments.map((cv) => (
              <Card key={cv.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#101B35] dark:text-white truncate">
                      {cv.originalName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {Math.round(cv.fileSize / 1024)} KB • {formatDateTime(cv.createdAt)}
                    </p>
                  </div>
                  {cv.isPrimary && <Badge variant="success">Primary</Badge>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewDoc(cv)}
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview Text
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      apiDownload(
                        `/api/candidates/cv/${cv.id}?download=1`,
                        cv.originalName || 'candidate-cv.pdf'
                      ).catch((err) => toast.error(err.message))
                    }
                  >
                    <Download className="w-3.5 h-3.5" /> File
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(cv.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Right: Structured AI CV Analysis */}
          <div className="lg:col-span-8 space-y-5">
            {analysis && (
              <Card className="p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#367BF5]" />
                      <h3 className="text-lg font-bold text-[#101B35] dark:text-white">
                        AI CV Analysis Report
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AIModeBadge mode={analysis.aiMode} />
                      {analysis.reviewedByCandidate && (
                        <Badge variant="success">Verified by Candidate</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[11px] uppercase text-slate-500 font-semibold">
                        Completeness
                      </p>
                      <ScoreBadge score={analysis.completenessScore} />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCorrectionModal(primaryCv)}
                    >
                      Review &amp; Correct Data
                    </Button>
                  </div>
                </div>

                {/* Extracted Information Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 space-y-1">
                    <p className="text-xs font-semibold text-slate-500">Extracted Name</p>
                    <p className="font-bold text-[#101B35] dark:text-white">
                      {analysis.extractedData?.fullName}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 space-y-1">
                    <p className="text-xs font-semibold text-slate-500">
                      Determinable Experience
                    </p>
                    <p className="font-bold text-[#101B35] dark:text-white">
                      {analysis.extractedData?.yearsOfExperience !== null &&
                      analysis.extractedData?.yearsOfExperience !== undefined
                        ? `${analysis.extractedData.yearsOfExperience} Year(s)`
                        : 'Requires manual confirmation'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-[#101B35] dark:text-white">
                    Skills &amp; Experience Overview
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {analysis.skillsOverview} {analysis.experienceOverview}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {analysis.extractedData?.technicalSkills?.map((s: string) => (
                      <Badge key={s} variant="electric">
                        {s}
                      </Badge>
                    ))}
                    {analysis.extractedData?.softSkills?.map((s: string) => (
                      <Badge key={s} variant="cyan">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                    <h4 className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Identified Strengths
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {analysis.strengths?.map((st: string, i: number) => (
                        <li key={i}>• {st}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                    <h4 className="text-xs font-bold uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Missing / Improvement Tips
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {analysis.missingInfo?.map((m: string, i: number) => (
                        <li key={`m-${i}`} className="font-semibold">
                          • Missing: {m}
                        </li>
                      ))}
                      {analysis.suggestions?.map((sg: string, i: number) => (
                        <li key={`s-${i}`}>• {sg}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                    Recommended Job Categories
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.recommendedCategories?.map((cat: string) => (
                      <Badge key={cat} variant="purple">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Preview Extracted Document Text Modal */}
      <Modal
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={`Document Preview — ${previewDoc?.originalName || ''}`}
      >
        <pre className="whitespace-pre-wrap text-xs font-mono bg-slate-50 dark:bg-[#090E1D] p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 max-h-[60vh] overflow-y-auto">
          {previewDoc?.extractedText}
        </pre>
      </Modal>

      {/* Candidate Review & Correction Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Review & Correct Extracted CV Information"
      >
        <form onSubmit={handleSaveCorrection} className="space-y-4">
          <Input
            label="Full Name"
            value={editFullName}
            onChange={(e) => setEditFullName(e.target.value)}
          />
          <Input
            label="Years of Relevant Experience"
            type="number"
            value={editYears}
            onChange={(e) => setEditYears(e.target.value)}
          />
          <Textarea
            label="Extracted Professional Summary"
            rows={3}
            value={editSummary}
            onChange={(e) => setEditSummary(e.target.value)}
          />
          <Input
            label="Technical Skills (comma-separated)"
            value={editTechSkills}
            onChange={(e) => setEditTechSkills(e.target.value)}
          />
          <Input
            label="Soft Skills (comma-separated)"
            value={editSoftSkills}
            onChange={(e) => setEditSoftSkills(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={savingCorrection}>
              <Save className="w-4 h-4" /> Verify &amp; Save Corrections
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
