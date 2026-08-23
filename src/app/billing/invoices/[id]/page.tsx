'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  Download,
  Building,
  ShieldCheck,
  Zap,
  Lock,
  Receipt,
  FileText
} from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';

interface InvoiceData {
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

const INVOICE_MAP: Record<string, InvoiceData> = {
  'INV-2026-0801': {
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
  'INV-2026-0701': {
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
  'INV-2026-0601': {
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
};

export default function SingleInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const invoiceId = resolvedParams.id;
  const invoice = INVOICE_MAP[invoiceId] || INVOICE_MAP['INV-2026-0801'];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Billing', href: '/billing' },
            { label: 'Invoices', href: '/billing/invoices' },
            { label: invoice.invoiceNumber }
          ]}
        />

        <AuthRequiredGate
          title="Sign In to Access Corporate Tax Invoice"
          description="Official tax invoices, VAT receipt data, and transaction payment details are private to your workspace."
          checkoutAmount={50}
        >
          <div className="flex items-center justify-between">
          <Link
            href="/billing/invoices"
            className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Invoices Archive</span>
          </Link>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-amber-400 text-black font-black text-xs uppercase tracking-wider font-mono flex items-center gap-2 hover:bg-amber-300 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save Tax PDF</span>
          </button>
        </div>

        {/* Formal Printable Business Tax Invoice Sheet */}
        <div className="bg-[#0e111a] border border-white/20 rounded-3xl p-8 sm:p-12 space-y-8 text-white shadow-2xl relative">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-8 border-b border-white/10">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="font-black text-2xl tracking-wider text-white">
                  GALX<span className="text-cyan-400">AI</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
                  OFFICIAL TAX STATEMENT
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">GALXAI Infrastructure, Inc. • US-EIN 88-2910341</p>
              <p className="text-xs text-zinc-500">548 Market St, Suite 39201, San Francisco, CA 94104</p>
            </div>

            <div className="text-right font-mono text-xs space-y-1">
              <div className="text-base font-bold text-white">{invoice.invoiceNumber}</div>
              <div className="text-zinc-400">Issued: {invoice.issuedDate}</div>
              <div className="text-zinc-400">Status: <span className="text-emerald-400 font-bold">Paid in Full</span></div>
            </div>
          </div>

          {/* Customer & Tax Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-mono bg-black/40 p-6 rounded-2xl border border-white/5">
            <div className="space-y-1.5">
              <div className="text-zinc-500 uppercase text-[10px]">Billed To (Customer):</div>
              <div className="font-bold text-white font-sans text-base">Acme AI Corporation</div>
              <div className="text-zinc-400">billing@acme.ai</div>
              <div className="text-zinc-400">100 Montgomery St, Suite 400, San Francisco, CA 94104</div>
            </div>

            <div className="space-y-1.5 sm:text-right">
              <div className="text-zinc-500 uppercase text-[10px]">Tax & Payment Records:</div>
              <div className="text-zinc-300">Customer Tax ID: <strong>US-EIN 94-8271034</strong></div>
              <div className="text-zinc-300">PO Number: <strong>PO-2026-ENG-08</strong></div>
              <div className="text-zinc-300">Payment Instrument: <strong>{invoice.paymentMethod}</strong></div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 bg-black/50 rounded-xl border border-white/5 flex items-center justify-between font-bold text-zinc-400 text-[11px] uppercase">
              <span>Item & Service Description</span>
              <span>Amount (USD)</span>
            </div>

            <div className="p-4 rounded-xl border border-white/5 flex items-center justify-between">
              <div className="space-y-1 font-sans">
                <div className="font-bold text-white">Prepaid Wholesale Compute Allocation ({invoice.period})</div>
                <div className="text-xs text-zinc-400 font-mono">
                  {(invoice.tokensCount / 1000000).toFixed(1)}M inference tokens across 12 frontier models
                </div>
              </div>
              <div className="font-bold text-white font-mono text-sm">${invoice.amount.toFixed(2)} USD</div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-emerald-300">
              <div className="space-y-0.5 font-sans">
                <span className="font-bold">Direct Wholesale Discount Rebate Applied (-25% to -40%)</span>
                <div className="text-[11px] text-emerald-400/80 font-mono">Passed through with zero markup</div>
              </div>
              <span className="font-bold font-mono text-sm">-${invoice.wholesaleSaved.toFixed(2)} USD</span>
            </div>
          </div>

          {/* Total & Summary Strip */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-white/10 font-mono text-xs">
            <div className="text-zinc-400 space-y-0.5">
              <div>Payment received via Stripe • Transaction ID: <code className="text-zinc-300">ch_3N184G...</code></div>
              <div className="text-[11px] text-zinc-500">Zero Content Retention Certified • 100% Cryptographically Isolated</div>
            </div>

            <div className="text-right space-y-1">
              <div className="text-zinc-400 uppercase text-[10px]">Net Total Invoiced:</div>
              <div className="text-2xl font-black text-emerald-400">${invoice.amount.toFixed(2)} USD</div>
            </div>
          </div>
        </div>
        </AuthRequiredGate>
      </main>
    </div>
  );
}
