import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validators';
import { analyzeCVText } from '@/lib/ai/engine';
import { getLastLLMDiagnostics } from '@/lib/ai/llm-client';
import { logAIUsage } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE', 'RECRUITER']);
  if (auth.errorResponse) return auth.errorResponse;

  const json = await parseJsonBody(req);
  if (json.errorResponse) return json.errorResponse;

  try {
    const body = json.data;
    const { cvDocumentId, rawText } = body;

    if (cvDocumentId) {
      const cv = await prisma.cVDocument.findUnique({
        where: { id: String(cvDocumentId) },
        include: {
          candidateProfile: { include: { user: true } },
        },
      });
      if (!cv) {
        return NextResponse.json({ error: 'CV document not found' }, { status: 404 });
      }

      if (
        auth.user.role === 'CANDIDATE' &&
        cv.candidateProfileId !== auth.user.candidateProfileId
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Security: Recruiters may only analyze a CV if the candidate applied to their company's job
      if (auth.user.role === 'RECRUITER') {
        const authorizedApp = auth.user.companyId
          ? await prisma.application.findFirst({
              where: {
                candidateProfileId: cv.candidateProfileId,
                job: { companyId: auth.user.companyId },
              },
              select: { id: true },
            })
          : null;
        if (!authorizedApp) {
          return NextResponse.json(
            {
              error:
                'Forbidden: Recruiters may only analyze CVs attached to applications at their company.',
            },
            { status: 403 }
          );
        }
      }

      const run = await analyzeCVText(
        cv.extractedText,
        `${cv.candidateProfile.user.firstName} ${cv.candidateProfile.user.lastName}`
      );

      const saved = await prisma.cVAnalysis.upsert({
        where: { cvDocumentId: cv.id },
        update: {
          completenessScore: run.result.completenessScore,
          extractedData: run.result.extractedData,
          skillsOverview: run.result.skillsOverview,
          experienceOverview: run.result.experienceOverview,
          strengths: run.result.strengths,
          missingInfo: run.result.missingInfo,
          suggestions: run.result.suggestions,
          recommendedCategories: run.result.recommendedCategories,
          aiMode: run.result.aiMode,
        },
        create: {
          cvDocumentId: cv.id,
          candidateProfileId: cv.candidateProfileId,
          completenessScore: run.result.completenessScore,
          extractedData: run.result.extractedData,
          skillsOverview: run.result.skillsOverview,
          experienceOverview: run.result.experienceOverview,
          strengths: run.result.strengths,
          missingInfo: run.result.missingInfo,
          suggestions: run.result.suggestions,
          recommendedCategories: run.result.recommendedCategories,
          aiMode: run.result.aiMode,
        },
      });

      await logAIUsage({
        userId: auth.user.id,
        feature: 'CV_ANALYZER',
        mode: run.result.aiMode,
        modelName: run.result.modelName,
        status: run.fallbackUsed ? 'FALLBACK' : 'SUCCESS',
        latencyMs: run.latencyMs,
        tokensEstimated: run.tokensEstimated,
        errorMessage: run.fallbackUsed ? getLastLLMDiagnostics()?.errorMessage : null,
      });

      return NextResponse.json({ analysis: saved });
    }

    if (typeof rawText === 'string' && rawText.trim().length >= 20) {
      const run = await analyzeCVText(
        rawText,
        `${auth.user.firstName} ${auth.user.lastName}`
      );
      await logAIUsage({
        userId: auth.user.id,
        feature: 'CV_ANALYZER',
        mode: run.result.aiMode,
        modelName: run.result.modelName,
        status: run.fallbackUsed ? 'FALLBACK' : 'SUCCESS',
        latencyMs: run.latencyMs,
        tokensEstimated: run.tokensEstimated,
        errorMessage: run.fallbackUsed ? getLastLLMDiagnostics()?.errorMessage : null,
      });
      return NextResponse.json({ analysis: run.result });
    }

    return NextResponse.json(
      { error: 'Provide cvDocumentId or rawText (min 20 chars).' },
      { status: 400 }
    );
  } catch (err) {
    console.error('[POST /api/ai/analyze-cv]', err);
    return NextResponse.json({ error: 'CV analysis failed.' }, { status: 500 });
  }
}
