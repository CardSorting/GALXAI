'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { BillingSubNav } from '@/components/dashboard/BillingSubNav';
import {
  FileSpreadsheet,
  Building,
  CheckCircle2,
  Eye,
  Download,
  Check,
  Search,
  ExternalLink
} from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';

interface Invoice {
  id: string;
  invoiceNumber: string;
  period: string;
  issuedDate: string;
  amount: number;
  wholesaleSaved: number;
  tokensCount: number;
  status: 'paid' | 'open';
  paymentMethod: string;
}

const INVOICES: Invoice[] = [
  {
    id: 'INV-2026-0801',
    invoiceNumber: 'INV-2026-0801',
    period: 'Aug 1, 2026 – Aug 31, 2026',
    issuedDate: 'Aug 22, 2026',
    amount: 110.00,
    wholesaleSaved: 38.40,
    tokensCount: 44200000,
    status: 'paid',
    paymentMethod: 'Visa •••• 4242'
  },
  {
    id: 'INV-2026-0701',
    invoiceNumber: 'INV-2026-0701',
    period: 'Jul 1, 2026 – Jul 31, 2026',
    issuedDate: 'Jul 31, 2026',
    amount: 250.00,
    wholesaleSaved: 83.33,
    tokensCount: 96000000,
    status: 'paid',
    paymentMethod: 'Visa •••• 4242'
  },
  {
    id: 'INV-2026-0601',
    invoiceNumber: 'INV-2026-0601',
    period: 'Jun 1, 2026 – Jun 30, 2026',
    issuedDate: 'Jun 30, 2026',
    amount: 100.00,
    wholesaleSaved: 31.60,
    tokensCount: 44000000,
    status: 'paid',
    paymentMethod: 'Visa •••• 4242'
  }
];

export default function InvoicesPage() {
  const [companyName, setCompanyName] = useState('Acme AI Corporation');
  const [billingEmail, setBillingEmail] = useState('billing@acme.ai');
  const [taxId, setTaxId] = useState('US-EIN 94-8271034');
  const [billingAddress, setBillingAddress] = useState('100 Montgomery St, Suite 400, San Francisco, CA 94104');
  const [poNumber, setPoNumber] = useState('PO-2026-ENG-08');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCsv, setCopiedCsv] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const handleOpenPortal = async () => {
    setIsOpeningPortal(true);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href })
      });
      const data = await res.json().catch(() => ({}));
      if (data?.success && data.url) {
        window.location.href = data.url;
      }
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingProfile(false);
    setProfileSavedMsg(true);
    setTimeout(() => setProfileSavedMsg(false), 3000);
  };

  const handleExportCsv = () => {
    const csvRows = [
      ['Invoice Number', 'Period', 'Issued Date', 'Tokens Invoiced', 'Wholesale Saved USD', 'Amount USD', 'Status', 'Payment Method'].join(','),
      ...INVOICES.map(i => [
        i.invoiceNumber,
        `"${i.period}"`,
        `"${i.issuedDate}"`,
        i.tokensCount,
        i.wholesaleSaved,
        i.amount,
        i.status,
        `"${i.paymentMethod}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `galxai_invoices_report_${Date.now()}.csv`;
    a.click();
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  const filteredInvoices = INVOICES.filter(i =>
    i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.period.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalInvoiced = INVOICES.reduce((acc, i) => acc + i.amount, 0);
  const totalSaved = INVOICES.reduce((acc, i) => acc + i.wholesaleSaved, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Billing', href: '/billing' },
            { label: 'Business Invoices' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Business Tax Invoices &amp; Statements</h1>
            <p className="text-xs text-zinc-400">
              Download and print official monthly tax receipts for corporate accounting and tax reporting.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenPortal}
              disabled={isOpeningPortal}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-mono font-bold flex items-center gap-2 border border-white/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isOpeningPortal ? 'Connecting...' : 'Stripe Receipts &amp; Portal'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-mono font-bold flex items-center gap-2 border border-white/10 transition-all cursor-pointer"
            >
              {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
              <span>{copiedCsv ? 'Exported Invoices!' : 'Export All Invoices (.CSV)'}</span>
            </button>
          </div>
        </div>

        <BillingSubNav />

        <AuthRequiredGate
          title="Sign In to View Corporate Invoices"
          description="Official tax receipts, monthly statements, and payment methods are private to your authenticated workspace."
          checkoutAmount={50}
        >
          {/* Financial KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-white/10">
            <span className="text-[11px] text-zinc-400 uppercase font-sans font-semibold">2026 YTD Invoiced</span>
            <div className="text-2xl font-black text-white">${totalInvoiced.toFixed(2)} USD</div>
            <div className="text-[11px] text-zinc-500 font-sans">{INVOICES.length} official tax statements</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-emerald-500/30 bg-emerald-500/5">
            <span className="text-[11px] text-emerald-400 uppercase font-sans font-semibold">Wholesale Discount Savings</span>
            <div className="text-2xl font-black text-emerald-300">-${totalSaved.toFixed(2)} USD</div>
            <div className="text-[11px] text-emerald-400/80 font-sans">33.3% net savings passed to business</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-cyan-500/30 bg-cyan-500/5">
            <span className="text-[11px] text-cyan-400 uppercase font-sans font-semibold">Active Corporate Entity</span>
            <div className="text-base font-bold text-white truncate font-sans">{companyName}</div>
            <div className="text-[11px] text-zinc-400 truncate">{taxId}</div>
          </div>
        </div>

        {/* Invoicing Profile Card */}
        <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-cyan-400" />
                Company Invoicing Profile & Tax Details
              </h3>
              <p className="text-xs text-zinc-400">These details appear automatically on all monthly tax statements and receipts.</p>
            </div>

            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer"
            >
              {isEditingProfile ? 'Close Editor' : 'Edit Company Info'}
            </button>
          </div>

          {profileSavedMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Company billing details saved successfully!</span>
            </div>
          )}

          {isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase text-[10px]">Legal Entity Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase text-[10px]">Accounts Payable Email</label>
                  <input
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase text-[10px]">Tax ID / VAT Number</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase text-[10px]">Purchase Order Number</label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-zinc-400 uppercase text-[10px]">Billing Street Address</label>
                  <input
                    type="text"
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs font-mono hover:bg-amber-300 transition-all cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono bg-black/30 p-4 rounded-2xl border border-white/5">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase">Entity:</span>
                <div className="font-bold text-white font-sans">{companyName}</div>
                <div className="text-zinc-400 text-[11px]">{billingAddress}</div>
              </div>

              <div>
                <span className="text-zinc-500 text-[10px] uppercase">Invoicing Email:</span>
                <div className="text-cyan-300 font-mono">{billingEmail}</div>
              </div>

              <div>
                <span className="text-zinc-500 text-[10px] uppercase">Tax / PO:</span>
                <div className="text-zinc-300">Tax ID: {taxId}</div>
                <div className="text-zinc-400 text-[11px]">PO: {poNumber}</div>
              </div>
            </div>
          )}
        </div>

        {/* Invoices Table */}
        <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 overflow-x-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              Tax Statements Archive
            </h3>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 pl-9 pr-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4 font-sans">Invoice #</th>
                <th className="py-3 px-4 font-sans">Period</th>
                <th className="py-3 px-4 font-sans">Issued Date</th>
                <th className="py-3 px-4 font-sans">Tokens</th>
                <th className="py-3 px-4 font-sans">Wholesale Savings</th>
                <th className="py-3 px-4 font-sans">Amount</th>
                <th className="py-3 px-4 font-sans">Status</th>
                <th className="py-3 px-4 text-right font-sans">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">
                    {inv.invoiceNumber}
                  </td>

                  <td className="py-3.5 px-4 text-zinc-300 font-sans">
                    {inv.period}
                  </td>

                  <td className="py-3.5 px-4 text-zinc-400">
                    {inv.issuedDate}
                  </td>

                  <td className="py-3.5 px-4 text-cyan-300">
                    {(inv.tokensCount / 1000000).toFixed(1)}M
                  </td>

                  <td className="py-3.5 px-4 text-emerald-400 font-bold">
                    -${inv.wholesaleSaved.toFixed(2)}
                  </td>

                  <td className="py-3.5 px-4 font-bold text-white">
                    ${inv.amount.toFixed(2)} USD
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                      Paid
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/billing/invoices/${inv.id}`}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 hover:text-white transition-all border border-white/10 text-[11px] font-sans font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View & Print</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </AuthRequiredGate>
      </main>
    </div>
  );
}
