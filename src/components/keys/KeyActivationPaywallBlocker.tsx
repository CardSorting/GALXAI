'use client';

import React, { useState } from 'react';
import {
  Gift,
  Key,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
  CreditCard,
  Lock,
  Coins,
  CheckCircle2,
  Cpu,
  Bot,
  Laptop,
  Flame,
  HelpCircle,
  ChevronDown,
  Info
} from 'lucide-react';

interface Pack {
  amount: number;
  label: string;
  badge: string;
  popular?: boolean;
  bonusMultiplier: number;
}

const DEPOSIT_PACKS: Pack[] = [
  { amount: 10, label: 'Starter Key', badge: '50% Instant Match', popular: true, bonusMultiplier: 1.5 },
  { amount: 25, label: 'Standard Dev', badge: '+$5.00 Free Match', bonusMultiplier: 1.2 },
  { amount: 50, label: 'Growth Pro', badge: '+5% Extra Bonus', bonusMultiplier: 1.15 },
  { amount: 100, label: 'Fleet Scale', badge: '+10% Extra Bonus', bonusMultiplier: 1.25 }
];

interface KeyActivationPaywallBlockerProps {
  onOpenPaywallModal: (selectedAmt?: number) => void;
  onInstantDeposit: (amount: number) => void;
  isDepositing?: boolean;
  depositSuccessMsg?: string | null;
}

export function KeyActivationPaywallBlocker({
  onOpenPaywallModal,
  onInstantDeposit,
  isDepositing = false,
  depositSuccessMsg = null
}: KeyActivationPaywallBlockerProps) {
  const [selectedPackAmt, setSelectedPackAmt] = useState<number>(10);
  const [showFaq, setShowFaq] = useState(false);

  const currentPack = DEPOSIT_PACKS.find(p => p.amount === selectedPackAmt) || DEPOSIT_PACKS[0];
  const welcomeBonus = 5.0; // The $5 introductory grant
  const tierBonus = selectedPackAmt >= 100 ? selectedPackAmt * 0.1 : selectedPackAmt >= 50 ? selectedPackAmt * 0.05 : 0;
  const totalBalanceReceived = selectedPackAmt + welcomeBonus + tierBonus;

  // Compute live token mileage metrics for non-technical users
  const estimatedTokensSol = Math.round((totalBalanceReceived / 3.75) * 1000000);
  const estimatedTokensGrok = Math.round((totalBalanceReceived / 1.80) * 1000000);
  const estimatedImages = Math.round(totalBalanceReceived / 0.02);

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/30 space-y-6 relative overflow-hidden shadow-2xl bg-gradient-to-b from-amber-500/10 via-black/40 to-black/60">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-to-b from-amber-500/15 via-orange-500/10 to-transparent rounded-full blur-[120px] pointer-events-none" />

      {/* Header Banner with High-Converting Match Ribbon */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold shadow-lg shadow-amber-500/10">
            <Gift className="w-3.5 h-3.5 text-amber-400" />
            <span>50% INSTANT DEPOSIT MATCH • $5 FREE COMPUTE GRANT</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Deposit $10 to Unlock Your Key & Claim $5 Free Compute
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
            Every new developer key receives an instant <strong className="text-amber-300 font-bold">$5.00 Free Compute Match</strong> upon completing their first refundable compute deposit of <strong>$10.00 USD</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenPaywallModal(selectedPackAmt)}
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider font-mono shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 hover:scale-[1.02] active:scale-98"
        >
          <Key className="w-4 h-4 text-black" />
          <span>Unlock Key ($15 Credit)</span>
          <ArrowRight className="w-4 h-4 text-black" />
        </button>
      </div>

      {depositSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{depositSuccessMsg}</span>
        </div>
      )}

      {/* Interactive Value Equation Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center relative z-10">
        {/* Deposit Equation Breakdown */}
        <div className="md:col-span-7 grid grid-cols-3 gap-2 font-mono text-center">
          <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase font-sans font-semibold">1. Your Deposit</span>
            <div className="text-xl sm:text-2xl font-black text-white">${selectedPackAmt.toFixed(2)}</div>
            <span className="text-[10px] text-zinc-500 font-sans">100% Usable Balance</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 space-y-1 relative overflow-hidden">
            <span className="text-[10px] text-emerald-400 uppercase font-sans font-bold flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              2. Free Grant
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-300">+${(welcomeBonus + tierBonus).toFixed(2)}</div>
            <span className="text-[10px] text-emerald-400/90 font-sans font-semibold">50% Match Bonus</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 space-y-1 relative overflow-hidden">
            <span className="text-[10px] text-amber-400 uppercase font-sans font-bold flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              3. You Get
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-300">${totalBalanceReceived.toFixed(2)}</div>
            <span className="text-[10px] text-amber-400/90 font-sans font-semibold">Total Compute Credit</span>
          </div>
        </div>

        {/* Live Token Mileage Estimator for Non-Technical Users */}
        <div className="md:col-span-5 p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-sans font-semibold text-[11px] text-white flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              What ${totalBalanceReceived.toFixed(2)} Gets You:
            </span>
            <span className="text-emerald-400 text-[10px] font-bold">25%–40% OFF</span>
          </div>

          <div className="space-y-1.5 pt-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">GPT-5.6 Sol Reasoning:</span>
              <strong className="text-white font-bold">~{(estimatedTokensSol / 1000000).toFixed(1)}M Tokens</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">xAI Grok 4.5 Fast Fleet:</span>
              <strong className="text-cyan-300 font-bold">~{(estimatedTokensGrok / 1000000).toFixed(1)}M Tokens</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Visual Image Synthesis:</span>
              <strong className="text-amber-300 font-bold">~{estimatedImages} Renders</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Packs Grid */}
      <div className="space-y-2 relative z-10">
        <label className="block text-xs font-mono font-bold text-zinc-300 uppercase">
          Select Starter Pack (1-Click Instant Activation)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DEPOSIT_PACKS.map((pack) => {
            const isSelected = selectedPackAmt === pack.amount;
            const packBonus = 5.0 + (pack.amount >= 100 ? pack.amount * 0.1 : pack.amount >= 50 ? pack.amount * 0.05 : 0);
            const total = pack.amount + packBonus;

            return (
              <button
                key={pack.amount}
                type="button"
                onClick={() => setSelectedPackAmt(pack.amount)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/15 scale-[1.02]'
                    : 'bg-black/50 border-white/10 hover:border-white/20'
                }`}
              >
                {pack.badge && (
                  <span className="text-[9px] font-mono font-bold uppercase tracking-tight text-amber-300 block mb-1">
                    {pack.badge}
                  </span>
                )}
                <div className="font-mono text-lg font-black text-white">${pack.amount}</div>
                <div className="text-xs text-emerald-400 font-mono font-bold mt-1">
                  → ${total.toFixed(2)} USD Credit
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Footer & Trust Signals */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-white/10 relative z-10">
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-400 font-mono">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Refundable Deposit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-cyan-400" />
            <span>$0 Platform Fees</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Instant Bearer Key Minting</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onInstantDeposit(selectedPackAmt)}
            disabled={isDepositing}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {isDepositing ? 'Processing Deposit...' : `Quick Deposit $${selectedPackAmt}`}
          </button>

          <button
            type="button"
            onClick={() => onOpenPaywallModal(selectedPackAmt)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black text-xs font-black uppercase tracking-wider font-mono shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            Pay with Card / Crypto →
          </button>
        </div>
      </div>

      {/* Non-Technical In-Blocker FAQ Accordion */}
      <div className="pt-2 border-t border-white/5 relative z-10">
        <button
          type="button"
          onClick={() => setShowFaq(!showFaq)}
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 cursor-pointer font-mono"
        >
          <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
          <span>Why is a $10 deposit required for the $5 compute grant?</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showFaq ? 'rotate-180' : ''}`} />
        </button>

        {showFaq && (
          <div className="mt-3 p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-xs text-zinc-300 leading-relaxed font-sans animate-in fade-in duration-200">
            <p>
              <strong>1. Anti-Bot Sybil Protection:</strong> We provide unthrottled access to expensive frontier models (GPT-5.6 Sol, xAI Grok 4.5). The $10 deposit stops automated bot farms from spamming free keys while giving 100% of your funds back as usable tokens.
            </p>
            <p>
              <strong>2. 100% Usable Balance:</strong> Zero dollars are kept as a "membership" or "platform fee". Every cent is credited directly to your token balance with sub-cent microsecond billing.
            </p>
            <p>
              <strong>3. Automated 1-Click Refunds:</strong> If you test GALXAI and decide not to proceed, you can request an instant 1-click refund on unspent deposited balances directly from the Billing tab.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
