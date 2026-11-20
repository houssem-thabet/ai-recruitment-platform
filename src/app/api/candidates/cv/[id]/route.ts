import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const cv = await prisma.cVDocument.findUnique({
    where: { id: params.id },
    include: { analysis: true },
  });

  if (!cv) {
    return NextResponse.json({ error: 'CV document not found' }, { status: 404 });
  }

  const isOwner = auth.user.candidateProfileId === cv.candidateProfileId;
  let isAuthorizedRecruiter = false;

  if (!isOwner && auth.user.role === 'RECRUITER' && auth.user.companyId) {
    const applicationExists = await prisma.application.findFirst({
      where: {
        candidateProfileId: cv.candidateProfileId,
        job: { companyId: auth.user.companyId },
      },
    });
    isAuthorizedRecruiter = Boolean(applicationExists);
  }

  // Enforce Part 7 & Part 14: Admins & unauthorized recruiters do NOT get unrestricted CV access
  if (!isOwner && !isAuthorizedRecruiter) {
    return NextResponse.json(
      { error: 'Forbidden: You are not authorized to access this confidential CV.' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  if (searchParams.get('raw') === '1' || searchParams.get('download') === '1') {
    try {
      const fileBuf = await fs.readFile(cv.storagePath);
      const disposition = searchParams.get('download') === '1' ? 'attachment' : 'inline';
      return new NextResponse(fileBuf, {
        headers: {
          'Content-Type': cv.mimeType,
          'Content-Disposition': `${disposition}; filename="${encodeURIComponent(cv.originalName)}"`,
          'Cache-Control': 'private, no-store',
        },
      });
    } catch {
      // Fallback if seeded CV exists purely as normalized DB text without binary file
      return new NextResponse(cv.extractedText, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `inline; filename="${encodeURIComponent(cv.originalName)}.txt"`,
        },
      });
    }
  }

  return NextResponse.json({ cvDocument: cv });
}

/**
 * Allows the candidate to review and correct AI-extracted CV data (Part 4B & Part 6 Feature 1).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req, ['CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  const cv = await prisma.cVDocument.findUnique({
    where: { id: params.id },
    include: { analysis: true },
  });

  if (!cv || cv.candidateProfileId !== auth.user.candidateProfileId) {
    return NextResponse.json({ error: 'CV not found or unauthorized' }, { status: 404 });
  }

  try {
    const body = await req.json();
    if (body.setPrimary === true) {
      await prisma.cVDocument.updateMany({
        where: { candidateProfileId: cv.candidateProfileId },
        data: { isPrimary: false },
      });
      await prisma.cVDocument.update({
        where: { id: cv.id },
        data: { isPrimary: true },
      });
    }

    let updatedAnalysis = cv.analysis;
    if (body.extractedData && cv.analysis) {
      updatedAnalysis = await prisma.cVAnalysis.update({
        where: { id: cv.analysis.id },
        data: {
          extractedData: body.extractedData,
          reviewedByCandidate: true,
        },
      });
    }

    await logAudit({
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: 'CV_EXTRACTED_DATA_REVIEWED',
      entityType: 'CVDocument',
      entityId: cv.id,
    });

    return NextResponse.json({
      message: 'CV extracted information updated and verified.',
      analysis: updatedAnalysis,
    });
  } catch (err) {
    console.error('[PUT /api/candidates/cv/[id]]', err);
    return NextResponse.json({ error: 'Unable to update CV record.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req, ['CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  const cv = await prisma.cVDocument.findUnique({
    where: { id: params.id },
  });

  if (!cv || cv.candidateProfileId !== auth.user.candidateProfileId) {
    return NextResponse.json({ error: 'CV not found or unauthorized' }, { status: 404 });
  }

  await fs.unlink(cv.storagePath).catch(() => null);
  await prisma.cVDocument.delete({ where: { id: cv.id } });

  // Promote most recent remaining CV to primary if needed
  if (cv.isPrimary) {
    const latest = await prisma.cVDocument.findFirst({
      where: { candidateProfileId: cv.candidateProfileId },
      orderBy: { createdAt: 'desc' },
    });
    if (latest) {
      await prisma.cVDocument.update({
        where: { id: latest.id },
        data: { isPrimary: true },
      });
    }
  }

  await logAudit({
    actorId: auth.user.id,
    actorRole: auth.user.role,
    action: 'CV_DELETED',
    entityType: 'CVDocument',
    entityId: cv.id,
  });

  return NextResponse.json({ message: 'CV document permanently deleted.' });
}
