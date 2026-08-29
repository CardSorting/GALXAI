'use client';

import React, { useState, useMemo } from 'react';
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
  Code2,
  ChevronRight,
  ChevronDown,
  X,
  Search,
  Flame,
  Check,
  Compass,
  Copy
} from 'lucide-react';
import { JOB_ROLES, JobRole } from '@/data/jobRoles';

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

const CANDIDATE_FAQS = [
  {
    q: 'How does remote work function across different time zones?',
    a: 'We operate on an asynchronous-first communication model using GitHub, Linear, Discord, and concise written RFCs. We minimize synchronous meetings so you have long uninterrupted blocks of deep focus time.',
  },
  {
    q: 'How are equity grants structured at GALX AI?',
    a: 'All full-time team members receive meaningful equity ownership with standard 4-year vesting, a 1-year cliff, early exercise options, and an extended 10-year post-termination exercise window.',
  },
  {
    q: 'Can I work as an international candidate outside the United States?',
    a: 'Yes! We hire globally through international Employer of Record (PEO/Deel) or direct international B2B agreements, with complete compensation and benefits parity.',
  },
  {
    q: 'What is your policy on open-source contributions and side projects?',
    a: 'We actively encourage open-source contributions and personal technical experiments. Many of our core primitives are open-sourced to benefit the wider AI builder ecosystem.',
  },
];

export function CareersClient() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedExperience, setSelectedExperience] = useState<string>('All');
  const [onlyImmediate, setOnlyImmediate] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const departments = ['All', 'Engineering', 'Research', 'Product', 'Security', 'DevRel'];
  const experiences = ['All', 'Staff', 'Lead', 'Senior', 'Mid'];

  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = { All: JOB_ROLES.length };
    JOB_ROLES.forEach((role) => {
      counts[role.department] = (counts[role.department] || 0) + 1;
    });
    return counts;
  }, []);

  const filteredRoles = useMemo(() => {
    return JOB_ROLES.filter((role) => {
      const matchesDept = selectedDepartment === 'All' || role.department === selectedDepartment;
      const matchesExp = selectedExperience === 'All' || role.experience === selectedExperience;
      const matchesUrgency = !onlyImmediate || role.urgency === 'Immediate';
      const matchesQuery =
        searchQuery.trim() === '' ||
        role.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesDept && matchesExp && matchesUrgency && matchesQuery;
    });
  }, [selectedDepartment, selectedExperience, onlyImmediate, searchQuery]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="space-y-20">
      {/* Top Urgent Recruiting Banner */}
      <section className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-zinc-900 to-indigo-950/60 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-cyan-950/30">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider">
                ACTIVELY HIRING {JOB_ROLES.length} FOUNDING ROLES
              </span>
              <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                24H Review SLA
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              We are scaling our core engineering fleet. Every technical application is reviewed by engineering leads in &lt;24 hours.
            </p>
          </div>
        </div>

        <a
          href="#open-roles"
          className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold font-mono flex items-center gap-1 transition-all shrink-0 cursor-pointer"
        >
          <span>View Openings ({JOB_ROLES.length})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </section>

      {/* Hero Header Section */}
      <section className="text-center space-y-6 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>JOIN OUR HIGH-DENSITY CORE TEAM</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Build the Substrate for the Next Epoch of Autonomous Intelligence
        </h1>

        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          At GALX AI, we are engineering the universal routing, caching, and reasoning layer that powers frontier AI for engineers, researchers, and creators worldwide.
        </p>

        {/* Action Jump Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#open-roles"
            className="px-6 py-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs font-mono flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <span>Explore Open Positions ({JOB_ROLES.length})</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Live Vitals & Company Metrics Strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 text-center space-y-1">
          <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">40+ Edge PoPs</div>
          <div className="text-xs text-zinc-400 font-semibold">Sub-15ms Anycast Network</div>
        </div>
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 text-center space-y-1">
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">100% Remote</div>
          <div className="text-xs text-zinc-400 font-semibold">Across Global Timezones</div>
        </div>
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 text-center space-y-1">
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">75% Cache Pass</div>
          <div className="text-xs text-zinc-400 font-semibold">Wholesale Caching Substrate</div>
        </div>
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 text-center space-y-1">
          <div className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">99.99% SOTA</div>
          <div className="text-xs text-zinc-400 font-semibold">Active-Active Uptime SLA</div>
        </div>
      </section>

      {/* Engineering Manifesto & Vision */}
      <section className="p-8 sm:p-12 rounded-3xl bg-zinc-900/40 border border-white/10 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 uppercase font-bold tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>A LETTER TO BUILDERS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Why Join GALX AI Right Now?</h2>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-4xl">
          <p>
            The intelligence landscape is undergoing a once-in-a-generation shift. Compute consumption is exploding exponentially, reasoning models like OpenAI Codex and GPT-5.6 are becoming the default engine for software creation, and developers require a zero-friction, zero-markup substrate to orchestrate autonomous agents.
          </p>
          <p>
            Large corporations slow top engineers down with endless middle management, multi-week PR reviews, and political silos. At GALX AI, we maintain a small, high-density team where every single person owns foundational infrastructure that handles billions of tokens daily.
          </p>
          <p className="text-cyan-300 font-semibold">
            If you want to operate with extreme agency, work directly on kernel-level networking, custom speculative decoding, and delightful UI craft, you belong here.
          </p>
        </div>
      </section>

      {/* Engineering Culture Values */}
      <section className="p-8 sm:p-12 rounded-3xl bg-zinc-900/40 border border-white/10 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">How We Build at GALX AI</h2>
          <p className="text-xs sm:text-sm text-zinc-400">Our team operates on high conviction, fast cycles, and technical depth.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-black/40 border border-white/5 space-y-3 hover:border-cyan-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Extreme Velocity &amp; Agency</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              We minimize bureaucracy. Engineers have full ownership from architectural spec to production deployment, shipping daily improvements directly to users.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-black/40 border border-white/5 space-y-3 hover:border-indigo-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Code2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">First-Principles Engineering</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              We do not accept default performance limits. Whether optimizing eBPF network packets or streaming markdown latency, we build at the bleeding edge.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-black/40 border border-white/5 space-y-3 hover:border-emerald-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Uncompromising Trust</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Our Zero Data Retention (ZDR) guarantee is sacred. We believe privacy and security are foundational human rights in the age of artificial intelligence.
            </p>
          </div>
        </div>
      </section>

      {/* Developer Terminal Code Quick-Challenge */}
      <section className="p-6 sm:p-8 rounded-3xl bg-[#090c17] border border-white/15 space-y-4 font-mono shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="text-xs text-zinc-400 ml-2">galx-cli — quick-apply</span>
          </div>
          <span className="text-[11px] text-cyan-400">Fast-Track Terminal</span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between bg-black/50 p-3 rounded-xl border border-white/5">
            <code className="text-zinc-300">
              <span className="text-pink-400">curl</span> -s https://galx.ai/api/v1/jobs | <span className="text-cyan-400">jq</span> .open_roles
            </code>
            <button
              onClick={() => copyToClipboard('curl -s https://galx.ai/api/v1/jobs | jq .open_roles')}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
            >
              {copiedCmd === 'curl -s https://galx.ai/api/v1/jobs | jq .open_roles' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between bg-black/50 p-3 rounded-xl border border-white/5">
            <code className="text-zinc-300">
              <span className="text-pink-400">npx</span> galx-cli apply --role=dist-systems-engineer --github=username
            </code>
            <button
              onClick={() => copyToClipboard('npx galx-cli apply --role=dist-systems-engineer --github=username')}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
            >
              {copiedCmd === 'npx galx-cli apply --role=dist-systems-engineer --github=username' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Open Roles Listing - Direct Navigation to Dedicated Pages */}
      <section id="open-roles" className="space-y-6 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 uppercase font-bold tracking-wider">
              <span>CURRENT OPENINGS ({JOB_ROLES.length})</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Open Positions</h2>
            <p className="text-sm text-zinc-400">Click any role to view detailed responsibilities, 90-day roadmap, and apply directly.</p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by role, stack (Rust, CUDA, PyTorch...)"
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900/60 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-cyan-400 font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills with Counts */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Department Pills */}
          <div className="flex flex-wrap gap-1.5">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedDepartment === dept
                    ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{dept}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  selectedDepartment === dept ? 'bg-black/20 text-black' : 'bg-white/10 text-zinc-400'
                }`}>
                  {departmentCounts[dept] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOnlyImmediate(!onlyImmediate)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                onlyImmediate
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Immediate Hires Only</span>
            </button>

            {/* Experience Filter */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <select
                value={selectedExperience}
                onChange={(e) => setSelectedExperience(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-zinc-200 text-xs focus:outline-none focus:border-cyan-400"
              >
                {experiences.map((exp) => (
                  <option key={exp} value={exp}>
                    {exp === 'All' ? 'All Seniority Levels' : `${exp} Level`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Roles List - Direct Links to Dedicated Pages */}
        <div className="space-y-4 pt-2">
          {filteredRoles.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-white/5 space-y-3">
              <Briefcase className="w-8 h-8 text-zinc-500 mx-auto" />
              <p className="text-sm text-zinc-400">No open roles matching your search criteria.</p>
              <button
                onClick={() => {
                  setSelectedDepartment('All');
                  setSelectedExperience('All');
                  setOnlyImmediate(false);
                  setSearchQuery('');
                }}
                className="text-xs text-cyan-400 hover:underline font-mono"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            filteredRoles.map((role) => (
              <Link
                key={role.id}
                href={`/careers/${role.id}`}
                className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 hover:border-cyan-500/40 hover:bg-zinc-900/70 transition-all block group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] font-mono font-bold">
                        {role.department}
                      </span>
                      {role.urgency === 'Immediate' && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-mono font-bold flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-rose-400" />
                          <span>High Priority</span>
                        </span>
                      )}
                      <span className="text-zinc-500 text-xs">•</span>
                      <span className="text-zinc-400 text-xs font-medium flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{role.location}</span>
                      </span>
                      <span className="text-zinc-500 text-xs">•</span>
                      <span className="text-zinc-400 text-xs font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{role.experienceLabel}</span>
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {role.title}
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mt-1">
                        {role.description}
                      </p>
                    </div>

                    {/* Tech Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {role.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-zinc-400 text-[10px] font-mono"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono pt-1">
                      <span className="px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-zinc-300 backdrop-blur-md">
                        Early-Stage Compensation &amp; Equity (Open)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                    <span className="px-4 py-2.5 rounded-xl bg-white/5 group-hover:bg-cyan-400 text-zinc-300 group-hover:text-black font-semibold text-xs transition-all flex items-center gap-1.5">
                      <span>View Role Page &amp; Apply</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Hiring Process Roadmap */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 uppercase font-bold tracking-wider">
            <span>TRANSPARENT PROCESS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Our 4-Step Hiring Process</h2>
          <p className="text-xs sm:text-sm text-zinc-400">Respectful of your time, technical, and decided within days.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HIRING_STAGES.map((stage, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3 relative">
              <div className="text-3xl font-mono font-black text-cyan-400/40">{stage.step}</div>
              <div>
                <h3 className="text-sm font-bold text-white">{stage.title}</h3>
                <span className="text-[11px] font-mono text-cyan-400">{stage.duration}</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{stage.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Candidate FAQs Accordion */}
      <section className="space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 uppercase font-bold tracking-wider">
            <span>FREQUENTLY ASKED QUESTIONS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Candidate FAQs</h2>
          <p className="text-sm text-zinc-400">Everything you might want to know before applying.</p>
        </div>

        <div className="space-y-3">
          {CANDIDATE_FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-zinc-900/40 border border-white/10 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-sm font-bold text-white">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${
                      isOpen ? 'rotate-180 text-cyan-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-zinc-400 leading-relaxed border-t border-white/5 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
