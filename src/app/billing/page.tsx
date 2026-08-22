'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
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
  Play
} from 'lucide-react';

interface TopUpPack {
  amount: number;
  bonusPct: number;
  bonusLabel: string;
  isPopular?: boolean;
}

const TOPUP_PACKS: TopUpPack[] = [
  { amount: 10, bonusPct: 0, bonusLabel: 'Starter Activation ($10.00)' },
  { amount: 25, bonusPct: 0, bonusLabel: 'Standard Prototyping ($25.00)' },
  { amount: 50, bonusPct: 5, bonusLabel: '+5% Bonus ($52.50 Credit)' },
  { amount: 100, bonusPct: 10, bonusLabel: '+10% Bonus ($110.00 Credit)', isPopular: true },
  { amount: 500, bonusPct: 20, bonusLabel: '+20% Bonus ($600.00 Credit)' }
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
  const [balance, setBalance] = useState(114.59);
  const [welcomeCreditRemaining] = useState(4.65);
  const [lifetimeSaved] = useState(38.40);
  const [selectedPackAmount, setSelectedPackAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');

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

  const selectedPack = TOPUP_PACKS.find(p => p.amount === selectedPackAmount);
  const depositAmount = customAmount ? Number(customAmount) || 0 : selectedPackAmount;
  const depositBonusMultiplier = depositAmount >= 500 ? 1.20 : depositAmount >= 100 ? 1.10 : depositAmount >= 50 ? 1.05 : 1.0;
  const totalCreditReceived = depositAmount * depositBonusMultiplier;

  const handleDeposit = () => {
    if (depositAmount <= 0) return;
    setIsProcessing(true);

    setTimeout(() => {
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs items={[{ label: 'Wallet & Compute Balance' }]} />

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

            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-4">
              <div className="text-right font-mono text-xs">
                <div className="text-zinc-400">Total Credit Added:</div>
                <div className="text-base font-black text-emerald-300">${totalCreditReceived.toFixed(2)} USD</div>
              </div>

              <button
                onClick={handleDeposit}
                disabled={isProcessing || depositAmount <= 0}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Crediting Wallet...</span>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-black" />
                    <span>Pay ${depositAmount.toFixed(2)} & Top Up</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
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

        {/* Real-Time Micro-Billing Ledger & Spend History */}
        <div className="glass-panel rounded-3xl p-6 overflow-x-auto space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-400" />
              Real-Time Micro-Billing Ledger
            </h2>
            <span className="text-[11px] text-zinc-400 font-mono">Microsecond precision deductions</span>
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
              {transactions.map((tx) => {
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
      </main>
    </div>
  );
}
