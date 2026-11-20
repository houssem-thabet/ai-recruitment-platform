import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getAuthUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (user) {
    await logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'USER_LOGGED_OUT',
      entityType: 'User',
      entityId: user.id,
      ipAddress: getClientIp(req),
    });
  }

  const res = NextResponse.json({ message: 'Signed out successfully' });
  return clearSessionCookie(res, req);
}
