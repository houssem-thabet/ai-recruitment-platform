'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, MessageSquare } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { MessagingWorkspace } from '@/components/messaging/MessagingWorkspace';
import { Button, Card, Badge, EmptyState } from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { timeAgo } from '@/lib/utils';

export default function CandidateNotificationsPage() {
  const { refreshAuth } = useAuth();
  const [tab, setTab] = useState<'notifications' | 'messages'>('notifications');
  const [notifications, setNotifications] = useState<any[]>([]);

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
        <MessagingWorkspace />
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
                <Link href={n.link}>
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
