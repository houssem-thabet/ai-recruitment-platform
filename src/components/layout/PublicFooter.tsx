import React from 'react';
import Link from 'next/link';
import { BrainCircuit, ShieldCheck } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="bg-[#101B35] text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#367BF5] to-[#28C5D8] flex items-center justify-center text-white">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold text-white">
                Talent<span className="text-[#28C5D8]">AI</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              &ldquo;Find the right talent. Hire with intelligence.&rdquo; — Modern,
              explainable AI recruitment &amp; career intelligence platform.
            </p>
            <div className="inline-flex items-center gap-1.5 text-xs text-[#28C5D8] bg-[#28C5D8]/10 px-3 py-1.5 rounded-full border border-[#28C5D8]/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Responsible &amp; Human-in-the-Loop AI
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/jobs" className="hover:text-white transition-colors">
                  Discover Jobs
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-white transition-colors">
                  AI Capabilities
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
              Company
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About TalentAI
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Recruiter Portal
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
              Governance &amp; Legal
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy &amp; CV Data Notice
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              Academic Capstone Edition — Seeded records use strictly fictional
              accounts and organizations.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} TalentAI Platform. All rights reserved.</p>
          <p>Built with Next.js, TypeScript, PostgreSQL, Prisma &amp; Explainable AI.</p>
        </div>
      </div>
    </footer>
  );
}
