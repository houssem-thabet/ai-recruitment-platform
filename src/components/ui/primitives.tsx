'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Loader2, X } from 'lucide-react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}) {
  const variants = {
    primary:
      'bg-[#367BF5] hover:bg-[#1A62E6] text-white shadow-sm shadow-[#367BF5]/20',
    secondary:
      'bg-[#101B35] hover:bg-[#18284D] text-white dark:bg-slate-800 dark:hover:bg-slate-700',
    accent:
      'bg-[#28C5D8] hover:bg-[#1EA0B0] text-[#101B35] font-semibold',
    outline:
      'border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101B35] hover:bg-slate-50 dark:hover:bg-slate-800/70 text-[#101B35] dark:text-slate-100',
    ghost:
      'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
  };
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#367BF5]/40 disabled:opacity-55 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#101B35] shadow-soft',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?:
    | 'default'
    | 'electric'
    | 'cyan'
    | 'success'
    | 'warning'
    | 'danger'
    | 'purple';
  className?: string;
}) {
  const styles = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    electric:
      'bg-[#367BF5]/10 text-[#367BF5] dark:bg-[#367BF5]/20 dark:text-blue-300 border border-[#367BF5]/20',
    cyan: 'bg-[#28C5D8]/15 text-[#147480] dark:text-[#28C5D8] border border-[#28C5D8]/25',
    success:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20',
    warning:
      'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20',
    danger:
      'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20',
    purple:
      'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Input({
  label,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1326] px-3.5 py-2.5 text-sm text-[#101B35] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#367BF5] focus:outline-none focus:ring-2 focus:ring-[#367BF5]/20 transition-all',
          error && 'border-rose-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

export function Textarea({
  label,
  error,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1326] px-3.5 py-2.5 text-sm text-[#101B35] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#367BF5] focus:outline-none focus:ring-2 focus:ring-[#367BF5]/20 transition-all',
          error && 'border-rose-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          {label}
        </label>
      )}
      <select
        className={cn(
          'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1326] px-3.5 py-2.5 text-sm text-[#101B35] dark:text-slate-100 focus:border-[#367BF5] focus:outline-none focus:ring-2 focus:ring-[#367BF5]/20 transition-all',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101B35]/60 backdrop-blur-sm"
    >
      <div
        className={cn(
          'w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101B35] shadow-2xl max-h-[90vh] flex flex-col',
          maxWidth
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-[#101B35] dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
      : score >= 60
      ? 'bg-[#367BF5]/15 text-[#367BF5] dark:text-blue-300 border-[#367BF5]/30'
      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono text-xs font-bold',
        color
      )}
    >
      {score}/100
    </span>
  );
}

export function AIModeBadge({ mode }: { mode?: string }) {
  const isLive = mode === 'LIVE_LLM';
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gradient-to-r from-[#367BF5]/15 to-[#28C5D8]/15 text-[#367BF5] dark:text-[#28C5D8] border border-[#28C5D8]/30">
      <Sparkles className="w-3.5 h-3.5" />
      {isLive ? 'AI: Live LLM + Deterministic' : 'AI: Deterministic NLP (Demo Mode)'}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    'default' | 'electric' | 'cyan' | 'success' | 'warning' | 'danger' | 'purple'
  > = {
    SUBMITTED: 'default',
    UNDER_REVIEW: 'electric',
    SHORTLISTED: 'cyan',
    INTERVIEW_SCHEDULED: 'purple',
    INTERVIEW_COMPLETED: 'purple',
    OFFERED: 'success',
    HIRED: 'success',
    REJECTED: 'danger',
    WITHDRAWN: 'warning',
    PUBLISHED: 'success',
    DRAFT: 'default',
    PAUSED: 'warning',
    CLOSED: 'danger',
    MODERATION_HOLD: 'danger',
    ACTIVE: 'success',
    SUSPENDED: 'danger',
    INVITED: 'electric',
    ACCEPTED: 'success',
    RESCHEDULE_REQUESTED: 'warning',
    RESCHEDULED: 'cyan',
    COMPLETED: 'success',
    CANCELLED: 'danger',
  };
  return (
    <Badge variant={map[status] || 'default'}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

export function PageLoader({ label = 'Loading workspace...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 dark:text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin text-[#367BF5]" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-[#367BF5]/10 text-[#367BF5] flex items-center justify-center mb-3">
          {icon}
        </div>
      )}
      <h4 className="text-base font-bold text-[#101B35] dark:text-white">{title}</h4>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-4">
        {description}
      </p>
      {action}
    </div>
  );
}
