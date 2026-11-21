import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sanitizeHttpUrl, sanitizeLogoUrl, sanitizeText } from '@/lib/utils';
import { parseJsonBody } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['RECRUITER']);
  if (auth.errorResponse) return auth.errorResponse;

  const company = await prisma.company.findUnique({
    where: { id: auth.user.companyId! },
    include: {
      jobs: {
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { applications: true } },
        },
      },
      recruiters: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  return NextResponse.json({ company });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['RECRUITER']);
  if (auth.errorResponse) return auth.errorResponse;

  const json = await parseJsonBody(req);
  if (json.errorResponse) return json.errorResponse;

  try {
    const body = json.data;

    if (body.name !== undefined && sanitizeText(String(body.name)).length < 2) {
      return NextResponse.json(
        { error: 'Company name must be at least 2 characters.' },
        { status: 400 }
      );
    }

    let safeWebsite: string | null | undefined = undefined;
    if (body.website !== undefined) {
      if (!body.website || !String(body.website).trim()) {
        safeWebsite = null;
      } else {
        safeWebsite = sanitizeHttpUrl(body.website);
        if (!safeWebsite) {
          return NextResponse.json(
            { error: 'Please provide a valid HTTP/HTTPS company website URL.' },
            { status: 400 }
          );
        }
      }
    }

    let safeLogoUrl: string | null | undefined = undefined;
    if (body.logoUrl !== undefined) {
      if (!body.logoUrl || !String(body.logoUrl).trim()) {
        safeLogoUrl = null;
      } else {
        safeLogoUrl = sanitizeLogoUrl(body.logoUrl);
        if (!safeLogoUrl) {
          return NextResponse.json(
            {
              error:
                'Logo must be a valid HTTPS URL or a PNG/JPEG/WEBP/GIF image data URI.',
            },
            { status: 400 }
          );
        }
      }
    }

    let nextFoundedYear: number | null | undefined = undefined;
    if (body.foundedYear !== undefined) {
      if (body.foundedYear === null || body.foundedYear === '') {
        nextFoundedYear = null;
      } else {
        const yr = Number(body.foundedYear);
        const maxYr = new Date().getFullYear() + 1;
        if (!Number.isInteger(yr) || yr < 1800 || yr > maxYr) {
          return NextResponse.json(
            { error: `Founded year must be an integer between 1800 and ${maxYr}.` },
            { status: 400 }
          );
        }
        nextFoundedYear = yr;
      }
    }

    const updated = await prisma.company.update({
      where: { id: auth.user.companyId! },
      data: {
        ...(body.name ? { name: sanitizeText(String(body.name)).slice(0, 120) } : {}),
        ...(body.description
          ? { description: sanitizeText(String(body.description)).slice(0, 4000) }
          : {}),
        ...(body.industry
          ? { industry: sanitizeText(String(body.industry)).slice(0, 100) }
          : {}),
        ...(safeWebsite !== undefined ? { website: safeWebsite } : {}),
        ...(body.location !== undefined
          ? { location: body.location ? sanitizeText(String(body.location)).slice(0, 140) : null }
          : {}),
        ...(body.size ? { size: sanitizeText(String(body.size)).slice(0, 40) } : {}),
        ...(safeLogoUrl !== undefined ? { logoUrl: safeLogoUrl } : {}),
        ...(nextFoundedYear !== undefined ? { foundedYear: nextFoundedYear } : {}),
      },
    });

    await logAudit({
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: 'COMPANY_PROFILE_UPDATED',
      entityType: 'Company',
      entityId: updated.id,
    });

    return NextResponse.json({
      message: 'Company profile updated successfully',
      company: updated,
    });
  } catch (err) {
    console.error('[PUT /api/recruiter/company]', err);
    return NextResponse.json({ error: 'Unable to update company.' }, { status: 500 });
  }
}
