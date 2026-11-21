import React from 'react';
import Link from 'next/link';
import { BrainCircuit, ShieldCheck, Sparkles } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#0A1124] text-slate-300 border-t border-white/[0.08]">
      <div className="h-[2px] w-full bg-gradient-to-r from-[#101B35] via-[#367BF5] to-[#28C5D8]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#367BF5] to-[#28C5D8] flex items-center justify-center text-white shadow-md">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold text-white tracking-tight">
                Talent<span className="text-[#28C5D8]">AI</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md">
              &ldquo;Find the right talent. Hire with intelligence.&rdquo; — Modern,
              explainable AI recruitment &amp; career intelligence platform engineered for
              fair, human-centered hiring.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#28C5D8] bg-[#28C5D8]/10 px-3 py-1 rounded-full border border-[#28C5D8]/25">
                <ShieldCheck className="w-3.5 h-3.5" />
                Human-in-the-Loop Governance
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-300 bg-[#367BF5]/15 px-3 py-1 rounded-full border border-[#367BF5]/25">
                <Sparkles className="w-3.5 h-3.5" />
                Explainable 0–100 Scoring
              </span>
            </div>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-xs font-extrabold uppercase tracking-[0.08em] text-white mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="/jobs" className="hover:text-[#28C5D8] transition-colors">
                  Discover Jobs
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-[#28C5D8] transition-colors">
                  AI Capabilities
                </Link>
              </li>
              <li>
                <Link
                  href="/how-it-works"
                  className="hover:text-[#28C5D8] transition-colors"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-[#28C5D8] transition-colors">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-xs font-extrabold uppercase tracking-[0.08em] text-white mb-4">
              Workspaces
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="/about" className="hover:text-[#28C5D8] transition-colors">
                  About TalentAI
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#28C5D8] transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#28C5D8] transition-colors">
                  Sign In Portal
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-xs font-extrabold uppercase tracking-[0.08em] text-white mb-4">
              Governance &amp; Legal
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="/privacy" className="hover:text-[#28C5D8] transition-colors">
                  Privacy &amp; CV Data Notice
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#28C5D8] transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              Seeded demonstration data uses strictly fictional candidate and organization
              personas.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} TalentAI Platform. All rights reserved.</p>
          <p className="text-slate-400">
            Engineered with Next.js 14, TypeScript, PostgreSQL, Prisma &amp; Explainable AI
          </p>
        </div>
      </div>
    </footer>
  );
}
