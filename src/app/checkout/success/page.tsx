'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  CheckCircle2,
  Key,
  Copy,
  Check,
  Zap,
  Download,
  ArrowRight,
  ShieldCheck,
  Terminal,
  Code2,
  Sparkles,
  Printer,
  ChevronRight
} from 'lucide-react';
import { TrustSeals } from '@/components/common/TrustSeals';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const amount = searchParams.get('amount') || '50';
  const total = searchParams.get('total') || '80';
  const tier = searchParams.get('tier') || 'Growth VIP Shard';
  const email = searchParams.get('email') || 'developer@company.com';
  const method = searchParams.get('method') || 'Credit Card';

  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'python' | 'ts' | 'cursor'>('cursor');

  // Deterministic generated live key for demonstration
  const liveApiKey = 'galx_live_94f83b108e48a729e10c73e918';
  const orderNumber = 'GALX-89312';
  const transactionDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleCopyKey = async () => {
    const success = await safeCopyToClipboard(liveApiKey);
    if (success) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200 flex flex-col justify-between">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] bg-cyan-500/10 rounded-full blur-[140px]" />
      </div>

      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 relative z-10">
        {/* Progress Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-mono border-b border-white/10 pb-4">
          <span className="text-zinc-500">1. Compute Tier</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-zinc-500">2. Checkout</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            3. Order Confirmed &amp; Key Ready
          </span>
        </div>

        {/* Hero Success Banner */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-emerald-500/40 bg-gradient-to-b from-emerald-500/15 via-black/60 to-black/80 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20 animate-in zoom-in-95 duration-200">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>PAYMENT CONFIRMED • ORDER #{orderNumber}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Deposit Successful! ${total}.00 Compute Loaded
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
              Your prepaid compute balance has been credited directly to your workspace. Your dedicated gateway key is live and ready for immediate requests.
            </p>
          </div>

          {/* Key Reveal Box */}
          <div className="p-5 rounded-2xl bg-black/80 border border-amber-500/40 space-y-3 font-mono max-w-2xl mx-auto text-left shadow-inner">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Live API Bearer Key:</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">Active &amp; Funded</span>
            </div>

            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-black/60 border border-white/10">
              <code className="text-xs text-cyan-300 font-mono tracking-wider break-all select-all">
                {liveApiKey}
              </code>
              <button
                type="button"
                onClick={handleCopyKey}
                className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase flex items-center gap-1 transition-all cursor-pointer shrink-0"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5 text-black" />}
                <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Details: Receipt Summary & 30-Second Integration */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Official Invoice & Receipt */}
          <div className="lg:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 bg-black/50 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Printer className="w-4 h-4 text-zinc-400" />
                <span>Invoice &amp; Receipt</span>
              </h2>
              <button
                onClick={handlePrintReceipt}
                className="text-xs font-mono text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Print PDF</span>
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs text-zinc-300">
              <div className="flex justify-between">
                <span className="text-zinc-400">Order Number:</span>
                <span className="text-white font-bold">#{orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Transaction Date:</span>
                <span>{transactionDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Billed To:</span>
                <span className="text-white">{email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Payment Method:</span>
                <span>{method}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/10">
                <span className="text-zinc-400">Prepaid Deposit:</span>
                <span className="text-white font-bold">${amount}.00 USD</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Welcome Builder Match:</span>
                <span className="font-bold">+$5.00 FREE</span>
              </div>
              <div className="flex justify-between text-amber-300">
                <span>50% Compute Match Bonus:</span>
                <span className="font-bold">+${(parseFloat(total) - parseFloat(amount) - 5).toFixed(2)} FREE</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/10 text-sm">
                <span className="font-bold text-white">Total Loaded:</span>
                <span className="font-black text-emerald-300">${total}.00 USD</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <Link
                href="/billing"
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>View Full Billing Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right: 30-Second Integration Snippet */}
          <div className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 bg-black/50 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span>30-Second Quickstart</span>
              </h2>

              <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 font-mono">
                {(['cursor', 'python', 'ts'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveCodeTab(tab)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      activeCodeTab === tab
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {activeCodeTab === 'cursor' && (
              <div className="space-y-3 font-mono text-xs">
                <p className="text-zinc-300 font-sans leading-relaxed">
                  In Cursor or Windsurf, navigate to <strong>Settings → Models → OpenAI API Key</strong>:
                </p>
                <div className="p-4 rounded-2xl bg-black/80 border border-white/10 space-y-2">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Override Base URL:</span>
                    <code className="text-cyan-300 select-all">https://api.galx.ai/v1</code>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">API Key:</span>
                    <code className="text-amber-300 select-all">{liveApiKey}</code>
                  </div>
                </div>
              </div>
            )}

            {activeCodeTab === 'python' && (
              <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 text-cyan-300 text-xs font-mono overflow-x-auto leading-relaxed">
                <code>{`from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="${liveApiKey}"
)

res = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(res.choices[0].message.content)`}</code>
              </pre>
            )}

            {activeCodeTab === 'ts' && (
              <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 text-cyan-300 text-xs font-mono overflow-x-auto leading-relaxed">
                <code>{`import { OpenAI } from 'openai';

const client = new OpenAI({
  baseURL: 'https://api.galx.ai/v1',
  apiKey: '${liveApiKey}'
});

const res = await client.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Hello!' }]
});
console.log(res.choices[0].message.content);`}</code>
              </pre>
            )}

            <div className="flex gap-3 pt-2">
              <Link
                href="/keys"
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase font-mono flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>Go to Key Management</span>
              </Link>

              <Link
                href="/docs/quickstart"
                className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Docs</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Consumer Trust Seals */}
        <TrustSeals />
      </main>
    </div>
  );
}

function BaseCheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#07080d] flex items-center justify-center text-zinc-400 font-mono text-xs">
        Loading receipt...
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

export default withErrorBoundary(BaseCheckoutSuccessPage, {
  name: 'Checkout Success Receipt Page'
});
