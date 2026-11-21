import prisma from '@/lib/prisma';
import { DEFAULT_MATCH_WEIGHTS } from '@/lib/ai/engine';

export interface PlatformSettingsConfig {
  matchWeights: typeof DEFAULT_MATCH_WEIGHTS;
  maxCvSizeMb: number;
  dataRetentionDays: number;
  requireHumanApprovalForAIJobs: boolean;
  allowPublicCandidateRegistration: boolean;
  allowPublicRecruiterRegistration: boolean;
  maintenanceAnnouncement: string;
}

export const DEFAULT_PLATFORM_CONFIG: PlatformSettingsConfig = {
  matchWeights: DEFAULT_MATCH_WEIGHTS,
  maxCvSizeMb: 5,
  dataRetentionDays: 365,
  requireHumanApprovalForAIJobs: true,
  allowPublicCandidateRegistration: true,
  allowPublicRecruiterRegistration: true,
  maintenanceAnnouncement: '',
};

export const ALLOWED_PLATFORM_SETTING_KEYS = new Set<keyof PlatformSettingsConfig>([
  'matchWeights',
  'maxCvSizeMb',
  'dataRetentionDays',
  'requireHumanApprovalForAIJobs',
  'allowPublicCandidateRegistration',
  'allowPublicRecruiterRegistration',
  'maintenanceAnnouncement',
]);

export async function getPlatformSettings(): Promise<PlatformSettingsConfig> {
  const rows = await prisma.platformSetting.findMany();
  const merged: Record<string, unknown> = { ...DEFAULT_PLATFORM_CONFIG };
  for (const r of rows) {
    if (ALLOWED_PLATFORM_SETTING_KEYS.has(r.key as keyof PlatformSettingsConfig)) {
      merged[r.key] = r.value;
    }
  }
  return {
    matchWeights:
      merged.matchWeights && typeof merged.matchWeights === 'object'
        ? (merged.matchWeights as typeof DEFAULT_MATCH_WEIGHTS)
        : DEFAULT_MATCH_WEIGHTS,
    maxCvSizeMb: Math.min(25, Math.max(1, Number(merged.maxCvSizeMb) || 5)),
    dataRetentionDays: Math.min(
      3650,
      Math.max(30, Number(merged.dataRetentionDays) || 365)
    ),
    requireHumanApprovalForAIJobs: merged.requireHumanApprovalForAIJobs !== false,
    allowPublicCandidateRegistration: merged.allowPublicCandidateRegistration !== false,
    allowPublicRecruiterRegistration: merged.allowPublicRecruiterRegistration !== false,
    maintenanceAnnouncement:
      typeof merged.maintenanceAnnouncement === 'string'
        ? merged.maintenanceAnnouncement
        : '',
  };
}
