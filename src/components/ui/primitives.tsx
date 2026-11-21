'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Loader2, X, ChevronDown } from 'lucide-react';

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
      'bg-gradient-to-b from-[#4587FA] to-[#2B6EEB] hover:from-[#367BF5] hover:to-[#1A5CD8] text-white shadow-sm shadow-[#367BF5]/25 hover:shadow-md hover:shadow-[#367BF5]/30 ring-1 ring-inset ring-white/20',
    secondary:
      'bg-[#101B35] hover:bg-[#18284D] text-white shadow-sm ring-1 ring-inset ring-white/10 dark:bg-slate-800 dark:hover:bg-slate-700',
    accent:
      'bg-gradient-to-r from-[#28C5D8] to-[#20B2C6] hover:from-[#22B5C7] hover:to-[#199DAD] text-[#0A1124] font-bold shadow-sm shadow-[#28C5D8]/25 ring-1 ring-inset ring-white/30',
    outline:
      'border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-[#0E172C] hover:bg-slate-50/90 dark:hover:bg-slate-800/70 hover:border-[#367BF5]/40 dark:hover:border-[#28C5D8]/40 text-[#101B35] dark:text-slate-100 shadow-[0_1px_2px_rgba(16,27,53,0.04)]',
    ghost:
      'hover:bg-slate-100/90 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200',
    danger:
      'bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-sm shadow-rose-500/20 ring-1 ring-inset ring-white/15',
  };
  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs rounded-xl',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-sm sm:text-base rounded-2xl',
  };
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold tracking-[-0.01em] transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#367BF5] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#070C18] disabled:opacity-55 disabled:pointer-events-none select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
}

export function Card({
  children,
  className,
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0E172C] shadow-soft transition-all duration-200',
        interactive &&
          'hover:-translate-y-0.5 hover:shadow-elevated hover:border-[#367BF5]/35 dark:hover:border-[#28C5D8]/35',
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
  dot = false,
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
    | 'purple'
    | 'navy';
  dot?: boolean;
  className?: string;
}) {
  const styles = {
    default:
      'bg-slate-100/90 text-slate-700 border border-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/70',
    navy: 'bg-[#101B35] text-white border border-[#223766] dark:bg-[#18284D] dark:text-[#28C5D8]',
    electric:
      'bg-[#367BF5]/10 text-[#2463EB] dark:bg-[#367BF5]/20 dark:text-blue-300 border border-[#367BF5]/25',
    cyan: 'bg-[#28C5D8]/12 text-[#0F7685] dark:bg-[#28C5D8]/15 dark:text-[#4AE0F2] border border-[#28C5D8]/30',
    success:
      'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-500/25',
    warning:
      'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-500/25',
    danger:
      'bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-500/25',
    purple:
      'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 border border-indigo-500/25',
  };

  const dotColor = {
    default: 'bg-slate-400',
    navy: 'bg-[#28C5D8]',
    electric: 'bg-[#367BF5]',
    cyan: 'bg-[#28C5D8]',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    purple: 'bg-indigo-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight whitespace-nowrap',
        styles[variant],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColor[variant])} />}
      {children}
    </span>
  );
}

export function Input({
  label,
  error,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-[#091022] px-3.5 py-2.5 text-sm text-[#101B35] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[#367BF5] dark:focus:border-[#28C5D8] focus:outline-none focus:ring-4 focus:ring-[#367BF5]/15 dark:focus:ring-[#28C5D8]/15 transition-all duration-150',
          error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/15',
          className
        )}
        {...props}
      />
      {hint && !error && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>
      )}
      {error && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
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
        <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          'w-full rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-[#091022] px-3.5 py-2.5 text-sm text-[#101B35] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[#367BF5] dark:focus:border-[#28C5D8] focus:outline-none focus:ring-4 focus:ring-[#367BF5]/15 dark:focus:ring-[#28C5D8]/15 transition-all duration-150',
          error && 'border-rose-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
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
        <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={cn(
            'w-full appearance-none rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-[#091022] pl-3.5 pr-9 py-2.5 text-sm font-medium text-[#101B35] dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 focus:border-[#367BF5] dark:focus:border-[#28C5D8] focus:outline-none focus:ring-4 focus:ring-[#367BF5]/15 dark:focus:ring-[#28C5D8]/15 transition-all duration-150 cursor-pointer',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      </div>
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#060A16]/65 backdrop-blur-md transition-opacity"
    >
      <div
        className={cn(
          'w-full rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0E172C] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in',
          maxWidth
        )}
      >
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.08] bg-gradient-to-r from-[#367BF5]/[0.04] via-transparent to-[#28C5D8]/[0.05]">
          <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-[#101B35] dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
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
  const clamped = Math.max(0, Math.min(100, Math.round(score || 0)));
  const circumference = 2 * Math.PI * 8;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  const palette =
    clamped >= 80
      ? {
          wrap: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-500/30',
          stroke: '#10B981',
        }
      : clamped >= 60
      ? {
          wrap: 'bg-[#367BF5]/10 text-[#2463EB] dark:bg-[#367BF5]/20 dark:text-[#66A3FF] border-[#367BF5]/30',
          stroke: '#367BF5',
        }
      : {
          wrap: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-amber-500/30',
          stroke: '#F59E0B',
        };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-xl border font-mono text-xs font-extrabold tabular-nums shadow-[0_1px_2px_rgba(16,27,53,0.04)]',
        palette.wrap
      )}
    >
      <svg className="w-4 h-4 -rotate-90 shrink-0" viewBox="0 0 20 20">
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.18"
          strokeWidth="2.5"
        />
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke={palette.stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      {clamped}/100
    </span>
  );
}

export function AIModeBadge({ mode }: { mode?: string }) {
  const isLive = mode === 'LIVE_LLM';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-tight border shadow-[0_1px_2px_rgba(16,27,53,0.04)]',
        isLive
          ? 'bg-gradient-to-r from-[#367BF5]/15 to-[#28C5D8]/20 text-[#1D58D8] dark:text-[#4AE0F2] border-[#28C5D8]/40'
          : 'bg-gradient-to-r from-[#101B35]/[0.06] to-[#367BF5]/12 text-[#101B35] dark:from-[#367BF5]/15 dark:to-[#28C5D8]/15 dark:text-[#28C5D8] border-[#367BF5]/25'
      )}
    >
      <Sparkles className="w-3.5 h-3.5 text-[#367BF5] dark:text-[#28C5D8]" />
      {isLive ? 'AI: Live LLM + Verified' : 'AI: Deterministic NLP'}
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
    <Badge variant={map[status] || 'default'} dot>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

export function KPICard({
  label,
  value,
  icon: Icon,
  tone = 'electric',
  subtitle,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: 'electric' | 'cyan' | 'navy' | 'emerald' | 'amber' | 'indigo';
  subtitle?: string;
  className?: string;
}) {
  const tones = {
    electric: {
      bar: 'from-[#367BF5] to-[#5F97F7]',
      iconBg: 'bg-[#367BF5]/10 text-[#367BF5] dark:bg-[#367BF5]/20 dark:text-[#6BA3FF]',
    },
    cyan: {
      bar: 'from-[#28C5D8] to-[#367BF5]',
      iconBg: 'bg-[#28C5D8]/15 text-[#138A99] dark:bg-[#28C5D8]/20 dark:text-[#4AE0F2]',
    },
    navy: {
      bar: 'from-[#101B35] via-[#367BF5] to-[#28C5D8]',
      iconBg: 'bg-[#101B35]/10 text-[#101B35] dark:bg-white/10 dark:text-[#28C5D8]',
    },
    emerald: {
      bar: 'from-emerald-500 to-[#28C5D8]',
      iconBg: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300',
    },
    amber: {
      bar: 'from-amber-500 to-orange-400',
      iconBg: 'bg-amber-500/12 text-amber-600 dark:text-amber-300',
    },
    indigo: {
      bar: 'from-indigo-500 to-[#367BF5]',
      iconBg: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-300',
    },
  };

  const t = tones[tone];

  return (
    <Card
      className={cn(
        'relative overflow-hidden p-5 group hover:-translate-y-0.5 hover:shadow-elevated transition-all duration-200',
        className
      )}
    >
      <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', t.bar)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 truncate">
            {label}
          </p>
          <p className="text-2xl sm:text-[26px] font-extrabold font-mono tabular-nums tracking-tight text-[#101B35] dark:text-white mt-2">
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105',
              t.iconBg
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </Card>
  );
}

export function PremiumChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#0A1124]/95 backdrop-blur-md px-3.5 py-2.5 shadow-xl text-xs">
      {label && (
        <p className="font-bold text-[#101B35] dark:text-white mb-1.5 border-b border-slate-100 dark:border-white/10 pb-1">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: entry.color || entry.fill || '#367BF5' }}
              />
              {entry.name}:
            </span>
            <span className="font-mono font-extrabold tabular-nums text-[#101B35] dark:text-white">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageLoader({ label = 'Loading workspace...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-500 dark:text-slate-400 animate-fade-in-up">
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#367BF5]/20 to-[#28C5D8]/20 animate-ping" />
        <div className="relative w-12 h-12 rounded-2xl bg-white dark:bg-[#0E172C] border border-slate-200/80 dark:border-white/10 shadow-soft flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#367BF5]" />
        </div>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
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
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 rounded-2xl border border-dashed border-slate-200/90 dark:border-white/10 bg-gradient-to-b from-white to-slate-50/60 dark:from-[#0E172C] dark:to-[#091022]/60 animate-fade-in-up">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#367BF5]/15 to-[#28C5D8]/15 border border-[#367BF5]/20 text-[#367BF5] dark:text-[#28C5D8] flex items-center justify-center mb-4 shadow-sm">
          {icon}
        </div>
      )}
      <h4 className="text-base font-extrabold text-[#101B35] dark:text-white">{title}</h4>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1.5 mb-5 leading-relaxed">
        {description}
      </p>
      {action}
    </div>
  );
}
