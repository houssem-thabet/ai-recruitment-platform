import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sanitizeText } from '@/lib/utils';
import { parseJsonBody } from '@/lib/validators';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  category: z.string().trim().min(2).max(60),
  message: z.string().trim().min(10).max(2000),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`contact:${ip}`, 6, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many messages sent. Please wait a minute.' }, { status: 429 });
  }

  const json = await parseJsonBody(req);
  if (json.errorResponse) return json.errorResponse;

  try {
    const body = json.data;
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Please complete all fields.' },
        { status: 400 }
      );
    }

    await logAudit({
      action: 'PUBLIC_CONTACT_SUBMITTED',
      entityType: 'ContactInquiry',
      details: {
        name: sanitizeText(parsed.data.name),
        email: parsed.data.email,
        category: sanitizeText(parsed.data.category),
        messagePreview: sanitizeText(parsed.data.message).slice(0, 300),
      },
      ipAddress: ip,
    });

    return NextResponse.json({
      message: 'Thank you for contacting TalentAI! Your message has been logged for our team.',
    });
  } catch {
    return NextResponse.json({ error: 'Unable to submit message.' }, { status: 500 });
  }
}
