'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Send, MessageSquare, CheckCheck } from 'lucide-react';
import { Button, Card, EmptyState, Input } from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { formatDateTime, timeAgo } from '@/lib/utils';

export function MessagingWorkspace() {
  const { user, refreshAuth } = useAuth();
  const toast = useToast();

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(
    async (convId?: string | null) => {
      try {
        const target = convId ?? selectedId;
        const url = target
          ? `/api/messages?conversationId=${encodeURIComponent(target)}`
          : '/api/messages';
        const data = await apiFetch(url);
        const list = data.conversations || [];
        setConversations(list);
        if (target) {
          setMessages(data.messages || []);
          refreshAuth();
        } else if (list.length > 0 && !selectedId) {
          setSelectedId(list[0].id);
        }
      } catch (err: any) {
        toast.error(err.message);
      }
    },
    [selectedId, refreshAuth, toast]
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    try {
      await apiFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: selectedId,
          content: draft,
        }),
      });
      setDraft('');
      await loadConversations(selectedId);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="w-6 h-6" />}
        title="No active conversations yet"
        description={
          user?.role === 'RECRUITER'
            ? 'Start a direct conversation with any applicant from Applications or Candidate Database.'
            : 'Conversations started with recruiters regarding your applications appear here.'
        }
      />
    );
  }

  const activeConv = conversations.find((c) => c.id === selectedId);

  return (
    <Card className="grid grid-cols-1 md:grid-cols-12 overflow-hidden min-h-[520px]">
      {/* Conversation Sidebar */}
      <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-y-auto max-h-[540px]">
        {conversations.map((c) => {
          const other =
            user?.role === 'CANDIDATE'
              ? `${c.recruiter?.firstName} ${c.recruiter?.lastName} (${
                  c.recruiter?.recruiterProfile?.company?.name || 'Recruiter'
                })`
              : `${c.candidate?.firstName} ${c.candidate?.lastName}`;
          const active = c.id === selectedId;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left p-4 transition-colors ${
                active
                  ? 'bg-[#367BF5]/10 border-l-4 border-l-[#367BF5]'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-[#101B35] dark:text-white truncate">
                  {other}
                </p>
                {c.unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#367BF5] text-white text-[10px] font-bold">
                    {c.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#367BF5] font-medium truncate mt-0.5">
                {c.job?.title || c.subject || 'Direct Thread'}
              </p>
              <p className="text-xs text-slate-500 truncate mt-1">
                {c.messages?.[0]?.content || 'No messages yet'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                {timeAgo(c.lastMessageAt)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Thread */}
      <div className="md:col-span-8 flex flex-col justify-between max-h-[540px]">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#101B35] dark:text-white">
              {activeConv?.subject || activeConv?.job?.title || 'Conversation'}
            </h3>
            <p className="text-xs text-slate-500">
              Authorized encrypted recruitment thread
            </p>
          </div>
        </div>

        <div className="flex-1 p-5 space-y-3 overflow-y-auto bg-slate-50/50 dark:bg-[#0B1326]/50">
          {messages.map((m) => {
            const mine = m.senderId === user?.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    mine
                      ? 'bg-[#367BF5] text-white rounded-br-sm'
                      : 'bg-white dark:bg-[#101B35] border border-slate-200 dark:border-slate-700 text-[#101B35] dark:text-slate-100 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                  <span>{formatDateTime(m.createdAt)}</span>
                  {mine && m.isRead && (
                    <span className="inline-flex items-center gap-0.5 text-[#367BF5]">
                      <CheckCheck className="w-3 h-3" /> Read
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <form
          onSubmit={handleSend}
          className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5"
        >
          <div className="flex-1">
            <Input
              placeholder="Write a professional message..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>
          <Button type="submit" loading={sending}>
            <Send className="w-4 h-4" /> Send
          </Button>
        </form>
      </div>
    </Card>
  );
}
