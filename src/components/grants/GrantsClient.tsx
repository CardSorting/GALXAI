'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import {
  Flame,
  Award,
  Zap,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Coins,
  Clock,
  Check,
} from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { ShareButton } from '@/components/common/ShareButton';

export interface GrantTier {
  id: string;
  name: string;
  badge: string;
  grantAmount: string;
  description: string;
  eligibility: string[];
  benefits: string[];
  ctaLabel: string;
  isPopular?: boolean;
}

export const GRANT_TIERS: GrantTier[] = [
  {
    id: 'builder',
    name: 'Indie Builder & Open Source',
    badge: 'Instant Activation',
    grantAmount: '$100 Compute Match',
    description: 'Designed for individual developers, AI researchers, hackathon builders, and open source maintainers.',
    eligibility: [
      'Active GitHub repository or public project',
      'Developing AI applications, agents, or tools',
      'No venture backing required',
    ],
    benefits: [
      'Instant $5 Free Developer Key on generation',
      '50% Compute Match on all deposits up to $100',
      '25%–40% base wholesale token pricing',
      '75% automatic prompt caching rebate',
    ],
    ctaLabel: 'Claim $5 Builder Key',
  },
  {
    id: 'scale',
    name: 'YC & VC-Backed Scale Grant',
    badge: 'Most Popular',
    grantAmount: 'Up to $2,500 Match',
    description: 'For venture-backed startups (Seed, Series A) or high-growth teams scaling LLM request volumes.',
    isPopular: true,
    eligibility: [
      'Funded by YC, Techstars, 500 Global, or leading angels/VCs',
      'Estimated or active spend > $500 / month',
      'Production agent fleets or high-concurrency apps',
    ],
    benefits: [
      '50% Matching Grant on deposits up to $2,500',
      'Priority Sub-15ms Anycast Failover Shards',
      'Dedicated private Slack/Discord channel with core routing engineers',
      'Custom rate limit elevation (up to 1,200 RPM)',
    ],
    ctaLabel: 'Apply for $2.5K Scale Grant',
  },
  {
    id: 'enterprise',
    name: 'Enterprise Migration Fund',
    badge: 'Custom Contract',
    grantAmount: 'Zero-Margin 30-Day Pilot',
    description: 'For enterprise engineering departments migrating existing OpenAI or Anthropic workloads.',
    eligibility: [
      'Current AI spend exceeding $5,000 / month',
      'Requires enterprise security, SOC 2, or HIPAA compliance',
      'Multi-tenant team management needs',
    ],
    benefits: [
      'Zero-Margin 30-day trial with 100% cost difference guarantee',
      'Signed SOC 2 Type II & HIPAA Business Associate Agreement (BAA)',
      'Consolidated monthly Net-30 invoicing with PDF breakdown',
      'Dedicated Technical Account Manager & SLA guarantee',
    ],
    ctaLabel: 'Request Enterprise Migration',
  },
];

export function GrantsClient() {
  const [selectedGrant, setSelectedGrant] = useState<string>('scale');
  const [calculatorSpend, setCalculatorSpend] = useState<number>(1000);
  const [copiedGrantText, setCopiedGrantText] = useState(false);

  const calculatedMatchDollars = Math.min(2500, Math.round(calculatorSpend * 0.5));
  const totalUsableCompute = calculatorSpend + calculatedMatchDollars;
  const estimatedAnnualSavings = Math.round(calculatorSpend * 0.35 * 12);

  const handleCopySummary = async () => {
    const summary = `GALXAI Builder & Scale Acceleration Grant Proposal
-----------------------------------------------------------
Requested Monthly Compute Budget: $${calculatorSpend.toLocaleString()} USD
Instant 50% Compute Match Bonus: +$${calculatedMatchDollars.toLocaleString()} Free Credits
Total Usable Balance: $${totalUsableCompute.toLocaleString()} USD
Projected Net Annual Token Savings: $${estimatedAnnualSavings.toLocaleString()} USD / yr (-35% Wholesale Margin)
Prompt Caching Pass-Through: 75% Automated Rebate
SLA: Multi-Region Sub-15ms Anycast Failover
Claim Grant: https://galx.ai/grants`;

    await safeCopyToClipboard(summary);
    setCopiedGrantText(true);
    setTimeout(() => setCopiedGrantText(false), 2000);
  };

  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantCompany, setApplicantCompany] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [grantApplied, setGrantApplied] = useState(false);

  const handleApplyGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantEmail || isApplying) return;
    setIsApplying(true);
    try {
      await fetch('/api/inbound/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: applicantEmail,
          companyName: applicantCompany || 'Startup Applicant',
          source: 'grants',
          estimatedMonthlySpend: calculatorSpend,
          notes: `Grant Application: ${selectedGrant.toUpperCase()} Tier. Target monthly spend: $${calculatorSpend}. Requested match: +$${calculatedMatchDollars}.`,
        }),
      });
      setGrantApplied(true);
    } catch {
      // fallback
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-12">
        <Breadcrumbs
          items={[
            { label: 'Pricing & Trust', href: '/pricing' },
            { label: 'Builder & Scale Acceleration Grants' },
          ]}
        />

        {/* Hero Section */}
        <div className="glass-panel rounded-3xl p-6 sm:p-12 relative overflow-hidden space-y-6 border border-amber-500/30 text-center shadow-2xl">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-amber-500/20 via-orange-500/15 to-indigo-600/20 rounded-full blur-[130px] pointer-events-none" />

          {/* Grant Fund Allocation Status */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-xs font-mono font-bold text-amber-300 shadow-lg">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>Q3 BUILDER ACCELERATION FUND • $84,250 / $100,000 ALLOCATED</span>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Fuel Your AI Pipeline with Up to <span className="text-amber-300 font-black">$2,500 in Matching Compute</span>
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl mx-auto">
              We empower high-velocity builders, funded startups, and enterprise teams to scale frontier AI models at true wholesale pricing. Every dollar deposited is matched up to 50% in instant inference credits.
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/keys"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/25 flex items-center gap-2 hover:scale-[1.02] transition-all cursor-pointer font-mono"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Claim $5 Key + 50% Match Grant</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>

            <ShareButton
              variant="pill"
              label="Share Grant Fund"
              title="GALXAI $100,000 Builder & Scale Acceleration Fund"
              description="Apply for up to $2,500 in 50% matched compute credits with 25%–40% wholesale token pricing."
            />
          </div>

          {/* Value Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 max-w-3xl mx-auto border-t border-white/10 font-mono text-xs">
            <div className="space-y-0.5">
              <span className="text-zinc-500 text-[10px] uppercase">Instant Key Credit</span>
              <div className="text-white font-bold text-sm">$5.00 Free Starter</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-zinc-500 text-[10px] uppercase">Matching Multiplier</span>
              <div className="text-amber-300 font-bold text-sm">50% Instant Match</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-zinc-500 text-[10px] uppercase">Base Token Discount</span>
              <div className="text-emerald-400 font-bold text-sm">25%–40% Wholesale</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-zinc-500 text-[10px] uppercase">Prompt Caching</span>
              <div className="text-cyan-400 font-bold text-sm">75% Automatic Pass</div>
            </div>
          </div>
        </div>

        {/* 3 Grant Programs Grid */}
        <div className="space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-white">Select Your Acceleration Track</h2>
            <p className="text-xs text-zinc-400">Self-serve grant qualification with instant credit activation upon deposit.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {GRANT_TIERS.map((tier) => {
              const isSelected = selectedGrant === tier.id;
              return (
                <div
                  key={tier.id}
                  onClick={() => setSelectedGrant(tier.id)}
                  className={`glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-amber-500/80 bg-amber-500/10 shadow-xl shadow-amber-500/15 scale-[1.02]'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-300 font-mono uppercase">{tier.name}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isSelected ? 'bg-amber-400 text-amber-950 font-bold' : 'bg-white/10 text-white/80'
                      }`}>
                        {tier.badge}
                      </span>
                    </div>

                    <div>
                      <div className="text-2xl font-black text-white font-mono">{tier.grantAmount}</div>
                      <p className="text-xs text-zinc-400 leading-relaxed mt-1">{tier.description}</p>
                    </div>

                    {/* Eligibility List */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <span className="text-[10px] font-mono font-bold uppercase text-zinc-500 block">Eligibility:</span>
                      <ul className="space-y-1.5 text-xs text-zinc-300">
                        {tier.eligibility.map((e, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                            <span className="leading-tight">{e}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Key Benefits */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <span className="text-[10px] font-mono font-bold uppercase text-zinc-500 block">Included Perks:</span>
                      <ul className="space-y-1.5 text-xs text-zinc-200">
                        {tier.benefits.map((b, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0 mt-0.5" />
                            <span className="leading-tight">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <Link
                    href={tier.id === 'enterprise' ? '/billing/enterprise' : '/keys'}
                    className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 font-mono transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-lg shadow-amber-500/20'
                        : 'bg-white/10 hover:bg-white/15 text-white'
                    }`}
                  >
                    <span>{tier.ctaLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Grant Match & ROI Calculator */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6 border border-amber-500/25 bg-gradient-to-b from-[#0e111d] to-[#07080d]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                <Coins className="w-3 h-3 text-amber-400" />
                <span>INTERACTIVE GRANT MATCH SIMULATOR</span>
              </div>
              <h2 className="text-xl font-bold text-white">Calculate Your Matched Compute Balance</h2>
              <p className="text-xs text-zinc-400">See the exact free compute credits added to your wallet upon initial deposit.</p>
            </div>

            <button
              onClick={handleCopySummary}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 border border-white/10 transition-all self-start sm:self-auto cursor-pointer"
            >
              {copiedGrantText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Award className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copiedGrantText ? 'Proposal Copied!' : 'Copy Grant Proposal'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
            <div className="lg:col-span-7 space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">Target Monthly Compute Spend:</span>
                  <span className="text-amber-300 font-bold text-sm bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                    ${calculatorSpend.toLocaleString()} USD
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="5000"
                  step="50"
                  value={calculatorSpend}
                  onChange={(e) => setCalculatorSpend(Number(e.target.value))}
                  aria-label="Target Monthly Compute Spend"
                  className="w-full accent-amber-400 cursor-pointer h-2 bg-zinc-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>$50 ($25 Match)</span>
                  <span>$500 ($250 Match)</span>
                  <span>$2,500 ($1,250 Match)</span>
                  <span>$5,000 ($2,500 Max Match)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase">You Deposit:</span>
                  <div className="text-lg font-bold text-white">${calculatorSpend.toLocaleString()}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold">GALXAI Grant Match (50%):</span>
                  <div className="text-lg font-bold text-emerald-300">+${calculatedMatchDollars.toLocaleString()} Free</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-4 shadow-xl">
              <div className="space-y-1">
                <span className="text-[10px] text-amber-400 uppercase font-mono font-bold">Total Usable Compute Balance</span>
                <div className="text-3xl font-black text-white font-mono">
                  ${totalUsableCompute.toLocaleString()} <span className="text-xs text-amber-300 font-normal">USD</span>
                </div>
                <p className="text-xs text-zinc-300 pt-1">
                  Plus projected annual token savings of <strong className="text-emerald-300 font-bold">+${estimatedAnnualSavings.toLocaleString()}/yr</strong> from wholesale rate arbitrage.
                </p>
              </div>

              {grantApplied ? (
                <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
                  <div className="font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Grant Application Received!</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 pt-1 font-sans">
                    Our solutions team will provision your +${calculatedMatchDollars} grant credit key shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleApplyGrant} className="space-y-2">
                  <input
                    type="email"
                    required
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                    placeholder="founder@startup.com"
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white placeholder:text-zinc-500 text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={applicantCompany}
                    onChange={(e) => setApplicantCompany(e.target.value)}
                    placeholder="Company or GitHub Org (optional)"
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white placeholder:text-zinc-500 text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isApplying}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 font-mono cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4 fill-black" />
                    <span>{isApplying ? 'Applying...' : `Apply for $${calculatedMatchDollars} Match →`}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Risk-Free Guarantee & FAQ Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-3 border border-emerald-500/30">
            <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm font-mono">
              <ShieldCheck className="w-5 h-5" />
              <span>100% Risk-Free 30-Day Guarantee</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              If your engineering team does not achieve at least a 25% net cost reduction compared to upstream retail within your first 30 days of production routing, we will refund 100% of the difference directly back to your compute wallet.
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-3 border border-cyan-500/30">
            <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-sm font-mono">
              <Clock className="w-5 h-5" />
              <span>Zero Lock-In 30-Second Quickstart</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              GALXAI uses the exact same request/response schema as the official OpenAI SDK and Cursor IDE. You never need to write proprietary wrapper code or sign long-term annual minimum lock-in contracts.
            </p>
          </div>
        </div>
      </main>

      {/* Floating Conversion Dock */}
      <FloatingConversionDock />
    </div>
  );
}
