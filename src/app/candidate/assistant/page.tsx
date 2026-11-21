'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, Trash2, Sparkles, User } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Button,
  Card,
  Input,
  AIModeBadge,
  PageLoader,
} from '@/components/ui/primitives';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/providers/ToastProvider';

const STARTER_PROMPTS = [
  'How can I improve my CV completeness score?',
  'Which open jobs match my skills best right now?',
  'What missing skills should I learn next and what project should I build?',
  'Generate a strong professional summary from my profile.',
  'Help me prepare for a technical & behavioral interview.',
];

export default function CandidateCareerAssistantPage() {
  const toast = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<string[]>(STARTER_PROMPTS);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiMode, setAiMode] = useState<string>('DETERMINISTIC_NLP');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch('/api/ai/career-assistant')
      .then((d) => setMessages(d.messages || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async (textToSend?: string) => {
    const content = (textToSend ?? input).trim();
    if (!content) return;
    setInput('');
    setSending(true);

    const optimisticUser = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const res = await apiFetch('/api/ai/career-assistant', {
        method: 'POST',
        body: JSON.stringify({ message: content }),
      });
      setMessages((prev) => [...prev, res.message]);
      if (Array.isArray(res.suggestedActions) && res.suggestedActions.length > 0) {
        setSuggestedActions(res.suggestedActions);
      }
      if (res.aiMode) setAiMode(res.aiMode);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const clearHistory = async () => {
    await apiFetch('/api/ai/career-assistant', { method: 'DELETE' });
    setMessages([]);
    setSuggestedActions(STARTER_PROMPTS);
    toast.info('Conversation cleared.');
  };

  return (
    <DashboardShell
      role="CANDIDATE"
      title="AI Career Assistant"
      subtitle="Multi-turn career coaching grounded strictly on your verified profile, CV audit, and live platform roles"
      actions={
        <>
          <AIModeBadge mode={aiMode} />
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearHistory}>
              <Trash2 className="w-3.5 h-3.5" /> Clear History
            </Button>
          )}
        </>
      }
    >
      <Card className="relative flex flex-col h-[650px] overflow-hidden shadow-elevated">
        <div className="h-1 w-full bg-gradient-to-r from-[#28C5D8] via-[#367BF5] to-[#28C5D8]" />

        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5 bg-dot-subtle bg-slate-50/50 dark:bg-[#080F20]/60">
          {loading ? (
            <PageLoader label="Loading conversation history..." />
          ) : messages.length === 0 ? (
            <div className="max-w-xl mx-auto text-center py-14 space-y-4 animate-fade-in-up">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#28C5D8] via-[#367BF5] to-[#101B35] text-white flex items-center justify-center mx-auto shadow-glow">
                <Bot className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-[#101B35] dark:text-white">
                Ask Anything About Your Career Trajectory
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                I synthesize your verified TalentAI skills, CV analysis, and live open roles
                to provide concrete CV feedback, cover letters, salary strategies, and
                interview prep—without inventing credentials.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex items-end gap-2.5 animate-fade-in-up ${
                    isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#28C5D8] to-[#367BF5] text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-4.5 p-4 text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-gradient-to-br from-[#367BF5] to-[#2260DC] text-white rounded-br-xs shadow-md shadow-[#367BF5]/20'
                        : 'bg-white dark:bg-[#0E172C] border border-slate-200/90 dark:border-white/10 text-[#101B35] dark:text-slate-100 rounded-bl-xs shadow-soft'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#367BF5] dark:text-[#28C5D8] mb-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> TalentAI Career Coach
                      </div>
                    )}
                    {m.content}
                  </div>
                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-[#101B35] text-[#28C5D8] flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {sending && (
            <div className="flex items-center gap-2.5 animate-fade-in-up">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#28C5D8] to-[#367BF5] text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white dark:bg-[#0E172C] border border-slate-200/90 dark:border-white/10 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#367BF5] animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-[#28C5D8] animate-bounce [animation-delay:120ms]" />
                <span className="w-2 h-2 rounded-full bg-[#367BF5] animate-bounce [animation-delay:240ms]" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested Prompt Chips */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-white/[0.07] bg-white/80 dark:bg-[#0E172C]/90 flex items-center gap-2 overflow-x-auto">
          {suggestedActions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={sending}
              className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#367BF5]/10 to-[#28C5D8]/12 border border-[#367BF5]/20 text-[#2463EB] dark:text-[#28C5D8] hover:border-[#28C5D8]/60 hover:bg-[#367BF5]/15 transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-4 bg-white dark:bg-[#0E172C] border-t border-slate-200/80 dark:border-white/10 flex items-center gap-2.5"
        >
          <div className="flex-1">
            <Input
              placeholder="Ask about CV bullets, cover letters, salary negotiation, interview prep, or missing skills..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
          </div>
          <Button type="submit" loading={sending}>
            <Send className="w-4 h-4" /> Ask AI
          </Button>
        </form>
      </Card>
    </DashboardShell>
  );
}
