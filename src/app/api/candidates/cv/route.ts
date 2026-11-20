import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  validateCVFileBuffer,
  extractTextFromCVBuffer,
  savePrivateCVFile,
} from '@/lib/cv-parser';
import { analyzeCVText } from '@/lib/ai/engine';
import { upsertSkillRecord } from '@/lib/skills-db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logAudit, logAIUsage } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  const cvDocuments = await prisma.cVDocument.findMany({
    where: { candidateProfileId: auth.user.candidateProfileId! },
    include: { analysis: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ cvDocuments });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  const ip = getClientIp(req);
  const rl = checkRateLimit(`cv_upload:${auth.user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Upload limit reached. Please wait ${rl.resetInSeconds}s.` },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const syncToProfile = formData.get('syncToProfile') !== 'false';

    if (!file) {
      return NextResponse.json({ error: 'Please select a PDF or DOCX CV file.' }, { status: 400 });
    }

    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const validation = validateCVFileBuffer(file.name, buffer, file.type);
    if (!validation.valid || !validation.detectedType) {
      return NextResponse.json(
        { error: validation.error || 'Invalid CV file.' },
        { status: 400 }
      );
    }

    const extractedText = await extractTextFromCVBuffer(buffer, validation.detectedType);
    if (!extractedText || extractedText.length < 20) {
      return NextResponse.json(
        {
          error:
            'Could not extract sufficient readable text from document. Ensure the PDF/DOCX is text-based rather than an unindexed scan.',
        },
        { status: 422 }
      );
    }

    const candidateProfileId = auth.user.candidateProfileId!;
    const { fileName, storagePath } = await savePrivateCVFile(
      candidateProfileId,
      file.name,
      buffer
    );

    // Mark previous CVs as non-primary when replacing
    await prisma.cVDocument.updateMany({
      where: { candidateProfileId },
      data: { isPrimary: false },
    });

    const cvDoc = await prisma.cVDocument.create({
      data: {
        candidateProfileId,
        fileName,
        originalName: file.name,
        mimeType:
          validation.detectedType === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: buffer.length,
        storagePath,
        extractedText,
        isPrimary: true,
      },
    });

    // Run AI CV Analyzer
    const analysisRun = await analyzeCVText(
      extractedText,
      `${auth.user.firstName} ${auth.user.lastName}`
    );

    const savedAnalysis = await prisma.cVAnalysis.create({
      data: {
        cvDocumentId: cvDoc.id,
        candidateProfileId,
        completenessScore: analysisRun.result.completenessScore,
        extractedData: analysisRun.result.extractedData,
        skillsOverview: analysisRun.result.skillsOverview,
        experienceOverview: analysisRun.result.experienceOverview,
        strengths: analysisRun.result.strengths,
        missingInfo: analysisRun.result.missingInfo,
        suggestions: analysisRun.result.suggestions,
        recommendedCategories: analysisRun.result.recommendedCategories,
        aiMode: analysisRun.result.aiMode,
        reviewedByCandidate: false,
      },
    });

    // Sync extracted skills to candidate profile if requested
    if (syncToProfile) {
      for (const sk of analysisRun.result.extractedData.technicalSkills) {
        const skillRow = await upsertSkillRecord(sk, 'TECHNICAL');
        await prisma.candidateSkill.upsert({
          where: {
            candidateProfileId_skillId: {
              candidateProfileId,
              skillId: skillRow.id,
            },
          },
          update: { verifiedByCV: true },
          create: {
            candidateProfileId,
            skillId: skillRow.id,
            level: 'INTERMEDIATE',
            verifiedByCV: true,
          },
        });
      }
      for (const sk of analysisRun.result.extractedData.softSkills) {
        const skillRow = await upsertSkillRecord(sk, 'SOFT');
        await prisma.candidateSkill.upsert({
          where: {
            candidateProfileId_skillId: {
              candidateProfileId,
              skillId: skillRow.id,
            },
          },
          update: { verifiedByCV: true },
          create: {
            candidateProfileId,
            skillId: skillRow.id,
            level: 'INTERMEDIATE',
            verifiedByCV: true,
          },
        });
      }
    }

    await logAIUsage({
      userId: auth.user.id,
      feature: 'CV_ANALYZER',
      mode: analysisRun.result.aiMode,
      modelName: analysisRun.result.modelName,
      status: analysisRun.fallbackUsed ? 'FALLBACK' : 'SUCCESS',
      latencyMs: analysisRun.latencyMs,
      tokensEstimated: analysisRun.tokensEstimated,
    });

    await logAudit({
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: 'CV_UPLOADED_AND_ANALYZED',
      entityType: 'CVDocument',
      entityId: cvDoc.id,
      details: {
        originalName: file.name,
        sizeBytes: buffer.length,
        completenessScore: savedAnalysis.completenessScore,
      },
      ipAddress: ip,
    });

    return NextResponse.json(
      {
        message: 'CV uploaded and analyzed successfully',
        cvDocument: { ...cvDoc, analysis: savedAnalysis },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/candidates/cv]', err);
    return NextResponse.json(
      { error: 'Failed to process CV document.' },
      { status: 500 }
    );
  }
}
