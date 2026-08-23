'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { BillingSubNav } from '@/components/dashboard/BillingSubNav';
import {
  Wallet,
  CreditCard,
  Plus,
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  Coins,
  Flame,
  AlertCircle,
  RefreshCw,
  Sliders,
  DollarSign,
  ArrowRight,
  Receipt,
  Gift,
  Bell,
  Lock,
  Play,
  Download,
  Filter,
  PieChart,
  Layers,
  FileText,
  Key,
  Check,
  Printer,
  Building,
  ExternalLink,
  Eye,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { useDepositVerification } from '@/lib/hooks/useDepositVerification';
import { TierUnlockProgressBar } from '@/components/dashboard/TierUnlockProgressBar';

interface TopUpPack {
  amount: number;
  bonusPct: number;
  bonusLabel: string;
  isPopular?: boolean;
}

const TOPUP_PACKS: TopUpPack[] = [
  { amount: 25, bonusPct: 10, bonusLabel: '+10% Bonus ($27.50 Credit)' },
  { amount: 50, bonusPct: 25, bonusLabel: '+25% Grant ($62.50 Credit)' },
  { amount: 100, bonusPct: 50, bonusLabel: '50% Match Grant ($150.00 Credit)', isPopular: true },
  { amount: 250, bonusPct: 50, bonusLabel: '50% Match Grant ($375.00 Credit)' },
  { amount: 500, bonusPct: 50, bonusLabel: '50% Scale Match ($750.00 Credit)' }
];

interface Transaction {
  id: string;
  type: 'deposit' | 'usage';
  description: string;
  model?: string;
  tokens?: number;
  discountPct?: number;
  amount: number;
  timestamp: string;
}

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
  pdfUrl?: string;
}

const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv_2026_08',
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
    id: 'inv_2026_07',
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
    id: 'inv_2026_06',
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

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_welcome_credit',
    type: 'deposit',
    description: 'Welcome Grant ($5.00 Free Compute Credit)',
    amount: 5.00,
    timestamp: 'Just now'
  },
  {
    id: 'tx_topup_100',
    type: 'deposit',
    description: 'Prepaid Compute Pack (+10% Bonus Credit)',
    amount: 110.00,
    timestamp: '2 hours ago'
  },
  {
    id: 'tx_usage_01',
    type: 'usage',
    description: 'Batch Reasoning Completion',
    model: 'gpt-5.6-sol',
    tokens: 42500,
    discountPct: 25,
    amount: -0.1594,
    timestamp: '15 mins ago'
  },
  {
    id: 'tx_usage_02',
    type: 'usage',
    description: 'Agentic Code Refactoring',
    model: 'gpt-5.6-terra',
    tokens: 88000,
    discountPct: 28,
    amount: -0.1892,
    timestamp: '45 mins ago'
  },
  {
    id: 'tx_usage_03',
    type: 'usage',
    description: 'Visual Synthesis 4K',
    model: 'openai-gpt-image-2',
    tokens: 1000,
    discountPct: 25,
    amount: -0.0600,
    timestamp: '1 hour ago'
  }
];

export default function BillingPage() {
  const { walletBalance, depositAndUnlock, hasVerifiedDeposit } = useDepositVerification();
  const [balance, setBalance] = useState(114.59);

  useEffect(() => {
    if (walletBalance > 0 || hasVerifiedDeposit) {
      setBalance(walletBalance);
    }
  }, [walletBalance, hasVerifiedDeposit]);

  const [welcomeCreditRemaining] = useState(4.65);
  const [lifetimeSaved] = useState(38.40);
  const [monthlySpend] = useState(38.40);
  const [selectedPackAmount, setSelectedPackAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');

  // Business Invoicing Details State
  const [companyName, setCompanyName] = useState('Acme AI Corporation');
  const [billingEmail, setBillingEmail] = useState('billing@acme.ai');
  const [taxId, setTaxId] = useState('US-EIN 94-8271034');
  const [billingAddress, setBillingAddress] = useState('100 Montgomery St, Suite 400, San Francisco, CA 94104');
  const [poNumber, setPoNumber] = useState('PO-2026-ENG-08');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);

  // Selected Invoice Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Auto-Top Up State
  const [autoReloadEnabled, setAutoReloadEnabled] = useState(true);
  const [autoReloadThreshold, setAutoReloadThreshold] = useState(10);
  const [autoReloadAmount, setAutoReloadAmount] = useState(50);
  const [monthlyReloadCap, setMonthlyReloadCap] = useState(500);
  const [emailAlertsOnReload, setEmailAlertsOnReload] = useState(true);
  const [isSimulatingReload, setIsSimulatingReload] = useState(false);
  const [reloadSimulationMsg, setReloadSimulationMsg] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [filterType, setFilterType] = useState<'all' | 'deposit' | 'usage'>('all');
  const [copiedCsv, setCopiedCsv] = useState(false);

  const depositAmount = customAmount ? Number(customAmount) || 0 : selectedPackAmount;
  const depositBonusMultiplier = depositAmount >= 500 ? 1.20 : depositAmount >= 100 ? 1.10 : depositAmount >= 50 ? 1.05 : 1.0;
  const totalCreditReceived = depositAmount * depositBonusMultiplier;

  const handleDeposit = () => {
    if (depositAmount <= 0) return;
    setIsProcessing(true);

    setTimeout(() => {
      depositAndUnlock(depositAmount);
      setBalance(prev => prev + totalCreditReceived);
      const newTx: Transaction = {
        id: `tx_${Date.now()}`,
        type: 'deposit',
        description: `Prepaid Compute Top-Up ($${depositAmount.toFixed(2)}${depositBonusMultiplier > 1 ? ` + Bonus` : ''})`,
        amount: totalCreditReceived,
        timestamp: 'Just now'
      };
      setTransactions(prev => [newTx, ...prev]);
      setIsProcessing(false);
      setTopUpSuccess(`Successfully credited $${totalCreditReceived.toFixed(2)} to your wallet!`);
      setTimeout(() => setTopUpSuccess(null), 4000);
    }, 600);
  };

  // Simulate Auto-Top Up Trigger
  const handleSimulateAutoReload = () => {
    setIsSimulatingReload(true);
    setReloadSimulationMsg(null);

    const bonusMult = autoReloadAmount >= 100 ? 1.10 : autoReloadAmount >= 50 ? 1.05 : 1.0;
    const reloadCredit = autoReloadAmount * bonusMult;

    setTimeout(() => {
      setBalance(prev => prev + reloadCredit);
      const newTx: Transaction = {
        id: `tx_autoreload_${Date.now()}`,
        type: 'deposit',
        description: `Auto-Top Up Triggered (Threshold: <$${autoReloadThreshold}.00 • +${((bonusMult - 1) * 100).toFixed(0)}% Bonus)`,
        amount: reloadCredit,
        timestamp: 'Just now (Automated)'
      };
      setTransactions(prev => [newTx, ...prev]);
      setIsSimulatingReload(false);
      setReloadSimulationMsg(`⚡ Auto-Top Up executed seamlessly: Credited +$${reloadCredit.toFixed(2)} USD via Visa (••4242). Zero execution pause.`);
      setTimeout(() => setReloadSimulationMsg(null), 6000);
    }, 800);
  };

  const handleExportCsv = () => {
    const csvRows = [
      ['Transaction ID', 'Type', 'Description', 'Model', 'Tokens', 'Discount %', 'Amount USD', 'Timestamp'].join(','),
      ...transactions.map(t => [
        t.id,
        t.type,
        `"${t.description}"`,
        t.model || '',
        t.tokens || 0,
        t.discountPct || 0,
        t.amount,
        `"${t.timestamp}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `galxai_ledger_${Date.now()}.csv`;
    a.click();
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingProfile(false);
    setProfileSavedMsg(true);
    setTimeout(() => setProfileSavedMsg(false), 3000);
  };

  const filteredTransactions = transactions.filter(t => filterType === 'all' || t.type === filterType);
  const spendPct = Math.min(100, (monthlySpend / monthlyReloadCap) * 100);

  const totalYtdInvoiced = invoices.reduce((acc, inv) => acc + inv.amount, 0);
  const totalYtdSaved = invoices.reduce((acc, inv) => acc + inv.wholesaleSaved, 0);
  const totalYtdTokens = invoices.reduce((acc, inv) => acc + inv.tokensCount, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs items={[{ label: 'Wallet & Compute Billing' }]} />

        <BillingSubNav />

        {/* Hero Header & Wallet Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Main Balance Card */}
          <div className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden flex flex-col justify-between border border-emerald-500/30 shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>UNIFIED DEVELOPER COMPUTE WALLET</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/40">
                  Active • Good Standing
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-zinc-400 font-mono uppercase tracking-wider">Available Compute Balance</div>
                <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight flex items-baseline gap-2">
                  <span>${balance.toFixed(2)}</span>
                  <span className="text-xs font-sans text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    USD
                  </span>
                </div>
                <p className="text-xs text-zinc-400 pt-1">
                  Estimated runway: <strong className="text-white">~45 days</strong> at current request volume. Micro-billed per token with 0 markups.
                </p>
              </div>

              {/* Monthly Spend vs Budget Cap Meter */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400">Monthly Usage: <strong className="text-white">${monthlySpend.toFixed(2)}</strong></span>
                  <span className="text-zinc-500">Safety Cap: ${monthlyReloadCap.toFixed(2)}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${spendPct}%` }}
                  />
                </div>
                <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                  <span>{spendPct.toFixed(1)}% of monthly budget utilized</span>
                  <span className="text-emerald-400 font-bold">Auto-Reload Protected</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10 font-mono text-xs">
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-0.5">
                <div className="text-[10px] text-zinc-500 uppercase">Welcome Credit</div>
                <div className="text-emerald-300 font-bold text-sm">${welcomeCreditRemaining.toFixed(2)}</div>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-0.5">
                <div className="text-[10px] text-zinc-500 uppercase">Lifetime Saved</div>
                <div className="text-amber-300 font-bold text-sm">-${lifetimeSaved.toFixed(2)}</div>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-0.5">
                <div className="text-[10px] text-zinc-500 uppercase">Auto-Top Up</div>
                <div className="text-cyan-300 font-bold text-sm">{autoReloadEnabled ? 'Protected' : 'Off'}</div>
              </div>
            </div>
          </div>

          {/* GTM Bonus Incentive Card */}
          <div className="lg:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-amber-500/30 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                <Gift className="w-3.5 h-3.5" />
                <span>GTM TOP-UP BONUS CREDITS</span>
              </div>
              <h2 className="text-xl font-black text-white">Prepay & Unlock Up to +20% Bonus Credit</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Compound your 25%–40% wholesale model discounts with top-up bonuses. Added credits never expire and apply to all 12 flagship models.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10 text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero platform maintenance fees or monthly minimums</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>75% automatic prompt caching rebate pass-through</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Immediate 100% refund on unspent deposited funds</span>
              </div>
            </div>
          </div>
        </div>

        {/* Business Expense & Financial Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-1">
            <span className="text-[11px] text-zinc-400 uppercase font-sans font-semibold">2026 YTD Invoiced</span>
            <div className="text-2xl font-black text-white">${totalYtdInvoiced.toFixed(2)} USD</div>
            <div className="text-[11px] text-zinc-500 font-sans">3 tax receipts issued</div>
          </div>

          <div className="p-5 rounded-3xl glass-panel border border-emerald-500/30 bg-emerald-500/5 space-y-1">
            <span className="text-[11px] text-emerald-400 uppercase font-sans font-semibold">Wholesale Savings Delivered</span>
            <div className="text-2xl font-black text-emerald-300">-${totalYtdSaved.toFixed(2)} USD</div>
            <div className="text-[11px] text-emerald-400/80 font-sans">33.3% net business savings vs retail</div>
          </div>

          <div className="p-5 rounded-3xl glass-panel border border-cyan-500/30 bg-cyan-500/5 space-y-1">
            <span className="text-[11px] text-cyan-400 uppercase font-sans font-semibold">Total Invoiced Tokens</span>
            <div className="text-2xl font-black text-cyan-300">{(totalYtdTokens / 1000000).toFixed(1)}M Tokens</div>
            <div className="text-[11px] text-zinc-400 font-sans">Avg: $2.49 / 1M tokens</div>
          </div>

          <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-1">
            <span className="text-[11px] text-zinc-400 uppercase font-sans font-semibold">Invoicing Entity</span>
            <div className="text-sm font-bold text-white truncate font-sans">{companyName}</div>
            <div className="text-[11px] text-zinc-500 font-mono truncate">{taxId}</div>
          </div>
        </div>

        {/* Top-Up Packs & Checkout Drawer */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              Add Compute Credits to Wallet
            </h2>
            <p className="text-xs text-zinc-400">Select a pre-configured credit pack with volume bonus or enter a custom amount.</p>
          </div>

          {topUpSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{topUpSuccess}</span>
            </div>
          )}

          {/* E-Commerce Gamified Reward Milestone Bar */}
          <TierUnlockProgressBar
            currentAmount={customAmount ? (parseFloat(customAmount) || 0) : selectedPackAmount}
            onSelectTierAmount={(amt) => {
              setSelectedPackAmount(amt);
              setCustomAmount('');
            }}
          />

          {/* Preset Packs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {TOPUP_PACKS.map((pack) => {
              const isSelected = selectedPackAmount === pack.amount && !customAmount;
              const bonusCredit = pack.amount * (1 + pack.bonusPct / 100);

              return (
                <div
                  key={pack.amount}
                  onClick={() => {
                    setSelectedPackAmount(pack.amount);
                    setCustomAmount('');
                  }}
                  className={`cursor-pointer rounded-2xl p-5 border transition-all space-y-3 relative ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10 scale-[1.02]'
                      : 'bg-black/30 border-white/10 hover:border-white/20'
                  }`}
                >
                  {pack.isPopular && (
                    <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[9px] font-black uppercase tracking-wider font-mono">
                      Most Popular
                    </span>
                  )}

                  <div className="space-y-1">
                    <div className="text-2xl font-black text-white font-mono">${pack.amount}</div>
                    <div className="text-xs text-emerald-400 font-mono font-bold">
                      {pack.bonusPct > 0 ? `Receive $${bonusCredit.toFixed(2)} Credit` : `$${pack.amount}.00 Credit`}
                    </div>
                  </div>

                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    pack.bonusPct > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-zinc-400'
                  }`}>
                    {pack.bonusLabel}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Custom Amount Input & Checkout Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
            <div className="w-full sm:w-72 space-y-1">
              <label className="block text-[11px] font-mono uppercase text-zinc-400">Custom Deposit Amount ($ USD)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-zinc-500 font-mono">$</span>
                <input
                  type="number"
                  min="10"
                  max="10000"
                  placeholder="e.g. 250"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full py-2.5 pl-8 pr-4 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
              <div className="text-right font-mono text-xs hidden sm:block">
                <div className="text-zinc-400">Total Credit Added:</div>
                <div className="text-base font-black text-emerald-300">${totalCreditReceived.toFixed(2)} USD</div>
              </div>

              <Link
                href={`/checkout?amount=${Math.max(25, depositAmount)}`}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer font-mono hover:scale-105 active:scale-95"
              >
                <Lock className="w-4 h-4 fill-black" />
                <span>Proceed to Secure Checkout (${depositAmount.toFixed(0)})</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                onClick={handleDeposit}
                disabled={isProcessing || depositAmount <= 0}
                className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer font-mono disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{isProcessing ? 'Crediting...' : '1-Click Fast Top-Up'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Auto-Top Up & Zero-Downtime Protection Control Center */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-cyan-500/20 bg-cyan-500/5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>ZERO-DOWNTIME INFRASTRUCTURE PROTECTION</span>
              </div>
              <h2 className="text-lg font-bold text-white">Automated Wallet Top-Up (Auto-Reload)</h2>
              <p className="text-xs text-zinc-400">
                Prevent agent loops, IDE completions, and production backends from stalling on unexpected low-balance events.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSimulateAutoReload}
                disabled={isSimulatingReload || !autoReloadEnabled}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-cyan-400" />
                <span>{isSimulatingReload ? 'Executing Reload...' : 'Test Auto-Top Up Trigger'}</span>
              </button>

              <button
                onClick={() => setAutoReloadEnabled(!autoReloadEnabled)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                  autoReloadEnabled
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : 'bg-zinc-800 text-zinc-400 border-white/10'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${autoReloadEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                <span>{autoReloadEnabled ? 'Auto-Top Up Active' : 'Auto-Top Up Off'}</span>
              </button>
            </div>
          </div>

          {reloadSimulationMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{reloadSimulationMsg}</span>
            </div>
          )}

          {autoReloadEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/10">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <label className="block text-[11px] text-zinc-400 font-mono uppercase">Trigger When Balance Drops Below</label>
                <select
                  value={autoReloadThreshold}
                  onChange={(e) => setAutoReloadThreshold(Number(e.target.value))}
                  className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white font-mono focus:outline-none"
                >
                  <option value={5} className="bg-zinc-900 text-white">$5.00 Threshold</option>
                  <option value={10} className="bg-zinc-900 text-white">$10.00 Threshold (Recommended)</option>
                  <option value={25} className="bg-zinc-900 text-white">$25.00 Threshold</option>
                  <option value={50} className="bg-zinc-900 text-white">$50.00 Threshold</option>
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <label className="block text-[11px] text-zinc-400 font-mono uppercase">Automatic Reload Amount</label>
                <select
                  value={autoReloadAmount}
                  onChange={(e) => setAutoReloadAmount(Number(e.target.value))}
                  className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white font-mono focus:outline-none"
                >
                  <option value={25} className="bg-zinc-900 text-white">$25.00 Reload</option>
                  <option value={50} className="bg-zinc-900 text-white">$50.00 Reload (+5% Bonus)</option>
                  <option value={100} className="bg-zinc-900 text-white">$100.00 Reload (+10% Bonus)</option>
                  <option value={250} className="bg-zinc-900 text-white">$250.00 Reload (+10% Bonus)</option>
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <label className="block text-[11px] text-zinc-400 font-mono uppercase">Monthly Safety Cap</label>
                <select
                  value={monthlyReloadCap}
                  onChange={(e) => setMonthlyReloadCap(Number(e.target.value))}
                  className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white font-mono focus:outline-none"
                >
                  <option value={250} className="bg-zinc-900 text-white">Max $250 / mo</option>
                  <option value={500} className="bg-zinc-900 text-white">Max $500 / mo (Recommended)</option>
                  <option value={1000} className="bg-zinc-900 text-white">Max $1,000 / mo</option>
                  <option value={5000} className="bg-zinc-900 text-white">Max $5,000 / mo</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Business Tax Invoices & Official Receipts Section */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                Business Tax Invoices & Statements
              </h2>
              <p className="text-xs text-zinc-400">
                Official PDF invoices with company details, VAT/Tax identification, and wholesale discount reporting.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
              >
                <Building className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isEditingProfile ? 'Close Invoicing Profile' : 'Edit Company Billing Profile'}</span>
              </button>
            </div>
          </div>

          {profileSavedMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Company billing profile updated successfully!</span>
            </div>
          )}

          {/* Invoicing Profile Editor Drawer */}
          {isEditingProfile && (
            <form onSubmit={handleSaveProfile} className="p-6 rounded-3xl bg-black/40 border border-white/10 space-y-4 animate-in fade-in duration-200">
              <h3 className="text-sm font-bold text-white">Company Tax & Invoicing Profile</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase">Legal Entity Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase">Billing Contact Email</label>
                  <input
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase">Tax ID / VAT Number</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase">Purchase Order / Cost Center</label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase">Billing Address</label>
                  <input
                    type="text"
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-400 text-black text-xs font-bold font-mono hover:bg-amber-300 transition-all cursor-pointer"
                >
                  Save Invoicing Profile
                </button>
              </div>
            </form>
          )}

          {/* Invoices Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4 font-sans">Invoice #</th>
                  <th className="py-3 px-4 font-sans">Billing Period</th>
                  <th className="py-3 px-4 font-sans">Tokens Invoiced</th>
                  <th className="py-3 px-4 font-sans">Wholesale Saved</th>
                  <th className="py-3 px-4 font-sans">Amount (USD)</th>
                  <th className="py-3 px-4 font-sans">Status</th>
                  <th className="py-3 px-4 text-right font-sans">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      {inv.invoiceNumber}
                    </td>

                    <td className="py-3.5 px-4 text-zinc-300 font-sans">
                      {inv.period}
                    </td>

                    <td className="py-3.5 px-4 text-cyan-300">
                      {(inv.tokensCount / 1000000).toFixed(1)}M tokens
                    </td>

                    <td className="py-3.5 px-4 text-emerald-400 font-bold">
                      -${inv.wholesaleSaved.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-white">
                      ${inv.amount.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        Paid
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 hover:text-white transition-all border border-white/10 text-[11px] font-sans font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Invoice</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Per-Key Spend Governance & Saved Payment Method Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Per-Key Breakdown */}
          <div className="lg:col-span-7 glass-panel rounded-3xl p-6 space-y-4 border border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-400" />
                Active Key Spend Allocation
              </h3>
              <Link href="/keys" className="text-xs text-cyan-300 hover:underline">
                Manage Keys →
              </Link>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {[
                { name: 'Cursor IDE / AI Editor', spend: 14.20, pct: 37, color: 'bg-amber-400' },
                { name: 'Production API Backend', spend: 18.50, pct: 48, color: 'bg-cyan-400' },
                { name: 'Agent Swarm / LangChain', spend: 5.70, pct: 15, color: 'bg-indigo-400' }
              ].map((k) => (
                <div key={k.name} className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 font-sans font-semibold">{k.name}</span>
                    <span className="text-white font-bold">${k.spend.toFixed(2)} ({k.pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full ${k.color} rounded-full`} style={{ width: `${k.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method & Invoicing Details */}
          <div className="lg:col-span-5 glass-panel rounded-3xl p-6 space-y-4 border border-white/10 flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Default Payment Instrument
              </h3>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-white font-bold text-xs flex items-center justify-center font-mono">
                    VISA
                  </div>
                  <div className="font-mono text-xs">
                    <div className="text-white font-bold">•••• 4242</div>
                    <div className="text-zinc-500 text-[10px]">Expires 12/28 • Default</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Verified
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-white/5 text-xs text-zinc-400">
              <div className="flex items-center justify-between">
                <span>Invoicing Entity:</span>
                <span className="text-zinc-200 font-semibold">{companyName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tax ID / VAT:</span>
                <span className="text-zinc-200 font-mono">{taxId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-Time Micro-Billing Ledger & Spend History */}
        <div className="glass-panel rounded-3xl p-6 overflow-x-auto space-y-4 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                Micro-Billing Ledger & Real-Time Invoices
              </h2>
              <span className="text-xs text-zinc-400">Instant microsecond precision token deductions and top-up receipts.</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center p-1 rounded-xl bg-black/50 border border-white/10 text-xs font-mono">
                {(['all', 'deposit', 'usage'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterType(f)}
                    className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                      filterType === f
                        ? 'bg-amber-400 text-black font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {f === 'all' ? 'All Events' : f === 'deposit' ? 'Deposits / Top-Ups' : 'Token Usage'}
                  </button>
                ))}
              </div>

              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
              >
                {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
                <span>{copiedCsv ? 'Exported!' : 'Export CSV'}</span>
              </button>
            </div>
          </div>

          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4 font-sans">Transaction / Event</th>
                <th className="py-3 px-4 font-sans">Model</th>
                <th className="py-3 px-4 font-sans">Tokens</th>
                <th className="py-3 px-4 font-sans">Discount</th>
                <th className="py-3 px-4 font-sans">Amount</th>
                <th className="py-3 px-4 text-right font-sans">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.map((tx) => {
                const isDeposit = tx.type === 'deposit';
                return (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isDeposit ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
                        <span>{tx.description}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-cyan-300">
                      {tx.model || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-zinc-400">
                      {tx.tokens ? `${tx.tokens.toLocaleString()} tokens` : '—'}
                    </td>

                    <td className="py-3.5 px-4">
                      {tx.discountPct ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                          -{tx.discountPct}%
                        </span>
                      ) : '—'}
                    </td>

                    <td className={`py-3.5 px-4 font-bold ${isDeposit ? 'text-emerald-300' : 'text-zinc-300'}`}>
                      {isDeposit ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(4)}`}
                    </td>

                    <td className="py-3.5 px-4 text-right text-zinc-500">
                      {tx.timestamp}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Printable Business Tax Invoice Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="bg-[#0e111a] border border-white/20 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 text-white shadow-2xl relative">
              {/* Modal Close Button */}
              <button
                onClick={() => setSelectedInvoice(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Invoice Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xl tracking-wider text-white">
                      GALX<span className="text-cyan-400">AI</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
                      PAID INVOICE
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono">GALXAI Infrastructure, Inc. • US-EIN 88-2910341</p>
                  <p className="text-xs text-zinc-500">548 Market St, Suite 39201, San Francisco, CA 94104</p>
                </div>

                <div className="text-right font-mono text-xs space-y-0.5">
                  <div className="text-sm font-bold text-white">{selectedInvoice.invoiceNumber}</div>
                  <div className="text-zinc-400">Date: {selectedInvoice.issuedDate}</div>
                  <div className="text-zinc-400">Status: <span className="text-emerald-400 font-bold">Paid</span></div>
                </div>
              </div>

              {/* Bill To Info */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-black/40 p-4 rounded-2xl border border-white/5">
                <div className="space-y-1">
                  <div className="text-zinc-500 uppercase text-[10px]">Billed To (Customer):</div>
                  <div className="font-bold text-white font-sans text-sm">{companyName}</div>
                  <div className="text-zinc-400">{billingEmail}</div>
                  <div className="text-zinc-400">{billingAddress}</div>
                </div>

                <div className="space-y-1 text-right">
                  <div className="text-zinc-500 uppercase text-[10px]">Tax & Order Info:</div>
                  <div className="text-zinc-300">Tax ID: <strong>{taxId}</strong></div>
                  <div className="text-zinc-300">PO Number: <strong>{poNumber}</strong></div>
                  <div className="text-zinc-300">Payment: <strong>{selectedInvoice.paymentMethod}</strong></div>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2 font-mono text-xs">
                <div className="p-3 bg-black/30 rounded-xl border border-white/5 flex items-center justify-between font-bold text-zinc-400 text-[11px] uppercase">
                  <span>Description</span>
                  <span>Amount</span>
                </div>

                <div className="p-3 rounded-xl border border-white/5 flex items-center justify-between">
                  <div className="space-y-0.5 font-sans">
                    <div className="font-semibold text-white">Prepaid Wholesale Compute Allocation ({selectedInvoice.period})</div>
                    <div className="text-[11px] text-zinc-400 font-mono">{(selectedInvoice.tokensCount / 1000000).toFixed(1)}M frontier inference tokens</div>
                  </div>
                  <div className="font-bold text-white font-mono">${selectedInvoice.amount.toFixed(2)} USD</div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-emerald-300">
                  <span className="font-sans font-semibold">Direct Wholesale Discount Rebate Applied (-25% to -40%)</span>
                  <span className="font-bold font-mono">-${selectedInvoice.wholesaleSaved.toFixed(2)} USD</span>
                </div>
              </div>

              {/* Total & Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 font-mono text-xs">
                <div>
                  <span className="text-zinc-400">Total Paid: </span>
                  <strong className="text-lg font-black text-emerald-400">${selectedInvoice.amount.toFixed(2)} USD</strong>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-sans font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Save PDF</span>
                  </button>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="px-4 py-2 rounded-xl bg-amber-400 text-black font-sans font-bold text-xs hover:bg-amber-300 transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
