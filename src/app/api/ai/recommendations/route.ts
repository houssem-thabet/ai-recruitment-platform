import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validators';
import { computeCandidateJobMatch } from '@/lib/ai/engine';
import { getActiveAIModelInfo } from '@/lib/ai/llm-client';
import { logAIUsage } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  const started = Date.now();
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: auth.user.id },
    include: {
      skills: { include: { skill: true } },
      educations: true,
      experiences: true,
      certifications: true,
      projects: true,
      bookmarks: { select: { jobId: true } },
      applications: { select: { jobId: true } },
      cvDocuments: { where: { isPrimary: true }, take: 1 },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const activeJobs = await prisma.job.findMany({
    where: {
      status: 'PUBLISHED',
      id: { notIn: profile.dismissedJobIds || [] },
    },
    include: {
      company: { select: { id: true, name: true, logoUrl: true, industry: true } },
      skills: { include: { skill: true } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 15,
  });

  const langs = Array.isArray(profile.languages)
    ? (profile.languages as Array<{ name?: string }>).map((l) => l?.name || '').filter(Boolean)
    : ['English'];

  const bookmarkedSet = new Set(profile.bookmarks.map((b) => b.jobId));
  const appliedSet = new Set(profile.applications.map((a) => a.jobId));

  const ranked = await Promise.all(
    activeJobs.map(async (job) => {
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
          languages: langs,
          cvText: profile.cvDocuments[0]?.extractedText ?? null,
        },
        {
          title: job.title,
          description: job.description,
          responsibilities: job.responsibilities,
          qualifications: job.qualifications,
          requiredSkills: job.skills.filter((s) => s.isRequired).map((s) => s.skill.name),
          softSkills: job.softSkills,
          minYearsExperience: job.minYearsExperience,
          educationRequirement: job.educationRequirement,
          location: job.location,
          workMode: job.workMode,
          requiredLanguages: job.requiredLanguages,
        }
      );

      // Preference boost reasons
      const reasons: string[] = [];
      if (m.result.matchingSkills.length > 0) {
        reasons.push(`Matches ${m.result.matchingSkills.length} of your skills (${m.result.matchingSkills.slice(0, 3).join(', ')})`);
      }
      if (
        profile.remotePreference === job.workMode ||
        profile.remotePreference === 'FLEXIBLE'
      ) {
        reasons.push(`Fits your ${job.workMode.toLowerCase()} work preference`);
      }
      if (
        profile.location &&
        job.location.toLowerCase().includes(profile.location.split(',')[0].toLowerCase())
      ) {
        reasons.push(`Aligned with your location (${job.location})`);
      }
      if (
        profile.careerInterests.some(
          (ci) =>
            job.title.toLowerCase().includes(ci.toLowerCase()) ||
            job.company.industry.toLowerCase().includes(ci.toLowerCase())
        )
      ) {
        reasons.push(`Matches your career interests`);
      }
      if (reasons.length === 0) {
        reasons.push(`Recommended based on experience level (${job.experienceLevel})`);
      }

      return {
        job,
        score: m.result.overallScore,
        matchingSkills: m.result.matchingSkills,
        missingSkills: m.result.missingSkills,
        whyRecommended: reasons,
        explanation: m.result.explanation,
        isBookmarked: bookmarkedSet.has(job.id),
        hasApplied: appliedSet.has(job.id),
      };
    })
  );

  ranked.sort((a, b) => b.score - a.score);

  await logAIUsage({
    userId: auth.user.id,
    feature: 'JOB_RECOMMENDATIONS',
    mode: getActiveAIModelInfo().mode,
    modelName: getActiveAIModelInfo().modelName,
    latencyMs: Date.now() - started,
    tokensEstimated: 140,
  });

  return NextResponse.json({
    recommendations: ranked.slice(0, 8),
    dismissedCount: profile.dismissedJobIds.length,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  const json = await parseJsonBody<{ dismissJobId?: string; resetDismissed?: boolean }>(req);
  if (json.errorResponse) return json.errorResponse;

  const { dismissJobId, resetDismissed } = json.data;
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: auth.user.id },
  });
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (resetDismissed) {
    await prisma.candidateProfile.update({
      where: { id: profile.id },
      data: { dismissedJobIds: [] },
    });
    return NextResponse.json({ message: 'Dismissed recommendations restored.' });
  }

  if (dismissJobId) {
    const next = Array.from(new Set([...(profile.dismissedJobIds || []), String(dismissJobId)]));
    await prisma.candidateProfile.update({
      where: { id: profile.id },
      data: { dismissedJobIds: next },
    });
    return NextResponse.json({ message: 'Recommendation dismissed.' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
