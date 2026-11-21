import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validators';
import { sanitizeText } from '@/lib/utils';
import { logAudit } from '@/lib/audit';
import {
  ALLOWED_PLATFORM_SETTING_KEYS,
  getPlatformSettings,
  PlatformSettingsConfig,
} from '@/lib/platform-settings';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const settings = await getPlatformSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const json = await parseJsonBody<Record<string, unknown>>(req);
  if (json.errorResponse) return json.errorResponse;

  const body = json.data;
  const updatedKeys: string[] = [];

  for (const [key, rawValue] of Object.entries(body)) {
    if (!ALLOWED_PLATFORM_SETTING_KEYS.has(key as keyof PlatformSettingsConfig)) {
      continue;
    }

    let normalizedValue: unknown = rawValue;
    if (key === 'maxCvSizeMb') {
      const n = Number(rawValue);
      if (!Number.isFinite(n) || n < 1 || n > 25) {
        return NextResponse.json(
          { error: 'maxCvSizeMb must be between 1 and 25 MB.' },
          { status: 400 }
        );
      }
      normalizedValue = Math.round(n);
    } else if (key === 'dataRetentionDays') {
      const n = Number(rawValue);
      if (!Number.isFinite(n) || n < 30 || n > 3650) {
        return NextResponse.json(
          { error: 'dataRetentionDays must be between 30 and 3650 days.' },
          { status: 400 }
        );
      }
      normalizedValue = Math.round(n);
    } else if (
      key === 'requireHumanApprovalForAIJobs' ||
      key === 'allowPublicCandidateRegistration' ||
      key === 'allowPublicRecruiterRegistration'
    ) {
      normalizedValue = Boolean(rawValue);
    } else if (key === 'maintenanceAnnouncement') {
      normalizedValue = sanitizeText(String(rawValue ?? '')).slice(0, 500);
    }

    await prisma.platformSetting.upsert({
      where: { key },
      update: { value: normalizedValue as object },
      create: { key, value: normalizedValue as object },
    });
    updatedKeys.push(key);
  }

  await logAudit({
    actorId: auth.user.id,
    actorRole: auth.user.role,
    action: 'PLATFORM_SETTINGS_UPDATED',
    entityType: 'PlatformSetting',
    details: { updatedKeys },
  });

  const settings = await getPlatformSettings();
  return NextResponse.json({
    message: 'Platform configuration saved successfully.',
    settings,
  });
}
