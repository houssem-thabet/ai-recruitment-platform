'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Bell, CheckCheck, MessageSquare } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { MessagingWorkspace } from '@/components/messaging/MessagingWorkspace';
import { Button, Card, Badge, EmptyState, PageLoader } from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { timeAgo } from '@/lib/utils';

function CandidateNotificationsContent() {
  const searchParams = useSearchParams();
  const deepConvId = searchParams.get('c');
  const { refreshAuth } = useAuth();
  const [tab, setTab] = useState<'notifications' | 'messages'>(
    deepConvId ? 'messages' : 'notifications'
  );
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (deepConvId) {
      setTab('messages');
    }
  }, [deepConvId]);

  const loadNotifs = async () => {
    const d = await apiFetch('/api/notifications');
    setNotifications(d.notifications || []);
  };

  useEffect(() => {
    loadNotifs();
  }, []);

  const markAllRead = async () => {
    await apiFetch('/api/notifications', {
      method: 'PUT',
      body: JSON.stringify({ markAllRead: true }),
    });
    await loadNotifs();
    await refreshAuth();
  };

  const markSingleRead = async (notificationId: string) => {
    await apiFetch('/api/notifications', {
      method: 'PUT',
      body: JSON.stringify({ notificationId }),
    }).catch(() => null);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    refreshAuth();
  };

  return (
    <DashboardShell
      role="CANDIDATE"
      title="Notifications & Recruiter Messages"
      subtitle="Stay updated on application reviews, interview invitations, and direct messages"
      actions={
        tab === 'notifications' && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4" /> Mark All Read
          </Button>
        )
      }
    >
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <Button
          variant={tab === 'notifications' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setTab('notifications')}
        >
          <Bell className="w-4 h-4" /> Alerts ({notifications.length})
        </Button>
        <Button
          variant={tab === 'messages' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setTab('messages')}
        >
          <MessageSquare className="w-4 h-4" /> Direct Messages
        </Button>
      </div>

      {tab === 'messages' ? (
        <MessagingWorkspace initialConversationId={deepConvId} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-6 h-6" />}
          title="You're all caught up"
          description="Updates on your job applications and interviews appear here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`p-4 flex items-start justify-between gap-4 ${
                !n.isRead ? 'border-l-4 border-l-[#367BF5]' : ''
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#101B35] dark:text-white">
                    {n.title}
                  </p>
                  {!n.isRead && <Badge variant="electric">New</Badge>}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{n.message}</p>
                <p className="text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p>
              </div>
              {n.link && (
                <Link href={n.link} onClick={() => !n.isRead && markSingleRead(n.id)}>
                  <Button variant="outline" size="sm">
                    Open
                  </Button>
                </Link>
              )}
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

export default function CandidateNotificationsPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading notifications..." />}>
      <CandidateNotificationsContent />
    </Suspense>
  );
}
