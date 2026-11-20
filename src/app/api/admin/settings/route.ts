import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { DEFAULT_MATCH_WEIGHTS } from '@/lib/ai/engine';

const DEFAULT_PLATFORM_CONFIG = {
  matchWeights: DEFAULT_MATCH_WEIGHTS,
  maxCvSizeMb: 5,
  dataRetentionDays: 365,
  requireHumanApprovalForAIJobs: true,
  allowPublicCandidateRegistration: true,
  allowPublicRecruiterRegistration: true,
  maintenanceAnnouncement: '',
};

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const rows = await prisma.platformSetting.findMany();
  const map: Record<string, unknown> = { ...DEFAULT_PLATFORM_CONFIG };
  for (const r of rows) {
    map[r.key] = r.value;
  }

  return NextResponse.json({ settings: map });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json();
  for (const [key, value] of Object.entries(body)) {
    await prisma.platformSetting.upsert({
      where: { key },
      update: { value: value as object },
      create: { key, value: value as object },
    });
  }

  await logAudit({
    actorId: auth.user.id,
    actorRole: auth.user.role,
    action: 'PLATFORM_SETTINGS_UPDATED',
    entityType: 'PlatformSetting',
    details: { updatedKeys: Object.keys(body) },
  });

  return NextResponse.json({ message: 'Platform configuration saved successfully.' });
}
