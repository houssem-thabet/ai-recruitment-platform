import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { evaluateInterviewNotesAI } from '@/lib/ai/engine';
import { getActiveAIModelInfo } from '@/lib/ai/llm-client';
import { logAIUsage, logAudit } from '@/lib/audit';
import { EvaluationRecommendation, Prisma } from '@prisma/client';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['RECRUITER']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const {
      interviewId,
      consentConfirmed,
      rawNotes,
      humanRecommendation,
    } = body as {
      interviewId: string;
      consentConfirmed: boolean;
      rawNotes: string;
      humanRecommendation?: EvaluationRecommendation;
    };

    if (!consentConfirmed) {
      return NextResponse.json(
        {
          error:
            'Candidate note-processing consent confirmation is required before running AI organization.',
        },
        { status: 400 }
      );
    }

    if (!interviewId || !rawNotes || rawNotes.trim().length < 15) {
      return NextResponse.json(
        { error: 'Please select an interview and provide at least 15 characters of notes.' },
        { status: 400 }
      );
    }

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        job: { include: { skills: { include: { skill: true } } } },
      },
    });

    if (!interview || interview.job.companyId !== auth.user.companyId) {
      return NextResponse.json({ error: 'Interview not found or unauthorized' }, { status: 404 });
    }

    const plannedQuestions = Array.isArray(interview.generatedQuestions)
      ? (interview.generatedQuestions as Array<{ question?: string }>)
          .map((q) => q?.question || '')
          .filter(Boolean)
      : [];

    const evalRun = await evaluateInterviewNotesAI({
      consentConfirmed: true,
      rawNotes,
      jobTitle: interview.job.title,
      requiredSkills: interview.job.skills.map((s) => s.skill.name),
      plannedQuestions,
    });

    const saved = await prisma.interviewEvaluation.upsert({
      where: { interviewId: interview.id },
      update: {
        evaluatorId: auth.user.id,
        consentConfirmed: true,
        rawNotes,
        organizedNotes: evalRun.result.organizedNotes,
        evidenceMap: evalRun.result.evidenceMap as unknown as Prisma.InputJsonValue,
        demonstratedSkills: evalRun.result.demonstratedSkills,
        unansweredQuestions: evalRun.result.unansweredQuestions,
        suggestedFollowUps: evalRun.result.suggestedFollowUps,
        structuredSummary: evalRun.result.structuredSummary,
        humanRecommendation: humanRecommendation || 'PENDING',
        aiMode: evalRun.result.aiMode,
      },
      create: {
        interviewId: interview.id,
        evaluatorId: auth.user.id,
        consentConfirmed: true,
        rawNotes,
        organizedNotes: evalRun.result.organizedNotes,
        evidenceMap: evalRun.result.evidenceMap as unknown as Prisma.InputJsonValue,
        demonstratedSkills: evalRun.result.demonstratedSkills,
        unansweredQuestions: evalRun.result.unansweredQuestions,
        suggestedFollowUps: evalRun.result.suggestedFollowUps,
        structuredSummary: evalRun.result.structuredSummary,
        humanRecommendation: humanRecommendation || 'PENDING',
        aiMode: evalRun.result.aiMode,
      },
    });

    await logAIUsage({
      userId: auth.user.id,
      feature: 'INTERVIEW_EVALUATION',
      mode: evalRun.result.aiMode,
      modelName: getActiveAIModelInfo().modelName,
      latencyMs: evalRun.latencyMs,
      tokensEstimated: evalRun.tokensEstimated,
    });

    await logAudit({
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: 'INTERVIEW_NOTES_EVALUATED',
      entityType: 'InterviewEvaluation',
      entityId: saved.id,
    });

    return NextResponse.json({
      evaluation: saved,
      ethicalNotice: evalRun.result.ethicalNotice,
    });
  } catch (err) {
    console.error('[POST /api/ai/evaluate-interview]', err);
    return NextResponse.json({ error: 'Unable to evaluate interview notes.' }, { status: 500 });
  }
}
