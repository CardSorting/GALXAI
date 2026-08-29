'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  Globe,
  CheckCircle2,
  Code2,
  ChevronRight,
  ChevronLeft,
  Send,
  User,
  Mail,
  Github,
  Linkedin,
  AlertCircle,
  Flame,
  Check,
  Compass,
  Rocket,
  Share2,
  FileText
} from 'lucide-react';
import { JobRole } from '@/data/jobRoles';

interface JobRoleDetailClientProps {
  role: JobRole;
}

const HIRING_STAGES = [
  {
    step: '01',
    title: 'Initial Technical Sync',
    duration: '30 mins',
    desc: 'A conversation with our engineering lead to discuss your background, passion projects, and architectural philosophy.',
  },
  {
    step: '02',
    title: 'Hands-on Technical Deep Dive',
    duration: '2–3 hrs (Paid)',
    desc: 'A real-world coding exercise or system architecture review. We respect your time and never ask trivia questions.',
  },
  {
    step: '03',
    title: 'System Design & Team Chat',
    duration: '45 mins',
    desc: 'Collaborative architectural session exploring low-latency streaming, edge routing, or frontend craft with future teammates.',
  },
  {
    step: '04',
    title: 'Fast-Track Offer',
    duration: '< 48 hours',
    desc: 'Transparent compensation and equity offer package delivered rapidly with zero corporate delays.',
  },
];

export function JobRoleDetailClient({ role }: JobRoleDetailClientProps) {
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantGithub, setApplicantGithub] = useState('');
  const [applicantLinkedin, setApplicantLinkedin] = useState('');
  const [applicantNote, setApplicantNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName || !applicantEmail) {
      setFormError('Please provide your full name and email address.');
      return;
    }

    setLoading(true);
    setFormError(null);

    setTimeout(() => {
      setLoading(false);
      setApplicationSubmitted(true);
    }, 700);
  };

  return (
    <div className="space-y-12">
      {/* Top Breadcrumb / Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/careers"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to All Open Roles</span>
        </Link>

        <button
          onClick={handleShare}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Role</span>
            </>
          )}
        </button>
      </div>

      {/* Role Hero Header */}
      <header className="p-8 sm:p-10 rounded-3xl bg-zinc-900/60 border border-white/10 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
            {role.department}
          </span>
          {role.urgency === 'Immediate' && (
            <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Immediate Critical Hire</span>
            </span>
          )}
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-zinc-500" />
            <span>{role.location}</span>
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>{role.experienceLabel}</span>
          </span>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            {role.title}
          </h1>
          <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-3xl">
            {role.description}
          </p>
        </div>

        {/* Tech Stack Tags */}
        <div className="flex flex-wrap gap-2 pt-1">
          {role.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-xs font-mono"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Compensation & SLA Badges */}
        <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-300 backdrop-blur-md">
              Early-Stage Compensation &amp; Equity (Open)
            </span>
          </div>

          <a
            href="#apply-form"
            className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs font-mono flex items-center gap-2 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
          >
            <span>Apply for this Role (24H SLA)</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Main Content Grid: Detailed Specs on Left, Position Summary on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Role Details */}
        <div className="lg:col-span-2 space-y-10">
          {/* First 90 Days Roadmap */}
          <section className="p-7 sm:p-8 rounded-3xl bg-zinc-900/40 border border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
              <Rocket className="w-4 h-4 text-cyan-400" />
              <span>What You Will Ship in Your First 90 Days</span>
            </div>
            <div className="space-y-3 pt-2">
              {role.first90Days.map((milestone, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <div className="text-xs font-mono text-cyan-400 font-bold">
                    Milestone {idx + 1}
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {milestone}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Key Responsibilities */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Key Responsibilities
            </h2>
            <ul className="space-y-3 text-xs sm:text-sm text-zinc-300">
              {role.responsibilities.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-900/30 border border-white/5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Requirements & Qualifications */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              What We Look For
            </h2>
            <ul className="space-y-3 text-xs sm:text-sm text-zinc-300">
              {role.requirements.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-900/30 border border-white/5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Nice to Haves */}
          {role.niceToHave && role.niceToHave.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Nice-to-Have (Bonus)
              </h2>
              <ul className="space-y-3 text-xs sm:text-sm text-zinc-400">
                {role.niceToHave.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 4-Step Hiring Process */}
          <section className="space-y-4 pt-4 border-t border-white/10">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Our 4-Step Hiring Timeline
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HIRING_STAGES.map((stage, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-cyan-400 font-bold">Stage {stage.step}</span>
                    <span className="text-zinc-500">{stage.duration}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{stage.title}</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{stage.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Application Form */}
          <section id="apply-form" className="p-8 rounded-3xl bg-[#0d101d] border border-cyan-500/30 space-y-6 scroll-mt-24 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-white">Apply for {role.title}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                    24H Review SLA
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Every technical submission is reviewed by our engineering leads within 24 hours.
                </p>
              </div>
            </div>

            {!applicationSubmitted ? (
              <form onSubmit={handleApplySubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="Ada Lovelace"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={applicantEmail}
                      onChange={(e) => setApplicantEmail(e.target.value)}
                      placeholder="ada@domain.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">GitHub / Code Profile</label>
                    <input
                      type="url"
                      value={applicantGithub}
                      onChange={(e) => setApplicantGithub(e.target.value)}
                      placeholder="https://github.com/username"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">LinkedIn / Portfolio URL</label>
                    <input
                      type="url"
                      value={applicantLinkedin}
                      onChange={(e) => setApplicantLinkedin(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                    Why are you excited about building at GALX AI? (Optional)
                  </label>
                  <textarea
                    rows={4}
                    value={applicantNote}
                    onChange={(e) => setApplicantNote(e.target.value)}
                    placeholder="Tell us about a challenging system or model latency problem you solved, or what you want to build here..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-8 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-500/20"
                  >
                    {loading ? (
                      <span>Submitting Application...</span>
                    ) : (
                      <>
                        <span>Submit Application</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-10 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white">Application Received!</h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    Thank you for applying for the <span className="text-cyan-300 font-semibold">{role.title}</span> position. Our engineering team reviews every submission and will reply to <span className="text-white font-mono">{applicantEmail}</span> within 24 hours.
                  </p>
                </div>
                <Link
                  href="/careers"
                  className="inline-block px-6 py-2.5 rounded-xl bg-white text-black font-bold text-xs font-mono hover:bg-zinc-200 transition-all"
                >
                  Explore Other Openings
                </Link>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Sticky Sidebar with Compensation & Role Overview */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/10 space-y-5 sticky top-24">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Position Overview
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5 backdrop-blur-md">
                <span className="text-[10px] text-zinc-500 uppercase">Offering &amp; Equity</span>
                <div className="text-white font-semibold text-xs">Early-Stage Package (Open)</div>
                <span className="text-[10px] text-zinc-400 block font-sans leading-relaxed">
                  Early-stage salary &amp; direct equity ownership tailored to candidate caliber and ownership appetite.
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase">Work Location</span>
                <div className="text-white font-bold text-xs font-sans">{role.location}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase">Application Review</span>
                <div className="text-cyan-400 font-bold text-xs font-sans">Reviewed in &lt;24 hours</div>
              </div>
            </div>

            <a
              href="#apply-form"
              className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 block text-center"
            >
              <span>Apply Directly</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
