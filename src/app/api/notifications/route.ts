import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validators';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.notification.count({
      where: { userId: auth.user.id, isRead: false },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const json = await parseJsonBody<{ markAllRead?: boolean; notificationId?: string }>(req);
  if (json.errorResponse) return json.errorResponse;

  const body = json.data;
  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: auth.user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ message: 'All notifications marked as read.' });
  }

  if (typeof body.notificationId === 'string' && body.notificationId.trim()) {
    await prisma.notification.updateMany({
      where: { id: body.notificationId.trim(), userId: auth.user.id },
      data: { isRead: true },
    });
    return NextResponse.json({ message: 'Notification marked as read.' });
  }

  return NextResponse.json({ error: 'Invalid notification action.' }, { status: 400 });
}
