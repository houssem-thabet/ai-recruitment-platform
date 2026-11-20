import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { computeCandidateJobMatch } from '@/lib/ai/engine';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE']);
  if (auth.errorResponse) return auth.errorResponse;

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: auth.user.id },
    include: {
      skills: { include: { skill: true } },
      educations: true,
      experiences: true,
      certifications: true,
      projects: true,
      cvAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 },
      bookmarks: { select: { jobId: true } },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: 'Candidate profile not found' }, { status: 404 });
  }

  const [applications, upcomingInterviews, recentNotifications, activeJobs] =
    await Promise.all([
      prisma.application.findMany({
        where: { candidateProfileId: profile.id },
        include: {
          job: {
            include: {
              company: { select: { name: true, logoUrl: true, location: true } },
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
      }),
      prisma.interview.findMany({
        where: {
          candidateProfileId: profile.id,
          status: { in: ['INVITED', 'ACCEPTED', 'RESCHEDULED'] },
        },
        include: {
          job: {
            select: {
              title: true,
              company: { select: { name: true } },
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),
      prisma.notification.findMany({
        where: { userId: auth.user.id },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      prisma.job.findMany({
        where: {
          status: 'PUBLISHED',
          id: { notIn: profile.dismissedJobIds || [] },
        },
        include: {
          company: { select: { name: true, industry: true, logoUrl: true } },
          skills: { include: { skill: true } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 8,
      }),
    ]);

  // Compute profile strength score
  let profileCompleteness = 20;
  if (profile.bio && profile.bio.length > 30) profileCompleteness += 15;
  if (profile.skills.length >= 3) profileCompleteness += 20;
  if (profile.experiences.length >= 1) profileCompleteness += 15;
  if (profile.educations.length >= 1) profileCompleteness += 15;
  if (profile.cvAnalyses.length >= 1) profileCompleteness += 15;
  profileCompleteness = Math.min(100, profileCompleteness);

  // Compute top AI job recommendations
  const langs = Array.isArray(profile.languages)
    ? (profile.languages as Array<{ name?: string }>).map((l) => l?.name || '').filter(Boolean)
    : ['English'];

  const recommendations = await Promise.all(
    activeJobs.slice(0, 5).map(async (job) => {
      const { result } = await computeCandidateJobMatch(
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
      return {
        job: {
          id: job.id,
          title: job.title,
          location: job.location,
          workMode: job.workMode,
          employmentType: job.employmentType,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: job.salaryCurrency,
          company: job.company,
        },
        compatibilityScore: result.overallScore,
        matchingSkills: result.matchingSkills,
        missingSkills: result.missingSkills,
        reason: result.explanation,
      };
    })
  );

  recommendations.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  return NextResponse.json({
    metrics: {
      totalApplications: applications.length,
      activeApplications: applications.filter(
        (a) => !['REJECTED', 'WITHDRAWN'].includes(a.status)
      ).length,
      shortlistedCount: applications.filter((a) =>
        ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'OFFERED', 'HIRED'].includes(a.status)
      ).length,
      upcomingInterviewsCount: upcomingInterviews.length,
      savedJobsCount: profile.bookmarks.length,
      profileCompleteness,
      cvCompleteness: profile.cvAnalyses[0]?.completenessScore ?? null,
    },
    recentApplications: applications.slice(0, 5),
    upcomingInterviews,
    recentNotifications,
    recommendations: recommendations.slice(0, 4),
  });
}
