import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

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

  const body = await req.json();
  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: auth.user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ message: 'All notifications marked as read.' });
  }

  if (body.notificationId) {
    await prisma.notification.updateMany({
      where: { id: body.notificationId, userId: auth.user.id },
      data: { isRead: true },
    });
    return NextResponse.json({ message: 'Notification marked as read.' });
  }

  return NextResponse.json({ error: 'Invalid notification action.' }, { status: 400 });
}
