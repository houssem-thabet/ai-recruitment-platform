'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, Trash2, Sparkles } from 'lucide-react';
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
  }, [messages]);

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
      subtitle="Personalized coaching grounded strictly on your authorized profile, CV audit, and live jobs"
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
      <Card className="flex flex-col h-[620px] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40 dark:bg-[#0B1326]/40">
          {loading ? (
            <PageLoader label="Loading conversation history..." />
          ) : messages.length === 0 ? (
            <div className="max-w-xl mx-auto text-center py-12 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#367BF5] to-[#28C5D8] text-white flex items-center justify-center mx-auto shadow-md">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-[#101B35] dark:text-white">
                Hello! Ask Me Anything About Your Career Journey
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                I use your TalentAI skills, CV analysis, and open platform roles to give
                concrete, truthful guidance without inventing credentials.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-[#367BF5] text-white rounded-br-sm'
                        : 'bg-white dark:bg-[#101B35] border border-slate-200 dark:border-slate-700 text-[#101B35] dark:text-slate-100 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#367BF5] dark:text-[#28C5D8] mb-1">
                        <Sparkles className="w-3.5 h-3.5" /> TalentAI Career Assistant
                      </div>
                    )}
                    {m.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Prompt Chips */}
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
          {suggestedActions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={sending}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-[#367BF5]/10 text-[#367BF5] dark:text-[#28C5D8] hover:bg-[#367BF5]/20 transition-colors"
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
          className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2.5"
        >
          <div className="flex-1">
            <Input
              placeholder="Ask about CV improvements, interview prep, missing skills, or matching jobs..."
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
