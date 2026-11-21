'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BrainCircuit,
  LayoutDashboard,
  UserCircle,
  FileText,
  Briefcase,
  ClipboardList,
  Bot,
  BarChart3,
  Bell,
  Settings,
  Building2,
  PlusCircle,
  Sparkles,
  Users,
  Calendar,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Activity,
  FileSpreadsheet,
  Sliders,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Compass,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { PageLoader } from '@/components/ui/primitives';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

export function DashboardShell({
  role,
  title,
  subtitle,
  actions,
  children,
}: {
  role: 'CANDIDATE' | 'RECRUITER' | 'ADMIN';
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user, loading, unreadNotifications, unreadMessages, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (user.role !== role) {
        const dest =
          user.role === 'ADMIN'
            ? '/admin'
            : user.role === 'RECRUITER'
            ? '/recruiter'
            : '/candidate';
        router.replace(dest);
      }
    }
  }, [loading, user, role, pathname, router]);

  if (loading || !user || user.role !== role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FC] dark:bg-[#070C18]">
        <PageLoader label="Verifying secure session..." />
      </div>
    );
  }

  const candidateGroups: NavGroup[] = [
    {
      section: 'Career Studio',
      items: [
        { href: '/candidate', label: 'Overview', icon: LayoutDashboard },
        { href: '/candidate/profile', label: 'My Profile', icon: UserCircle },
        { href: '/candidate/cv', label: 'My CV & Analyzer', icon: FileText },
        { href: '/candidate/jobs', label: 'Find Jobs', icon: Briefcase },
        { href: '/candidate/applications', label: 'My Applications', icon: ClipboardList },
      ],
    },
    {
      section: 'AI Career Intelligence',
      items: [
        { href: '/candidate/assistant', label: 'AI Career Assistant', icon: Bot },
        { href: '/candidate/skills', label: 'Skill Gap Analysis', icon: Sparkles },
      ],
    },
    {
      section: 'Inbox & Account',
      items: [
        {
          href: '/candidate/notifications',
          label: 'Notifications & Inbox',
          icon: Bell,
          badgeCount: unreadNotifications + unreadMessages,
        },
        { href: '/candidate/settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const recruiterGroups: NavGroup[] = [
    {
      section: 'Hiring Pipeline',
      items: [
        { href: '/recruiter', label: 'Executive Overview', icon: LayoutDashboard },
        { href: '/recruiter/company', label: 'Company Profile', icon: Building2 },
        { href: '/recruiter/jobs', label: 'Job Management', icon: Briefcase },
        { href: '/recruiter/jobs/new', label: 'Create Job', icon: PlusCircle },
        { href: '/recruiter/applications', label: 'Applicant Pipeline', icon: ClipboardList },
      ],
    },
    {
      section: 'AI Sourcing & Evaluation',
      items: [
        { href: '/recruiter/matching', label: 'AI Candidate Matching', icon: Sparkles },
        { href: '/recruiter/candidates', label: 'Talent Pool Search', icon: Users },
        { href: '/recruiter/interviews', label: 'Interview Hub', icon: Calendar },
      ],
    },
    {
      section: 'Insights & Comms',
      items: [
        { href: '/recruiter/analytics', label: 'Funnel Analytics', icon: BarChart3 },
        {
          href: '/recruiter/messages',
          label: 'Messages & Alerts',
          icon: MessageSquare,
          badgeCount: unreadMessages + unreadNotifications,
        },
        { href: '/recruiter/settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const adminGroups: NavGroup[] = [
    {
      section: 'Identity & Directory',
      items: [
        { href: '/admin', label: 'System Overview', icon: LayoutDashboard },
        { href: '/admin/users', label: 'User Directory', icon: Users },
        { href: '/admin/candidates', label: 'Candidates', icon: UserCircle },
        { href: '/admin/recruiters', label: 'Recruiters', icon: Briefcase },
        { href: '/admin/companies', label: 'Organizations', icon: Building2 },
      ],
    },
    {
      section: 'Operations & Moderation',
      items: [
        { href: '/admin/jobs', label: 'Job Moderation', icon: ClipboardList },
        { href: '/admin/applications', label: 'Application Stream', icon: Activity },
        { href: '/admin/reports', label: 'Data Exports', icon: FileSpreadsheet },
      ],
    },
    {
      section: 'AI & Security Governance',
      items: [
        { href: '/admin/ai-usage', label: 'AI Telemetry Logs', icon: Sparkles },
        { href: '/admin/audit-logs', label: 'Security Audit Trail', icon: ShieldAlert },
        { href: '/admin/settings', label: 'Platform Controls', icon: Sliders },
      ],
    },
  ];

  const navGroups =
    role === 'ADMIN'
      ? adminGroups
      : role === 'RECRUITER'
      ? recruiterGroups
      : candidateGroups;

  // Distinct visual signatures per workspace role while staying strictly within Navy / Electric Blue / Cyan
  const roleTheme = {
    CANDIDATE: {
      badge: 'Candidate Career Studio',
      sidebarBg:
        'bg-gradient-to-b from-[#0E1C3A] via-[#101B35] to-[#0A1328] border-r border-[#28C5D8]/15',
      logoRing: 'from-[#28C5D8] via-[#367BF5] to-[#1D58D8]',
      roleLabelColor: 'text-[#28C5D8]',
      activeNav:
        'bg-gradient-to-r from-[#28C5D8] to-[#367BF5] text-[#071022] font-bold shadow-md shadow-[#28C5D8]/25',
      activeIcon: 'text-[#071022]',
      topStrip: 'from-[#28C5D8] via-[#367BF5] to-[#28C5D8]',
      headerGlow:
        'bg-gradient-to-r from-[#28C5D8]/[0.07] via-[#367BF5]/[0.04] to-transparent border-[#28C5D8]/20',
      avatarStyle:
        'bg-gradient-to-br from-[#28C5D8]/30 to-[#367BF5]/30 border-[#28C5D8]/50 text-[#28C5D8]',
      pillText: 'Career Growth Mode',
      RoleIcon: Compass,
    },
    RECRUITER: {
      badge: 'Recruiter ATS Command',
      sidebarBg:
        'bg-gradient-to-b from-[#101B35] via-[#0C152B] to-[#080F20] border-r border-[#367BF5]/20',
      logoRing: 'from-[#367BF5] via-[#2563EB] to-[#28C5D8]',
      roleLabelColor: 'text-[#6CA3FF]',
      activeNav:
        'bg-gradient-to-r from-[#367BF5] to-[#2260DC] text-white font-semibold shadow-md shadow-[#367BF5]/30 ring-1 ring-inset ring-white/20',
      activeIcon: 'text-white',
      topStrip: 'from-[#101B35] via-[#367BF5] to-[#28C5D8]',
      headerGlow:
        'bg-gradient-to-r from-[#367BF5]/[0.07] via-[#101B35]/[0.03] to-transparent border-[#367BF5]/20',
      avatarStyle:
        'bg-gradient-to-br from-[#367BF5]/35 to-[#18284D] border-[#367BF5]/50 text-white',
      pillText: 'Talent Acquisition Suite',
      RoleIcon: Briefcase,
    },
    ADMIN: {
      badge: 'Governance & Telemetry',
      sidebarBg:
        'bg-[#070D1C] bg-grid-navy border-r border-slate-800/90',
      logoRing: 'from-[#101B35] via-[#367BF5] to-[#28C5D8]',
      roleLabelColor: 'text-[#28C5D8]',
      activeNav:
        'bg-[#132244] text-white font-semibold border border-[#28C5D8]/35 shadow-[inset_3px_0_0_#28C5D8]',
      activeIcon: 'text-[#28C5D8]',
      topStrip: 'from-[#0A1124] via-[#28C5D8] to-[#367BF5]',
      headerGlow:
        'bg-gradient-to-r from-[#101B35]/[0.06] via-[#28C5D8]/[0.06] to-transparent dark:from-[#132244]/50 border-slate-200/90 dark:border-[#28C5D8]/20',
      avatarStyle:
        'bg-[#132244] border-[#28C5D8]/50 text-[#28C5D8]',
      pillText: 'Telemetry Active',
      RoleIcon: ShieldCheck,
    },
  }[role];

  const RoleIcon = roleTheme.RoleIcon;
  const segments = pathname.split('/').filter(Boolean);

  return (
    <div className="min-h-screen flex bg-[#F4F7FC] dark:bg-[#070C18]">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-[#060A16]/65 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Role-Distinct Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[268px] text-slate-200 flex flex-col transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          roleTheme.sidebarBg
        } ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.08]">
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${roleTheme.logoRing} flex items-center justify-center text-white shadow-md ring-1 ring-white/20 transition-transform group-hover:scale-105`}
            >
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold text-white tracking-tight leading-none">
                  Talent<span className="text-[#28C5D8]">AI</span>
                </span>
              </div>
              <p
                className={`text-[10px] uppercase tracking-[0.08em] font-bold mt-1 ${roleTheme.roleLabelColor}`}
              >
                {roleTheme.badge}
              </p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation sidebar"
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5">
          {navGroups.map((group) => (
            <div key={group.section} className="space-y-1">
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400/75">
                {group.section}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isRoot =
                  item.href === '/candidate' ||
                  item.href === '/recruiter' ||
                  item.href === '/admin';
                const active = isRoot
                  ? pathname === item.href
                  : pathname === item.href ||
                    (pathname.startsWith(`${item.href}/`) &&
                      item.href !== '/recruiter/jobs');

                const exactJobsMatch =
                  item.href === '/recruiter/jobs' && pathname === '/recruiter/jobs';
                const isItemActive = active || exactJobsMatch;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] transition-all duration-150 ${
                      isItemActive
                        ? roleTheme.activeNav
                        : 'text-slate-300/90 font-medium hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                          isItemActive
                            ? roleTheme.activeIcon
                            : 'text-slate-400 group-hover:text-[#28C5D8]'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badgeCount && item.badgeCount > 0 ? (
                      <span
                        className={`px-2 py-0.5 text-[10px] font-extrabold font-mono tabular-nums rounded-full ${
                          isItemActive
                            ? 'bg-[#101B35] text-[#28C5D8]'
                            : 'bg-[#28C5D8] text-[#0A1124]'
                        }`}
                      >
                        {item.badgeCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Identity Card & Sign Out */}
        <div className="p-3.5 border-t border-white/[0.08] bg-black/15 space-y-2.5">
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center font-extrabold text-xs shrink-0 ${roleTheme.avatarStyle}`}
            >
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Role Signature Top Accent Line */}
        <div className={`h-[3px] w-full bg-gradient-to-r ${roleTheme.topStrip}`} />

        <header className="sticky top-0 z-30 h-16 bg-white/85 dark:bg-[#0B1325]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.08] px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation sidebar"
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumbs */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate"
            >
              <Link
                href="/"
                className="font-semibold text-slate-600 dark:text-slate-300 hover:text-[#367BF5] dark:hover:text-[#28C5D8] transition-colors"
              >
                TalentAI
              </Link>
              {segments.map((seg, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-50" />
                  <span
                    className={`capitalize truncate ${
                      idx === segments.length - 1
                        ? 'font-bold text-[#101B35] dark:text-white'
                        : 'font-medium text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {seg.replace(/-/g, ' ')}
                  </span>
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Distinct Workspace Identity Pill */}
            <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border border-slate-200/90 dark:border-white/10 bg-slate-50/90 dark:bg-white/[0.04] text-[#101B35] dark:text-slate-200">
              {role === 'ADMIN' ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ) : (
                <RoleIcon className="w-3.5 h-3.5 text-[#367BF5] dark:text-[#28C5D8]" />
              )}
              <span>{roleTheme.pillText}</span>
            </div>

            {role === 'CANDIDATE' && (
              <Link
                href="/candidate/assistant"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#367BF5]/10 to-[#28C5D8]/15 text-[#2463EB] dark:text-[#28C5D8] border border-[#28C5D8]/30 hover:border-[#28C5D8]/60 transition-all"
              >
                <Bot className="w-3.5 h-3.5" /> Ask Career AI
              </Link>
            )}

            {role === 'RECRUITER' && (
              <Link
                href="/recruiter/jobs/new"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#367BF5]/10 text-[#2463EB] dark:bg-[#367BF5]/20 dark:text-blue-300 border border-[#367BF5]/25 hover:bg-[#367BF5]/20 transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Post Role
              </Link>
            )}

            <Link
              href={
                role === 'CANDIDATE'
                  ? '/candidate/notifications'
                  : role === 'RECRUITER'
                  ? '/recruiter/messages'
                  : '/admin/audit-logs'
              }
              className="relative p-2 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0E172C] text-slate-600 dark:text-slate-300 hover:border-[#367BF5]/40 hover:text-[#367BF5] dark:hover:text-[#28C5D8] transition-all"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications + unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-[#367BF5] to-[#28C5D8] text-[10px] font-extrabold text-white flex items-center justify-center shadow-sm">
                  {Math.min(9, unreadNotifications + unreadMessages)}
                </span>
              )}
            </Link>

            <button
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="p-2 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0E172C] text-slate-600 dark:text-slate-300 hover:border-[#367BF5]/40 transition-all"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-7xl w-full mx-auto space-y-6 animate-fade-in-up">
          {/* Role-Accented Page Title Banner */}
          <div
            className={`rounded-2xl border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${roleTheme.headerGlow}`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    role === 'CANDIDATE'
                      ? 'bg-[#28C5D8]'
                      : role === 'RECRUITER'
                      ? 'bg-[#367BF5]'
                      : 'bg-emerald-500'
                  }`}
                />
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  {roleTheme.badge}
                </span>
              </div>
              <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#101B35] dark:text-white">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2.5 flex-wrap shrink-0">{actions}</div>
            )}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
