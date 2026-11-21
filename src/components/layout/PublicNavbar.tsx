'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BrainCircuit,
  Moon,
  Sun,
  Menu,
  X,
  ArrowRight,
  LayoutDashboard,
} from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/primitives';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/jobs', label: 'Find Jobs' },
  { href: '/features', label: 'AI Features' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact' },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardHref =
    user?.role === 'ADMIN'
      ? '/admin'
      : user?.role === 'RECRUITER'
      ? '/recruiter'
      : '/candidate';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-white/[0.08] bg-white/85 dark:bg-[#070C18]/85 backdrop-blur-xl">
      <div className="h-[2px] w-full bg-gradient-to-r from-[#101B35] via-[#367BF5] to-[#28C5D8]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#101B35] via-[#367BF5] to-[#28C5D8] flex items-center justify-center text-white shadow-md shadow-[#367BF5]/20 ring-1 ring-white/20 transition-transform duration-200 group-hover:scale-105">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold tracking-tight text-[#101B35] dark:text-white">
              Talent<span className="text-[#367BF5] dark:text-[#28C5D8]">AI</span>
            </span>
            <span className="hidden xl:inline-block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Hire with intelligence
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  active
                    ? 'bg-white dark:bg-[#132244] text-[#367BF5] dark:text-[#28C5D8] shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#101B35] dark:hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-2.5">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="p-2 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0E172C] text-slate-600 dark:text-slate-300 hover:border-[#367BF5]/40 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {user ? (
            <Link href={dashboardHref}>
              <Button size="sm">
                <LayoutDashboard className="w-4 h-4" />
                Workspace ({user.firstName})
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Open menu"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0B1325]/95 backdrop-blur-xl px-4 py-4 space-y-2 animate-fade-in-up">
          {NAV_LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                  active
                    ? 'bg-[#367BF5]/10 text-[#367BF5] dark:text-[#28C5D8]'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <div className="pt-3 flex flex-col gap-2 border-t border-slate-100 dark:border-white/10">
            {user ? (
              <Link href={dashboardHref} onClick={() => setMobileOpen(false)}>
                <Button className="w-full">Open Workspace</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full">Create Free Account</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
