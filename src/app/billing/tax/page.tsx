'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { BillingSubNav } from '@/components/dashboard/BillingSubNav';
import {
  FileSpreadsheet,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Download,
  Upload,
  Check,
  Globe,
  Lock,
  Mail,
  FileCheck2
} from 'lucide-react';

export default function CorporateTaxPage() {
  const [taxId, setTaxId] = useState('US-EIN 94-8271034');
  const [taxExemptStatus, setTaxExemptStatus] = useState<'standard' | 'exempt'>('standard');
  const [billingEmails, setBillingEmails] = useState('billing@acme.ai, ap-finance@acme.ai');
  const [vatCountry, setVatCountry] = useState('US');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Billing', href: '/billing' },
            { label: 'Financial Ledger', href: '/billing' },
            { label: 'Tax & VAT Exemption' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Corporate Tax Identification & VAT Exemption</h1>
            <p className="text-xs text-zinc-400">
              Manage international VAT reverse charges, W-9 certifications, and automated accounting recipient routing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>TAX COMPLIANT</span>
            </span>
          </div>
        </div>

        <BillingSubNav />

        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Tax profile and invoicing preferences saved successfully!</span>
          </div>
        )}

        {/* Main Tax Information Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                Tax ID & Regional Jurisdiction
              </h2>
              <p className="text-xs text-zinc-400">This information appears directly on your official monthly tax statements.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 uppercase text-[10px]">Tax Country / Region</label>
                <select
                  value={vatCountry}
                  onChange={(e) => setVatCountry(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="US">United States (EIN / SSN)</option>
                  <option value="GB">United Kingdom (UK VAT)</option>
                  <option value="DE">Germany / EU (VIES VAT Reverse Charge)</option>
                  <option value="CA">Canada (GST / HST)</option>
                  <option value="AU">Australia (ABN)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 uppercase text-[10px]">Corporate Tax / VAT ID</label>
                <input
                  type="text"
                  required
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-zinc-400 uppercase text-[10px]">Invoice Recipient Dispatch List (Comma Separated)</label>
                <input
                  type="text"
                  required
                  value={billingEmails}
                  onChange={(e) => setBillingEmails(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                />
                <span className="text-[11px] text-zinc-500 font-sans block">
                  All PDF invoices and payment receipts are automatically emailed to these addresses upon monthly generation.
                </span>
              </div>
            </div>
          </div>

          {/* Tax Forms & Exemption Box */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-amber-400" />
              Tax Forms & Form W-9
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-white font-bold font-sans">GALXAI Official W-9 Form</div>
                  <div className="text-zinc-500 text-[11px]">Updated Tax Year 2026</div>
                </div>
                <button
                  type="button"
                  onClick={() => alert('Downloading official GALXAI Form W-9 (PDF)...')}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer font-sans font-semibold border border-white/5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download W-9</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-white font-bold font-sans">Submit Tax-Exempt Certificate</div>
                  <div className="text-zinc-500 text-[11px]">501(c)(3) or Educational</div>
                </div>
                <button
                  type="button"
                  onClick={() => alert('Upload prompt ready for Tax-Exempt Certificate')}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer font-sans font-semibold border border-white/5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Certificate</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="px-8 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider font-mono shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                Save Tax Profile
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
