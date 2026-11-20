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
  Activity,
  FileSpreadsheet,
  Sliders,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
  ChevronRight,
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
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FB] dark:bg-[#090E1D]">
        <PageLoader label="Verifying secure session..." />
      </div>
    );
  }

  const candidateNav: NavItem[] = [
    { href: '/candidate', label: 'Overview', icon: LayoutDashboard },
    { href: '/candidate/profile', label: 'My Profile', icon: UserCircle },
    { href: '/candidate/cv', label: 'My CV', icon: FileText },
    { href: '/candidate/jobs', label: 'Find Jobs', icon: Briefcase },
    { href: '/candidate/applications', label: 'My Applications', icon: ClipboardList },
    { href: '/candidate/assistant', label: 'AI Career Assistant', icon: Bot },
    { href: '/candidate/skills', label: 'Skill Analysis', icon: Sparkles },
    {
      href: '/candidate/notifications',
      label: 'Notifications & Inbox',
      icon: Bell,
      badgeCount: unreadNotifications + unreadMessages,
    },
    { href: '/candidate/settings', label: 'Settings', icon: Settings },
  ];

  const recruiterNav: NavItem[] = [
    { href: '/recruiter', label: 'Overview', icon: LayoutDashboard },
    { href: '/recruiter/company', label: 'Company Profile', icon: Building2 },
    { href: '/recruiter/jobs', label: 'Job Management', icon: Briefcase },
    { href: '/recruiter/jobs/new', label: 'Create Job', icon: PlusCircle },
    { href: '/recruiter/applications', label: 'Applications', icon: ClipboardList },
    { href: '/recruiter/matching', label: 'AI Candidate Matching', icon: Sparkles },
    { href: '/recruiter/candidates', label: 'Candidate Database', icon: Users },
    { href: '/recruiter/interviews', label: 'Interviews', icon: Calendar },
    { href: '/recruiter/analytics', label: 'Analytics', icon: BarChart3 },
    {
      href: '/recruiter/messages',
      label: 'Messages & Alerts',
      icon: MessageSquare,
      badgeCount: unreadMessages + unreadNotifications,
    },
    { href: '/recruiter/settings', label: 'Settings', icon: Settings },
  ];

  const adminNav: NavItem[] = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/users', label: 'User Management', icon: Users },
    { href: '/admin/candidates', label: 'Candidate Management', icon: UserCircle },
    { href: '/admin/recruiters', label: 'Recruiter Management', icon: Briefcase },
    { href: '/admin/companies', label: 'Company Management', icon: Building2 },
    { href: '/admin/jobs', label: 'Job Management', icon: ClipboardList },
    { href: '/admin/applications', label: 'Application Monitoring', icon: Activity },
    { href: '/admin/ai-usage', label: 'AI Usage Statistics', icon: Sparkles },
    { href: '/admin/reports', label: 'Reports', icon: FileSpreadsheet },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: ShieldAlert },
    { href: '/admin/settings', label: 'Platform Settings', icon: Sliders },
  ];

  const navItems =
    role === 'ADMIN' ? adminNav : role === 'RECRUITER' ? recruiterNav : candidateNav;

  const roleBadgeLabel =
    role === 'ADMIN'
      ? 'Platform Administrator'
      : role === 'RECRUITER'
      ? 'Recruiter Workspace'
      : 'Candidate Portal';

  const segments = pathname.split('/').filter(Boolean);

  return (
    <div className="min-h-screen flex bg-[#F4F7FB] dark:bg-[#090E1D]">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#101B35] text-slate-200 flex flex-col border-r border-slate-800 transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#367BF5] to-[#28C5D8] flex items-center justify-center text-white">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-extrabold text-white tracking-tight">
                Talent<span className="text-[#28C5D8]">AI</span>
              </span>
              <p className="text-[10px] uppercase tracking-wider text-[#28C5D8] font-semibold">
                {roleBadgeLabel}
              </p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
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
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isItemActive
                    ? 'bg-[#367BF5] text-white shadow-md shadow-[#367BF5]/25'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badgeCount && item.badgeCount > 0 ? (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#28C5D8] text-[#101B35]">
                    {item.badgeCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-[#367BF5]/25 border border-[#367BF5]/40 text-white flex items-center justify-center font-bold text-xs">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/15 border border-slate-700/80 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-[#101B35]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation sidebar"
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-700"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
              <Link href="/" className="hover:text-[#367BF5]">
                TalentAI
              </Link>
              {segments.map((seg, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  <span className="capitalize font-medium text-slate-700 dark:text-slate-200 truncate">
                    {seg.replace(/-/g, ' ')}
                  </span>
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={
                role === 'CANDIDATE'
                  ? '/candidate/notifications'
                  : role === 'RECRUITER'
                  ? '/recruiter/messages'
                  : '/admin/audit-logs'
              }
              className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications + unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#367BF5] text-[10px] font-bold text-white flex items-center justify-center">
                  {Math.min(9, unreadNotifications + unreadMessages)}
                </span>
              )}
            </Link>

            <button
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#101B35] dark:text-white">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
