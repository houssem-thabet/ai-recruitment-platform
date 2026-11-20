import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  runCareerAssistantAI,
  computeCandidateJobMatch,
} from '@/lib/ai/engine';
import { getActiveAIModelInfo } from '@/lib/ai/llm-client';
import { logAIUsage } from '@/lib/audit';
import { sanitizeText } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  const messages = await prisma.careerChatMessage.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { message } = await req.json();
    if (!message || String(message).trim().length === 0) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    const cleanMsg = sanitizeText(String(message)).slice(0, 1500);

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: auth.user.id },
      include: {
        skills: { include: { skill: true } },
        educations: true,
        experiences: true,
        certifications: true,
        projects: true,
        cvAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { applications: true } },
      },
    });

    const jobs = await prisma.job.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        company: { select: { name: true } },
        skills: { include: { skill: true } },
      },
      take: 6,
    });

    const topMatchingJobs = [];
    if (profile) {
      for (const j of jobs) {
        const m = await computeCandidateJobMatch(
          {
            fullName: `${auth.user.firstName} ${auth.user.lastName}`,
            headline: profile.headline,
            bio: profile.bio,
            yearsOfExperience: profile.yearsOfExperience,
            location: profile.location,
            remotePreference: profile.remotePreference,
            skills: profile.skills.map((s) => s.skill.name),
            educations: profile.educations,
            experiences: profile.experiences,
            certifications: profile.certifications,
            projects: profile.projects,
            languages: ['English'],
          },
          {
            title: j.title,
            description: j.description,
            responsibilities: j.responsibilities,
            qualifications: j.qualifications,
            requiredSkills: j.skills.map((s) => s.skill.name),
            minYearsExperience: j.minYearsExperience,
            location: j.location,
            workMode: j.workMode,
            requiredLanguages: j.requiredLanguages,
          }
        );
        topMatchingJobs.push({
          id: j.id,
          title: j.title,
          company: j.company.name,
          score: m.result.overallScore,
          missingSkills: m.result.missingSkills,
        });
      }
      topMatchingJobs.sort((a, b) => b.score - a.score);
    }

    await prisma.careerChatMessage.create({
      data: {
        userId: auth.user.id,
        role: 'user',
        content: cleanMsg,
      },
    });

    const assistantRun = await runCareerAssistantAI(cleanMsg, {
      firstName: auth.user.firstName,
      lastName: auth.user.lastName,
      headline: profile?.headline,
      bio: profile?.bio,
      yearsOfExperience: profile?.yearsOfExperience ?? 0,
      location: profile?.location,
      skills: profile?.skills.map((s) => s.skill.name) || [],
      cvCompleteness: profile?.cvAnalyses[0]?.completenessScore ?? null,
      cvMissingInfo: profile?.cvAnalyses[0]?.missingInfo || [],
      cvSuggestions: profile?.cvAnalyses[0]?.suggestions || [],
      applicationsCount: profile?._count.applications ?? 0,
      topMatchingJobs: topMatchingJobs.slice(0, 4),
    });

    const savedAssistantMsg = await prisma.careerChatMessage.create({
      data: {
        userId: auth.user.id,
        role: 'assistant',
        content: assistantRun.reply,
        metadata: {
          suggestedActions: assistantRun.suggestedActions,
          aiMode: assistantRun.aiMode,
        },
      },
    });

    await logAIUsage({
      userId: auth.user.id,
      feature: 'CAREER_ASSISTANT',
      mode: assistantRun.aiMode,
      modelName: getActiveAIModelInfo().modelName,
      latencyMs: assistantRun.latencyMs,
      tokensEstimated: assistantRun.tokensEstimated,
    });

    return NextResponse.json({
      message: savedAssistantMsg,
      suggestedActions: assistantRun.suggestedActions,
      aiMode: assistantRun.aiMode,
    });
  } catch (err) {
    console.error('[POST /api/ai/career-assistant]', err);
    return NextResponse.json({ error: 'Career assistant error.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  await prisma.careerChatMessage.deleteMany({
    where: { userId: auth.user.id },
  });

  return NextResponse.json({ message: 'Chat history cleared.' });
}
