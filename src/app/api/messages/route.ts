import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { messageSendSchema } from '@/lib/validators';
import { sanitizeText } from '@/lib/utils';
import { createNotification } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE', 'RECRUITER']);
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ candidateUserId: auth.user.id }, { recruiterUserId: auth.user.id }],
    },
    include: {
      candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
      recruiter: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          recruiterProfile: {
            select: { title: true, company: { select: { name: true } } },
          },
        },
      },
      job: { select: { id: true, title: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  });

  // Unread counts per conversation
  const withUnread = await Promise.all(
    conversations.map(async (c) => {
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: c.id,
          senderId: { not: auth.user.id },
          isRead: false,
        },
      });
      return { ...c, unreadCount };
    })
  );

  let activeMessages: unknown[] = [];
  if (conversationId) {
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) {
      return NextResponse.json({ error: 'Conversation unauthorized.' }, { status: 403 });
    }
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: auth.user.id },
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });

    activeMessages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  return NextResponse.json({
    conversations: withUnread,
    messages: activeMessages,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['CANDIDATE', 'RECRUITER']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = messageSendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Message validation failed' },
        { status: 400 }
      );
    }

    const d = parsed.data;
    let conversation = d.conversationId
      ? await prisma.conversation.findUnique({ where: { id: d.conversationId } })
      : null;

    if (conversation) {
      if (
        conversation.candidateUserId !== auth.user.id &&
        conversation.recruiterUserId !== auth.user.id
      ) {
        return NextResponse.json({ error: 'Forbidden conversation.' }, { status: 403 });
      }
    } else {
      if (!d.recipientUserId) {
        return NextResponse.json(
          { error: 'recipientUserId or conversationId is required.' },
          { status: 400 }
        );
      }
      const recipient = await prisma.user.findUnique({
        where: { id: d.recipientUserId },
      });
      if (!recipient) {
        return NextResponse.json({ error: 'Recipient not found.' }, { status: 404 });
      }

      const candidateUserId =
        auth.user.role === 'CANDIDATE' ? auth.user.id : recipient.id;
      const recruiterUserId =
        auth.user.role === 'RECRUITER' ? auth.user.id : recipient.id;

      conversation = await prisma.conversation.findFirst({
        where: {
          candidateUserId,
          recruiterUserId,
          ...(d.jobId ? { jobId: d.jobId } : {}),
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            candidateUserId,
            recruiterUserId,
            jobId: d.jobId || null,
            subject: d.subject ? sanitizeText(d.subject) : 'Recruitment Discussion',
          },
        });
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: auth.user.id,
        content: sanitizeText(d.content),
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    const recipientId =
      conversation.candidateUserId === auth.user.id
        ? conversation.recruiterUserId
        : conversation.candidateUserId;

    const recipientUser = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { role: true },
    });

    await createNotification({
      userId: recipientId,
      type: 'NEW_MESSAGE',
      title: `New Message from ${auth.user.firstName} ${auth.user.lastName}`,
      message: sanitizeText(d.content).slice(0, 140),
      link:
        recipientUser?.role === 'RECRUITER'
          ? `/recruiter/messages?c=${conversation.id}`
          : `/candidate/notifications?c=${conversation.id}`,
    });

    return NextResponse.json({ conversationId: conversation.id, message }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/messages]', err);
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
  }
}
