'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
  Flame,
  CreditCard,
  FileCheck2,
  DollarSign,
  FileText,
  Sliders,
  Sparkles,
  PhoneCall,
  Clock,
  Lock,
  Headphones,
  Users2
} from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { SEAT_TIERS } from '@/lib/data/pricingData';

export function EnterpriseSolutionClient() {
  const [monthlySpendTarget, setMonthlySpendTarget] = useState(10000);
  const [companyName, setCompanyName] = useState('Acme AI Corporation');
  const [workEmail, setWorkEmail] = useState('engineering-lead@acme.ai');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const discountPct = monthlySpendTarget >= 25000 ? 40 : monthlySpendTarget >= 10000 ? 35 : monthlySpendTarget >= 5000 ? 30 : 25;
  const retailEquivalent = monthlySpendTarget / (1 - discountPct / 100);
  const monthlySavings = retailEquivalent - monthlySpendTarget;
  const annualSavings = monthlySavings * 12;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 5000);
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-12">
        <Breadcrumbs
          items={[
            { label: 'Solutions & Fleets', href: '/solutions', icon: Building2 },
            { label: 'Enterprise Fleet Infrastructure', icon: Building2, badge: 'Unlimited Seats', badgeColor: 'bg-cyan-500/20 text-cyan-300' }
          ]}
        />

        {/* Hero Section */}
        <section className="glass-panel rounded-3xl p-6 sm:p-12 relative overflow-hidden text-center space-y-6">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/15 via-blue-500/10 to-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>UNLIMITED POOLED SEATS • SAML SSO &amp; SCIM • NET-30 INVOICING • 99.99% SLA</span>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Sovereign AI Compute Infrastructure for Enterprise Fleets
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl mx-auto">
              Consolidate high-volume AI inference across thousands of engineers and agent swarms. Scale with custom Net-30 invoice terms, SAML 2.0 Single Sign-On, signed HIPAA BAAs, and dedicated private VPC peering.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 font-mono">
            <a
              href="#enterprise-form"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-500 hover:from-cyan-300 hover:to-blue-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <PhoneCall className="w-4 h-4 text-black" />
              <span>Schedule Architecture Review</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </a>

            <Link
              href="/teams/sso"
              className="px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>Inspect SAML SSO Specs</span>
            </Link>
          </div>
        </section>

        {/* Enterprise Value Props */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-cyan-500/30 bg-cyan-500/5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-400/20 text-cyan-400 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Up to 40% Wholesale Volume Discount</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Consolidate your entire organization&apos;s OpenAI spend to unlock the highest wholesale clearinghouse margins in the industry.
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-amber-500/30 bg-amber-500/5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Invoicing &amp; Net-30 / Net-60 Terms</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Eliminate credit card limits. Receive monthly consolidated invoices with ACH / Wire payment support and custom Purchase Order (PO) routing.
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-emerald-500/30 bg-emerald-500/5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-400/20 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Enterprise BAA, DPA &amp; SOC 2 Type II</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Signed Business Associate Agreements (HIPAA), custom Data Processing Addendums (GDPR/CCPA), and zero data retention guarantees.
            </p>
          </div>
        </section>

        {/* Enterprise Commitment & Savings Calculator */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10 font-mono text-xs">
          <div className="space-y-1 font-sans">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              Enterprise Volume Commitments &amp; Savings Calculator
            </h2>
            <p className="text-xs text-zinc-400">
              Select your projected monthly AI inference spend to see your exact discount tier and net annual savings.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400 font-sans">Monthly AI Compute Commitment:</span>
              <span className="text-2xl font-black text-cyan-300">${monthlySpendTarget.toLocaleString()} / mo</span>
            </div>

            <input
              type="range"
              min="2000"
              max="50000"
              step="1000"
              value={monthlySpendTarget}
              onChange={(e) => setMonthlySpendTarget(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-zinc-800 rounded-lg appearance-none"
            />

            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>$2,000 / mo</span>
              <span>$10,000 / mo</span>
              <span>$25,000 / mo</span>
              <span>$50,000+ / mo</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-400 text-[10px] uppercase font-bold">Wholesale Discount</span>
              <div className="text-2xl font-black text-emerald-400">-{discountPct}% OFF</div>
              <div className="text-[11px] text-zinc-400 font-sans">Guaranteed wholesale rate</div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-400 text-[10px] uppercase font-bold">Direct Retail Equivalent</span>
              <div className="text-2xl font-black text-zinc-400">${Math.round(retailEquivalent).toLocaleString()} / mo</div>
              <div className="text-[11px] text-zinc-400 font-sans">OpenAI standard pricing</div>
            </div>

            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
              <span className="text-cyan-400 text-[10px] uppercase font-bold">Annual Margin Retained</span>
              <div className="text-2xl font-black text-cyan-300">${Math.round(annualSavings).toLocaleString()} USD</div>
              <div className="text-[11px] text-cyan-400 font-sans font-semibold">Direct cash savings</div>
            </div>
          </div>
        </section>

        {/* Enterprise Invoicing Form */}
        <section id="enterprise-form" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="space-y-1 font-sans">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              Request Custom Enterprise Terms &amp; Invoicing Agreement
            </h2>
            <p className="text-xs text-zinc-400">
              Submit your company requirements to provision an enterprise gateway contract with custom Net-30 payment terms and SLA.
            </p>
          </div>

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Inquiry submitted successfully! An enterprise solutions architect will respond within 2 business hours.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px]">Company / Organization Name</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full py-3 px-4 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px]">Work Email Address</label>
              <input
                type="email"
                required
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                className="w-full py-3 px-4 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px]">Preferred Payment Terms</label>
              <select className="w-full py-3 px-4 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500 cursor-pointer">
                <option>Net-30 Monthly Invoice (Wire / ACH)</option>
                <option>Net-60 Quarterly Invoice (Wire / ACH)</option>
                <option>Annual Prepaid Contract (+5% Credit Bonus)</option>
                <option>Corporate Credit Card Autopay</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px]">Compliance &amp; Custom Governance</label>
              <select className="w-full py-3 px-4 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500 cursor-pointer">
                <option>Standard Enterprise Agreement</option>
                <option>Custom HIPAA BAA Signed</option>
                <option>Zero Data Retention (ZDR) Enforced DPA</option>
                <option>Dedicated Private VPC Peering &amp; SLA</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-500 hover:from-cyan-300 hover:to-blue-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Submitting Inquiry...</span>
                ) : (
                  <>
                    <PhoneCall className="w-4 h-4 text-black" />
                    <span>Submit Enterprise Request</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
