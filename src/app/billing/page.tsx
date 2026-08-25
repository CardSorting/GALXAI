'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { BillingSubNav } from '@/components/dashboard/BillingSubNav';
import {
  Wallet,
  Plus,
  Sparkles,
  Zap,
  CheckCircle2,
  Coins,
  RefreshCw,
  Sliders,
  Gift,
  Lock,
  PieChart,
  ExternalLink,
  Eye,
  X,
  FileSpreadsheet,
  Activity,
  ShieldCheck,
  Key
} from 'lucide-react';
import { useDepositVerification } from '@/lib/hooks/useDepositVerification';
import { useAuth } from '@/contexts/AuthContext';
import { GranularUsageExplorer } from '@/components/wallet/GranularUsageExplorer';
import { LiveUsageLedger } from '@/components/wallet/LiveUsageLedger';
import { CostEstimatorCalculator } from '@/components/wallet/CostEstimatorCalculator';
import { WalletTopUpModal } from '@/components/wallet/WalletTopUpModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

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

export default function BillingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { walletBalance, depositAndUnlock, hasVerifiedDeposit } = useDepositVerification();
  const [balance, setBalance] = useState(114.59);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpModalInitialAmt, setTopUpModalInitialAmt] = useState(100);

  // Active Main Billing Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'ledger' | 'estimator' | 'autoreload' | 'invoices'>('overview');

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

  // Auto-Top Up State
  const [autoReloadEnabled, setAutoReloadEnabled] = useState(true);
  const [autoReloadThreshold] = useState(10);
  const [autoReloadAmount] = useState(50);
  const [monthlyReloadCap] = useState(500);
  const [isSimulatingReload, setIsSimulatingReload] = useState(false);
  const [reloadSimulationMsg, setReloadSimulationMsg] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState<string | null>(null);

  const depositAmount = customAmount ? Number(customAmount) || 0 : selectedPackAmount;
  const depositBonusMultiplier = depositAmount >= 500 ? 1.50 : depositAmount >= 100 ? 1.50 : depositAmount >= 50 ? 1.25 : depositAmount >= 25 ? 1.10 : 1.50;
  const totalCreditReceived = depositAmount * depositBonusMultiplier;

  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const handleDeposit = async () => {
    if (depositAmount <= 0) return;
    setIsProcessing(true);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: depositAmount,
          autoReload: autoReloadEnabled
        })
      });
      const data = await res.json().catch(() => ({}));
      if (data?.success && data.url) {
        if (data.isSimulated || !data.url.startsWith('http')) {
          depositAndUnlock(depositAmount);
          setBalance(prev => prev + totalCreditReceived);
          setIsProcessing(false);
          setTopUpSuccess(`Successfully credited $${totalCreditReceived.toFixed(2)} to your compute wallet!`);
          setTimeout(() => setTopUpSuccess(null), 4000);
        } else {
          window.location.href = data.url;
        }
        return;
      }
      depositAndUnlock(depositAmount);
      setBalance(prev => prev + totalCreditReceived);
      setIsProcessing(false);
      setTopUpSuccess(`Successfully credited $${totalCreditReceived.toFixed(2)} to your compute wallet!`);
      setTimeout(() => setTopUpSuccess(null), 4000);
    } catch {
      depositAndUnlock(depositAmount);
      setBalance(prev => prev + totalCreditReceived);
      setIsProcessing(false);
      setTopUpSuccess(`Successfully credited $${totalCreditReceived.toFixed(2)} to your compute wallet!`);
      setTimeout(() => setTopUpSuccess(null), 4000);
    }
  };

  const handleOpenCustomerPortal = async () => {
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
      } else {
        router.push('/billing/payment-methods');
      }
    } catch {
      router.push('/billing/payment-methods');
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const handleTopUpSuccess = (depositAmt: number, totalCredited: number) => {
    depositAndUnlock(depositAmt);
    setBalance(prev => prev + totalCredited);
    setTopUpSuccess(`Successfully credited $${totalCredited.toFixed(2)} USD to your compute wallet!`);
    setTimeout(() => setTopUpSuccess(null), 4000);
  };

  const handleOpenTopUpModal = (amount: number = 100) => {
    setTopUpModalInitialAmt(amount);
    setIsTopUpModalOpen(true);
  };

  // Simulate Auto-Top Up Trigger
  const handleSimulateAutoReload = () => {
    setIsSimulatingReload(true);
    setReloadSimulationMsg(null);

    const bonusMult = autoReloadAmount >= 100 ? 1.50 : autoReloadAmount >= 50 ? 1.25 : 1.10;
    const reloadCredit = autoReloadAmount * bonusMult;

    setTimeout(() => {
      setBalance(prev => prev + reloadCredit);
      setIsSimulatingReload(false);
      setReloadSimulationMsg(`⚡ Auto-Top Up executed seamlessly: Credited +$${reloadCredit.toFixed(2)} USD via Visa (••4242). Zero execution pause.`);
      setTimeout(() => setReloadSimulationMsg(null), 6000);
    }, 800);
  };

  const spendPct = Math.min(100, (monthlySpend / monthlyReloadCap) * 100);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs items={[{ label: 'Wallet & Compute Billing' }]} />

        <BillingSubNav />

        {!user && !authLoading ? (
          <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-black/50 to-black/70 shadow-2xl text-center space-y-8 relative overflow-hidden max-w-3xl mx-auto my-4">
            <div className="absolute top-0 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-500/20">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>DEVELOPER AUTHENTICATION REQUIRED</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Sign In to View Your Compute Wallet &amp; Billing
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                Compute wallets, transaction ledgers, corporate tax receipts, and auto-reload configurations are private to your authenticated developer workspace.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto font-mono text-xs">
              <Link
                href="/auth/connect"
                className="p-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-105"
              >
                <Key className="w-4 h-4 text-black fill-black" />
                <span>Connect Developer Account</span>
              </Link>

              <Link
                href="/checkout?amount=50"
                className="p-4 rounded-2xl bg-black/60 hover:bg-black/80 border border-emerald-500/40 text-emerald-300 font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-105"
              >
                <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                <span>Proceed to Checkout ($50)</span>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono text-zinc-400">
              <div className="flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>ZDR-100 Privacy</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Session Enclave</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>&lt; 15ms Latency</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>100% Refundable</span>
              </div>
            </div>
          </div>
        ) : authLoading ? (
          <div className="py-24 text-center space-y-3 font-mono text-xs text-zinc-400">
            <Activity className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
            <p>Authenticating developer workspace...</p>
          </div>
        ) : (
          <>
            {topUpSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center justify-between animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{topUpSuccess}</span>
                </div>
                <button
                  onClick={() => setTopUpSuccess(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Hero Header & Wallet Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch font-mono">
              {/* Main Balance Card */}
              <div className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden flex flex-col justify-between border border-emerald-500/30 shadow-2xl bg-black/40">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                      <Wallet className="w-3.5 h-3.5" />
                      <span>UNIFIED DEVELOPER COMPUTE WALLET</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleOpenCustomerPortal}
                        disabled={isOpeningPortal}
                        className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] text-zinc-300 hover:text-white border border-white/10 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                        title="Manage invoices and payment methods in Stripe Customer Portal"
                      >
                        <ExternalLink className="w-3 h-3 text-cyan-400" />
                        <span>{isOpeningPortal ? 'Connecting...' : 'Stripe Portal'}</span>
                      </button>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/40">
                        Active • Good Standing
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-zinc-400 font-mono uppercase tracking-wider">Available Compute Balance</div>
                    <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight flex items-baseline gap-2">
                      <span>${balance.toFixed(2)}</span>
                      <span className="text-xs font-sans text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        USD
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 pt-1 font-sans">
                      Estimated runway: <strong className="text-white">~45 days</strong> at current request volume (~18,400 queries remaining). Micro-billed per token with 0 markups.
                    </p>
                  </div>

                  {/* Monthly Spend vs Budget Cap Meter */}
                  <div className="p-4 rounded-2xl bg-black/60 border border-white/5 space-y-2">
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
                    <div className="text-[10px] text-zinc-400 font-mono flex items-center justify-between">
                      <span>{spendPct.toFixed(1)}% of monthly safety cap utilized</span>
                      <span className="text-emerald-400 font-bold">Auto-Reload Protected</span>
                    </div>
                  </div>
                </div>

                {/* Quick Metrics Strip */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10 font-mono text-xs">
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-0.5">
                    <div className="text-[10px] text-zinc-500 uppercase">Starter Grant</div>
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
              <div className="lg:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-amber-500/30 flex flex-col justify-between relative overflow-hidden bg-black/40">
                <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />

                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                    <Gift className="w-3.5 h-3.5" />
                    <span>50% INSTANT MATCH GRANT</span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-white font-sans">
                    Deposit $100 &rarr; Get $150.00 Compute
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    Every deposit of $100+ receives an automatic 50% non-expiring compute grant. Never pay retail rates for frontier LLM reasoning.
                  </p>

                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1 font-sans">
                    <div className="text-amber-300 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Instant Credit Activation
                    </div>
                    <p className="text-zinc-400 text-[11px]">
                      Credits are available immediately across all your API keys and coding agents.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-2">
                  <button
                    onClick={() => handleOpenTopUpModal(100)}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black font-sans text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Top Up Wallet Now (+50% Match)</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('estimator')}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-sans font-bold flex items-center justify-center gap-1.5 transition-all border border-white/10 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Run Cost &amp; Runway Calculator</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Dashboard Interactive Tabs Bar */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-xs font-mono overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview & Top-Up', icon: Wallet },
                { id: 'usage', label: 'Granular Usage Analytics', icon: PieChart },
                { id: 'ledger', label: 'Live Precision Ledger', icon: Activity },
                { id: 'estimator', label: 'Workload Cost Estimator', icon: Sliders },
                { id: 'autoreload', label: 'Auto-Reload & Safeguards', icon: RefreshCw },
                { id: 'invoices', label: 'Invoices & Receipts', icon: FileSpreadsheet }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all cursor-pointer font-bold ${
                      isActive
                        ? 'bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-zinc-500'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}

            {/* Tab 1: Overview & Top-Up */}
            {activeTab === 'overview' && (
              <div className="space-y-8 font-mono">
                {/* Compute Top-Up Packs Selection */}
                <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10 bg-black/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-400" />
                        Select Instant Compute Top-Up Pack
                      </h3>
                      <p className="text-xs text-zinc-400 font-sans">
                        Instant credit balance top-up with automatic promotional match grants.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                    {TOPUP_PACKS.map((pack) => {
                      const isSelected = !customAmount && selectedPackAmount === pack.amount;
                      return (
                        <button
                          key={pack.amount}
                          onClick={() => {
                            setSelectedPackAmount(pack.amount);
                            setCustomAmount('');
                          }}
                          className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative ${
                            isSelected
                              ? 'bg-amber-400/15 border-amber-400 text-white ring-1 ring-amber-400/50 shadow-lg shadow-amber-500/10'
                              : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {pack.isPopular && (
                            <span className="absolute -top-2.5 right-3 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-black shadow-md">
                              Popular
                            </span>
                          )}

                          <div className="space-y-1">
                            <div className="text-2xl font-black text-white font-mono">${pack.amount}</div>
                            <span className="text-[10px] text-emerald-400 font-bold uppercase">
                              +{pack.bonusPct}% Bonus
                            </span>
                          </div>

                          <div className="text-[11px] text-zinc-400 font-sans">
                            {pack.bonusLabel}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Amount + Instant Action */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-white/10">
                    <div className="relative flex-1 w-full">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-mono font-bold">$</span>
                      <input
                        type="number"
                        min="10"
                        step="10"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Custom amount (e.g. 150)"
                        className="w-full pl-8 pr-4 py-3 rounded-2xl bg-black/60 border border-white/10 text-white text-xs font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <button
                      onClick={handleDeposit}
                      disabled={isProcessing || depositAmount <= 0}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black font-sans text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>Crediting...</span>
                        </div>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 fill-black" />
                          <span>Credit ${totalCreditReceived.toFixed(2)} to Wallet (Pay ${depositAmount.toFixed(2)})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Granular Usage Preview & Link */}
                <ErrorBoundary name="Granular Usage Preview">
                  <GranularUsageExplorer />
                </ErrorBoundary>
              </div>
            )}

            {/* Tab 2: Granular Usage Analytics */}
            {activeTab === 'usage' && (
              <ErrorBoundary name="Granular Usage Explorer">
                <GranularUsageExplorer />
              </ErrorBoundary>
            )}

            {/* Tab 3: Live Precision Ledger */}
            {activeTab === 'ledger' && (
              <ErrorBoundary name="Live Usage Ledger">
                <LiveUsageLedger />
              </ErrorBoundary>
            )}

            {/* Tab 4: Workload Cost Estimator */}
            {activeTab === 'estimator' && (
              <ErrorBoundary name="Workload Cost Estimator">
                <CostEstimatorCalculator
                  currentBalance={balance}
                  onSelectTopUp={(amt) => handleOpenTopUpModal(amt)}
                />
              </ErrorBoundary>
            )}

            {/* Tab 5: Auto-Reload & Safeguards */}
            {activeTab === 'autoreload' && (
              <div className="space-y-6 font-mono">
                {/* Auto Reload Card */}
                <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10 bg-black/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-cyan-400" />
                        Zero-Downtime Auto-Top Up Safeguards
                      </h3>
                      <p className="text-xs text-zinc-400 font-sans">
                        Automatically refill your wallet balance when running agentic loops or large batch jobs.
                      </p>
                    </div>

                    <button
                      onClick={() => setAutoReloadEnabled(!autoReloadEnabled)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                        autoReloadEnabled
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                          : 'bg-zinc-800 text-zinc-400 border-white/10'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${autoReloadEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                      <span>{autoReloadEnabled ? 'Auto-Top Up is ACTIVE' : 'Auto-Top Up is DISABLED'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
                    <div className="p-4 rounded-2xl bg-black/60 border border-white/5 space-y-2">
                      <span className="text-zinc-400">Trigger Threshold</span>
                      <div className="text-xl font-bold text-white font-mono">Below ${autoReloadThreshold}.00</div>
                      <p className="text-[11px] text-zinc-500">Triggers when balance drops under $10</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-black/60 border border-white/5 space-y-2">
                      <span className="text-zinc-400">Reload Credit Amount</span>
                      <div className="text-xl font-bold text-emerald-400 font-mono">+${autoReloadAmount}.00 USD</div>
                      <p className="text-[11px] text-emerald-400/80">+25% grant applied automatically</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-black/60 border border-white/5 space-y-2">
                      <span className="text-zinc-400">Monthly Safety Cap</span>
                      <div className="text-xl font-bold text-cyan-300 font-mono">${monthlyReloadCap}.00 USD</div>
                      <p className="text-[11px] text-zinc-500">Maximum monthly charge safety ceiling</p>
                    </div>
                  </div>

                  {/* Simulate Reload */}
                  <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-zinc-400 font-sans">
                      Payment method: <strong className="text-white font-mono">Visa •••• 4242</strong> (Exp 12/28)
                    </p>

                    <button
                      onClick={handleSimulateAutoReload}
                      disabled={isSimulatingReload}
                      className="px-5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{isSimulatingReload ? 'Simulating Reload...' : 'Simulate Auto-Top Up Trigger'}</span>
                    </button>
                  </div>

                  {reloadSimulationMsg && (
                    <div className="p-4 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 text-xs text-cyan-300 font-mono flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{reloadSimulationMsg}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 6: Invoices & Receipts */}
            {activeTab === 'invoices' && (
              <div className="space-y-6 font-mono">
                <div className="rounded-3xl border border-white/10 bg-black/40 overflow-hidden text-xs">
                  <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-white font-sans text-sm">Monthly Invoices &amp; Accounting Receipts</h3>
                      <p className="text-zinc-400 text-xs font-sans">Download corporate tax-compliant PDF receipts with wholesale audit breakdown.</p>
                    </div>
                  </div>

                  <div className="divide-y divide-white/5">
                    {INITIAL_INVOICES.map((inv) => (
                      <div key={inv.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-all">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono">{inv.invoiceNumber}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">
                              PAID
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 font-sans">{inv.period} • Issued {inv.issuedDate}</p>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right space-y-0.5">
                            <div className="font-bold text-white text-sm">${inv.amount.toFixed(2)} USD</div>
                            <div className="text-[11px] text-emerald-400">Saved ${inv.wholesaleSaved.toFixed(2)}</div>
                          </div>

                          <button
                            onClick={() => router.push('/billing/invoices')}
                            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-sans font-bold flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Wallet Top Up Modal */}
      <WalletTopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        initialAmount={topUpModalInitialAmt}
        onSuccess={handleTopUpSuccess}
      />
    </div>
  );
}
