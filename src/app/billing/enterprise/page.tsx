'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { BillingSubNav } from '@/components/dashboard/BillingSubNav';
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
  Headphones
} from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';

export default function EnterpriseBillingPage() {
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
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Billing', href: '/billing' },
            { label: 'Enterprise Contracts' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Enterprise Wholesale Contracts &amp; Volume Terms</h1>
            <p className="text-xs text-zinc-400">
              High-volume commitment pricing, custom invoicing terms (Net-30 / ACH / Wire), and dedicated high-availability support.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>CUSTOM ENTERPRISE AGREEMENTS</span>
            </span>
          </div>
        </div>

        <BillingSubNav />

        <AuthRequiredGate
          title="Sign In to Access Enterprise Contracts"
          description="High-volume commit pricing calculators, custom Net-30 invoicing, and dedicated SLA contracts are private to your workspace."
          checkoutAmount={250}
        >
          {/* Enterprise Value Props Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-amber-500/30 bg-amber-500/5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Up to 40% Wholesale Volume Discount</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Consolidate your entire engineering organization's OpenAI and Grok spend to unlock the highest wholesale margins in the industry.
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-cyan-500/30 bg-cyan-500/5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Invoicing & Net-30 / Net-60 Wire Terms</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Eliminate company credit card limits. Receive unified monthly consolidated invoices with wire/ACH payments and custom PO codes.
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-emerald-500/30 bg-emerald-500/5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Enterprise BAA, DPA &amp; SOC 2 Security</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Signed Business Associate Agreements (HIPAA), custom Data Processing Addendums (GDPR/CCPA), and zero data retention guarantees.
            </p>
          </div>
        </div>

        {/* Interactive Volume Commitments & ROI Calculator */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              Enterprise Volume Commitments & Savings Calculator
            </h2>
            <p className="text-xs text-zinc-400">
              Select your organization's projected monthly AI inference spend to see your exact discount tier and net annual savings.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between font-mono text-sm">
              <span className="text-zinc-400">Monthly AI Compute Commitment:</span>
              <span className="text-2xl font-black text-amber-400">${monthlySpendTarget.toLocaleString()} / mo</span>
            </div>

            <input
              type="range"
              min="2000"
              max="50000"
              step="1000"
              value={monthlySpendTarget}
              onChange={(e) => setMonthlySpendTarget(Number(e.target.value))}
              className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />

            <div className="flex justify-between text-[11px] font-mono text-zinc-500">
              <span>$2,000/mo (Starter)</span>
              <span>$10,000/mo (Scale)</span>
              <span>$25,000/mo (Enterprise Tier)</span>
              <span>$50,000+/mo (Frontier Fleet)</span>
            </div>
          </div>

          {/* Calculator Output KPI Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 font-mono">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase">Effective Wholesale Discount</span>
              <div className="text-2xl font-black text-emerald-400">-{discountPct}% OFF</div>
              <div className="text-[11px] text-zinc-400 font-sans">Guaranteed wholesale rate</div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase">Direct Retail Equivalent</span>
              <div className="text-2xl font-black text-zinc-400">${Math.round(retailEquivalent).toLocaleString()} / mo</div>
              <div className="text-[11px] text-zinc-500 font-sans">OpenAI & Grok standard pricing</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
              <span className="text-emerald-400 text-[10px] uppercase font-bold">Annual Cash Saved</span>
              <div className="text-2xl font-black text-emerald-300">${Math.round(annualSavings).toLocaleString()} USD</div>
              <div className="text-[11px] text-emerald-400 font-sans font-semibold">Direct margin retained</div>
            </div>
          </div>
        </div>

        {/* Enterprise Invoicing Request Form */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              Request Enterprise Terms & Invoicing Contract
            </h2>
            <p className="text-xs text-zinc-400">
              Submit your company requirements to provision an enterprise gateway contract with custom Net-30 payment terms.
            </p>
          </div>

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Enterprise inquiry submitted! An enterprise solutions engineer will respond within 2 business hours.</span>
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
                className="w-full py-3 px-4 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px]">Work Email Address</label>
              <input
                type="email"
                required
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                className="w-full py-3 px-4 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px]">Preferred Payment Terms</label>
              <select className="w-full py-3 px-4 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-500">
                <option>Net-30 Monthly Invoice (Wire / ACH)</option>
                <option>Net-60 Quarterly Invoice (Wire / ACH)</option>
                <option>Annual Prepaid Contract (+Additional 5% Credit Bonus)</option>
                <option>Corporate Credit Card (Automated Autopay)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px]">Custom Requirements</label>
              <select className="w-full py-3 px-4 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-500">
                <option>Standard Enterprise Contract</option>
                <option>Custom BAA (HIPAA Compliance)</option>
                <option>Zero-Retention Certified DPA (GDPR/CCPA)</option>
                <option>Custom Multi-Tenant Team Sub-Accounts</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Submitting Inquiry...</span>
                ) : (
                  <>
                    <PhoneCall className="w-4 h-4 text-black" />
                    <span>Request Enterprise Terms</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        </AuthRequiredGate>
      </main>
    </div>
  );
}
