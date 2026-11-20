import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { generateInterviewQuestionsAI } from '@/lib/ai/engine';
import { getActiveAIModelInfo } from '@/lib/ai/llm-client';
import { logAIUsage } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['RECRUITER']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    let jobTitle = String(body.jobTitle || '');
    let jobDescription = String(body.jobDescription || '');
    let requiredSkills: string[] = Array.isArray(body.requiredSkills) ? body.requiredSkills : [];
    let seniorityLevel = String(body.seniorityLevel || 'MID');
    let candidateExperienceSummary = body.candidateExperienceSummary
      ? String(body.candidateExperienceSummary)
      : undefined;

    if (body.interviewId) {
      const interview = await prisma.interview.findUnique({
        where: { id: body.interviewId },
        include: {
          job: { include: { skills: { include: { skill: true } } } },
          candidateProfile: { include: { experiences: { take: 2 } } },
        },
      });
      if (interview && interview.job.companyId === auth.user.companyId) {
        jobTitle = interview.job.title;
        jobDescription = interview.job.description;
        requiredSkills = interview.job.skills.map((s) => s.skill.name);
        seniorityLevel = interview.job.experienceLevel;
        candidateExperienceSummary = interview.candidateProfile.experiences
          .map((e) => `${e.title} at ${e.company}`)
          .join('; ');
      }
    } else if (body.jobId) {
      const job = await prisma.job.findUnique({
        where: { id: body.jobId },
        include: { skills: { include: { skill: true } } },
      });
      if (job) {
        jobTitle = job.title;
        jobDescription = job.description;
        requiredSkills = job.skills.map((s) => s.skill.name);
        seniorityLevel = job.experienceLevel;
      }
    }

    if (!jobTitle) {
      return NextResponse.json({ error: 'Job title or jobId is required.' }, { status: 400 });
    }

    const gen = await generateInterviewQuestionsAI({
      jobTitle,
      jobDescription,
      requiredSkills,
      seniorityLevel,
      candidateExperienceSummary,
    });

    if (body.interviewId && body.saveToInterview) {
      await prisma.interview.update({
        where: { id: body.interviewId },
        data: { generatedQuestions: gen.questions as unknown as object },
      });
    }

    await logAIUsage({
      userId: auth.user.id,
      feature: 'INTERVIEW_QUESTIONS',
      mode: gen.aiMode,
      modelName: getActiveAIModelInfo().modelName,
      latencyMs: gen.latencyMs,
      tokensEstimated: gen.tokensEstimated,
    });

    return NextResponse.json({
      questions: gen.questions,
      aiMode: gen.aiMode,
    });
  } catch (err) {
    console.error('[POST /api/ai/generate-interview-questions]', err);
    return NextResponse.json(
      { error: 'Unable to generate interview questions.' },
      { status: 500 }
    );
  }
}
