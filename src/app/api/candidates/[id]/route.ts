import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const profile = await prisma.candidateProfile.findUnique({
    where: { id: params.id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      skills: { include: { skill: true } },
      educations: { orderBy: { startDate: 'desc' } },
      experiences: { orderBy: { startDate: 'desc' } },
      certifications: true,
      projects: true,
      cvDocuments: {
        where: { isPrimary: true },
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          fileSize: true,
          createdAt: true,
          analysis: true,
        },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: 'Candidate profile not found.' }, { status: 404 });
  }

  // Strict authorization check
  const isOwner = auth.user.candidateProfileId === profile.id;
  if (!isOwner && auth.user.role === 'CANDIDATE') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  let hasAppliedToRecruiterCompany = false;
  if (auth.user.role === 'RECRUITER' && auth.user.companyId) {
    const appCount = await prisma.application.count({
      where: {
        candidateProfileId: profile.id,
        job: { companyId: auth.user.companyId },
      },
    });
    hasAppliedToRecruiterCompany = appCount > 0;
    if (!profile.isSearchableByRecruiters && !hasAppliedToRecruiterCompany) {
      return NextResponse.json(
        { error: 'This candidate has restricted profile visibility.' },
        { status: 403 }
      );
    }
  }

  // Administrators do NOT automatically get confidential CV documents without authorization
  const sanitizedProfile = {
    ...profile,
    cvDocuments:
      isOwner || hasAppliedToRecruiterCompany
        ? profile.cvDocuments
        : [],
  };

  return NextResponse.json({ profile: sanitizedProfile });
}
