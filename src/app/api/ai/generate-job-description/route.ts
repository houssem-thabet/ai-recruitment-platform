import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validators';
import { generateJobDescriptionAI } from '@/lib/ai/engine';
import { getActiveAIModelInfo } from '@/lib/ai/llm-client';
import { logAIUsage } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['RECRUITER']);
  if (auth.errorResponse) return auth.errorResponse;

  const json = await parseJsonBody(req);
  if (json.errorResponse) return json.errorResponse;

  try {
    const body = json.data;
    if (!body.title || !Array.isArray(body.requiredSkills) || body.requiredSkills.length === 0) {
      return NextResponse.json(
        { error: 'Job title and at least one required skill are needed.' },
        { status: 400 }
      );
    }

    const company = auth.user.companyId
      ? await prisma.company.findUnique({ where: { id: auth.user.companyId } })
      : null;

    const gen = await generateJobDescriptionAI({
      title: String(body.title),
      industry: String(body.industry || company?.industry || 'Technology'),
      requiredSkills: body.requiredSkills.map(String),
      experienceLevel: String(body.experienceLevel || 'MID'),
      responsibilitiesHint: body.responsibilitiesHint ? String(body.responsibilitiesHint) : '',
      employmentType: String(body.employmentType || 'FULL_TIME'),
      location: String(body.location || company?.location || 'Remote'),
      workMode: String(body.workMode || 'HYBRID'),
      companyName: company?.name,
    });

    const modelInfo = getActiveAIModelInfo();
    await logAIUsage({
      userId: auth.user.id,
      feature: 'JOB_DESCRIPTION_GENERATOR',
      mode: gen.result.aiMode,
      modelName: modelInfo.modelName,
      latencyMs: gen.latencyMs,
      tokensEstimated: gen.tokensEstimated,
    });

    return NextResponse.json({
      generated: gen.result,
      requiresHumanApproval: true,
    });
  } catch (err) {
    console.error('[POST /api/ai/generate-job-description]', err);
    return NextResponse.json({ error: 'Failed to generate job description.' }, { status: 500 });
  }
}
