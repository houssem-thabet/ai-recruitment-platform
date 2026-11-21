import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validators';
import {
  runSkillGapAnalysisAI,
  CAREER_PATH_BLUEPRINTS,
} from '@/lib/ai/engine';
import { getActiveAIModelInfo, getLastLLMDiagnostics } from '@/lib/ai/llm-client';
import { logAIUsage } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  const jobs = await prisma.job.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true,
      title: true,
      company: { select: { name: true } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 30,
  });

  return NextResponse.json({
    careerPaths: CAREER_PATH_BLUEPRINTS,
    jobs,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  const json = await parseJsonBody<{ jobId?: string; careerPathId?: string }>(req);
  if (json.errorResponse) return json.errorResponse;

  try {
    const { jobId, careerPathId } = json.data;

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: auth.user.id },
      include: {
        skills: { include: { skill: true } },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    }

    const candidateSkills = profile.skills.map((cs) => ({
      name: cs.skill.name,
      level: cs.level,
    }));

    let targetTitle = '';
    let targetType: 'JOB' | 'CAREER_PATH' = 'CAREER_PATH';
    let requiredSkills: string[] = [];
    let niceToHaveSkills: string[] = [];

    if (jobId) {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          company: { select: { name: true } },
          skills: { include: { skill: true } },
        },
      });
      if (!job) {
        return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
      }
      targetTitle = `${job.title} — ${job.company.name}`;
      targetType = 'JOB';
      requiredSkills = job.skills.filter((s) => s.isRequired).map((s) => s.skill.name);
      niceToHaveSkills = [
        ...job.skills.filter((s) => !s.isRequired).map((s) => s.skill.name),
        ...job.softSkills,
      ];
    } else {
      const bp =
        CAREER_PATH_BLUEPRINTS.find((b) => b.id === careerPathId) ||
        CAREER_PATH_BLUEPRINTS[0];
      targetTitle = bp.title;
      targetType = 'CAREER_PATH';
      requiredSkills = bp.requiredSkills;
      niceToHaveSkills = bp.niceToHaveSkills;
    }

    const run = await runSkillGapAnalysisAI({
      candidateSkills,
      targetTitle,
      targetType,
      requiredSkills,
      niceToHaveSkills,
    });

    await logAIUsage({
      userId: auth.user.id,
      feature: 'SKILL_GAP',
      mode: run.analysis.aiMode,
      modelName: getActiveAIModelInfo().modelName,
      status: run.fallbackUsed ? 'FALLBACK' : 'SUCCESS',
      latencyMs: run.latencyMs,
      tokensEstimated: run.tokensEstimated,
      errorMessage: run.fallbackUsed ? getLastLLMDiagnostics()?.errorMessage : null,
    });

    return NextResponse.json({ analysis: run.analysis });
  } catch (err) {
    console.error('[POST /api/ai/skill-gap]', err);
    return NextResponse.json({ error: 'Skill gap analysis failed.' }, { status: 500 });
  }
}
