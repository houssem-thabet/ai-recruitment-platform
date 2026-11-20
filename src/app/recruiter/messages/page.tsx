'use client';

import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, MessageSquare } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { MessagingWorkspace } from '@/components/messaging/MessagingWorkspace';
import { Button, Card, Badge } from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { timeAgo } from '@/lib/utils';

export default function RecruiterMessagesPage() {
  const { refreshAuth } = useAuth();
  const [tab, setTab] = useState<'messages' | 'notifications'>('messages');
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
      role="RECRUITER"
      title="Candidate Messaging & Notifications"
      subtitle="Communicate directly with applicants and review real-time recruitment alerts"
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
          variant={tab === 'messages' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setTab('messages')}
        >
          <MessageSquare className="w-4 h-4" /> Conversations
        </Button>
        <Button
          variant={tab === 'notifications' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setTab('notifications')}
        >
          <Bell className="w-4 h-4" /> Notifications ({notifications.length})
        </Button>
      </div>

      {tab === 'messages' ? (
        <MessagingWorkspace />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className="p-4 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-[#101B35] dark:text-white">
                  {n.title}
                </p>
                {!n.isRead && <Badge variant="electric">New</Badge>}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">{n.message}</p>
              <p className="text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
