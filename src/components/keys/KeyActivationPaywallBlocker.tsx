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
  Info,
  Layers,
  Code2,
  Terminal,
  Server,
  MessageSquare,
  Image as ImageIcon,
  TrendingDown,
  Check
} from 'lucide-react';
import { TierUnlockProgressBar } from '@/components/dashboard/TierUnlockProgressBar';

interface Pack {
  amount: number;
  label: string;
  badge: string;
  popular?: boolean;
  bonusMultiplier: number;
  rpm: number;
  perks: string[];
}

const DEPOSIT_PACKS: Pack[] = [
  {
    amount: 25,
    label: 'Starter Builder',
    badge: '50% Instant Match',
    bonusMultiplier: 1.5,
    rpm: 120,
    perks: ['50% Match Bonus ($12.50)', '$5 Welcome Grant', '120 RPM Ceiling', '75% Prompt Caching']
  },
  {
    amount: 50,
    label: 'Growth VIP',
    badge: 'VIP Fast-Lane 🔓',
    popular: true,
    bonusMultiplier: 1.6,
    rpm: 300,
    perks: ['60% Match Bonus ($30.00)', 'Sub-15ms VIP Anycast Lane', '300 RPM Ceiling', 'Priority Queue Jump']
  },
  {
    amount: 100,
    label: 'Scale Fleet',
    badge: '600 RPM Fleet 🔓',
    bonusMultiplier: 1.75,
    rpm: 600,
    perks: ['75% Match Bonus ($75.00)', '600 RPM Concurrency Burst', 'Multi-Agent Swarm Pass', 'Anycast Multi-Cloud Failover']
  },
  {
    amount: 250,
    label: 'Enterprise Sovereign',
    badge: '100% Double Match 🔓',
    bonusMultiplier: 2.0,
    rpm: 1200,
    perks: ['100% Double Match ($250.00)', 'Unlimited Concurrency', 'Dedicated VPC Private Lane', '1-on-1 Architecture Review']
  }
];

type WorkloadPersona = 'cursor' | 'agent' | 'chat' | 'multimodal';

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
  const [selectedPackAmt, setSelectedPackAmt] = useState<number>(50);
  const [customAmt, setCustomAmt] = useState<string>('');
  const [activePersona, setActivePersona] = useState<WorkloadPersona>('cursor');
  const [showFaq, setShowFaq] = useState(false);

  // Active deposit calculation
  const effectiveDeposit = customAmt && !isNaN(Number(customAmt)) && Number(customAmt) >= 10
    ? Number(customAmt)
    : selectedPackAmt;

  const currentPack = DEPOSIT_PACKS.find(p => p.amount === effectiveDeposit) || {
    amount: effectiveDeposit,
    label: effectiveDeposit >= 250 ? 'Enterprise Sovereign' : effectiveDeposit >= 100 ? 'Scale Fleet' : effectiveDeposit >= 50 ? 'Growth VIP' : 'Starter Builder',
    badge: effectiveDeposit >= 250 ? '100% Double Match' : effectiveDeposit >= 100 ? '75% Match' : effectiveDeposit >= 50 ? '60% Match' : '50% Match',
    bonusMultiplier: effectiveDeposit >= 250 ? 2.0 : effectiveDeposit >= 100 ? 1.75 : effectiveDeposit >= 50 ? 1.6 : 1.5,
    rpm: effectiveDeposit >= 250 ? 1200 : effectiveDeposit >= 100 ? 600 : effectiveDeposit >= 50 ? 300 : 120,
    perks: []
  };

  const welcomeBonus = 5.0; // Instant introductory grant
  const matchMultiplier = currentPack.bonusMultiplier;
  const matchBonus = effectiveDeposit * (matchMultiplier - 1);
  const totalBalanceReceived = effectiveDeposit + welcomeBonus + matchBonus;

  // Workload Mileage Calculations
  const getPersonaMetrics = (balance: number) => {
    switch (activePersona) {
      case 'cursor':
        return {
          title: 'Cursor & Claude Code IDE Completions',
          icon: Laptop,
          primaryMetric: `${Math.round((balance / 0.035) * 10).toLocaleString()}`,
          primaryLabel: 'Intelligent Code Completions',
          secondaryMetric: `${Math.round(balance / 0.08).toLocaleString()}`,
          secondaryLabel: 'Multi-File Refactor Tasks',
          highlight: '75% Prompt Caching Pass-Through Active'
        };
      case 'agent':
        return {
          title: 'Autonomous Swarm & Tool-Call Loops',
          icon: Bot,
          primaryMetric: `${Math.round(balance * 240).toLocaleString()}`,
          primaryLabel: 'Agent Tool-Call Steps',
          secondaryMetric: `${Math.round(balance * 18).toLocaleString()}`,
          secondaryLabel: 'Autonomous Goal Executions',
          highlight: `${currentPack.rpm} RPM High-Concurrency Burst`
        };
      case 'chat':
        return {
          title: 'High-Throughput Production Chatbots',
          icon: MessageSquare,
          primaryMetric: `${Math.round((balance / 0.002) * 10).toLocaleString()}`,
          primaryLabel: 'Customer Support Turns',
          secondaryMetric: `${Math.round(balance * 320).toLocaleString()}k`,
          secondaryLabel: 'Tokens Streamed',
          highlight: 'Sub-15ms Anycast VIP Fast-Lane'
        };
      case 'multimodal':
        return {
          title: 'Multimodal Vision & Visual Synthesis',
          icon: ImageIcon,
          primaryMetric: `${Math.round(balance / 0.02).toLocaleString()}`,
          primaryLabel: 'FLUX / SDXL Image Generations',
          secondaryMetric: `${Math.round(balance * 25).toLocaleString()}M`,
          secondaryLabel: 'Vector Embedding Dimensions',
          highlight: 'Direct Wholesale Liquidity Rates'
        };
    }
  };

  const currentMetrics = getPersonaMetrics(totalBalanceReceived);

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/30 space-y-6 relative overflow-hidden shadow-2xl bg-gradient-to-b from-amber-500/10 via-black/40 to-black/60">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-to-b from-amber-500/15 via-orange-500/10 to-transparent rounded-full blur-[120px] pointer-events-none" />

      {/* Header Banner with High-Converting Match Ribbon */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold shadow-lg shadow-amber-500/10">
            <Gift className="w-3.5 h-3.5 text-amber-400" />
            <span>50%–100% INSTANT MATCH BONUS • $5.00 WELCOME GRANT INCLUDED</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Activate Production Key &amp; Claim Up to 100% Match Bonus
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
            Deposit a 100% refundable compute balance to unlock sub-15ms VIP Anycast routing, up to 1,200 RPM, and an instant match bonus credited directly to your key.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenPaywallModal(effectiveDeposit)}
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider font-mono shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 hover:scale-[1.02] active:scale-98"
        >
          <Key className="w-4 h-4 text-black" />
          <span>Unlock Key (${totalBalanceReceived.toFixed(2)} Credit)</span>
          <ArrowRight className="w-4 h-4 text-black" />
        </button>
      </div>

      {depositSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{depositSuccessMsg}</span>
        </div>
      )}

      {/* Preset Deposit Tier Cards with Custom Input */}
      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono font-bold text-zinc-200 uppercase flex items-center gap-2">
            <span>Select Deposit Tier (Instant Key Unlock):</span>
          </label>
          <span className="text-[11px] font-mono text-amber-300">
            Current Match: +{Math.round((matchMultiplier - 1) * 100)}%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DEPOSIT_PACKS.map((pack) => {
            const isSelected = effectiveDeposit === pack.amount && !customAmt;
            const packBonus = welcomeBonus + (pack.amount * (pack.bonusMultiplier - 1));
            const total = pack.amount + packBonus;

            return (
              <button
                key={pack.amount}
                type="button"
                onClick={() => {
                  setSelectedPackAmt(pack.amount);
                  setCustomAmt('');
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02] ring-1 ring-amber-400/50'
                    : 'bg-black/50 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-tight text-amber-300">
                    {pack.badge}
                  </span>
                  {pack.popular && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-400 text-black font-bold font-mono">
                      POPULAR
                    </span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="font-mono text-xl font-black text-white">${pack.amount}</div>
                  <div className="text-[11px] text-zinc-400 font-sans">{pack.label}</div>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-1 font-mono text-[11px]">
                  <div className="text-emerald-400 font-bold">
                    → ${total.toFixed(2)} Credit
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {pack.rpm} RPM Quota
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Compute Amount Input Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-black/40 border border-white/10 font-mono text-xs">
          <span className="text-zinc-400 text-[11px] flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Or Enter Custom Compute Amount:</span>
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-36">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
              <input
                type="number"
                min="10"
                max="5000"
                step="5"
                placeholder="Custom USD"
                value={customAmt}
                onChange={(e) => setCustomAmt(e.target.value)}
                className="w-full py-1.5 pl-7 pr-3 rounded-xl bg-black/80 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
            {customAmt && Number(customAmt) >= 10 && (
              <span className="text-emerald-400 font-bold text-[11px] whitespace-nowrap">
                → ${totalBalanceReceived.toFixed(2)} Credit
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Interactive 3-Pillar Value Equation Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center relative z-10">
        {/* Deposit Equation Breakdown */}
        <div className="md:col-span-7 grid grid-cols-3 gap-2 font-mono text-center">
          <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase font-sans font-semibold">1. Your Deposit</span>
            <div className="text-xl sm:text-2xl font-black text-white">${effectiveDeposit.toFixed(2)}</div>
            <span className="text-[10px] text-zinc-500 font-sans">100% Usable Balance</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 space-y-1 relative overflow-hidden">
            <span className="text-[10px] text-emerald-400 uppercase font-sans font-bold flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              2. Free Grant
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-300">+${(welcomeBonus + matchBonus).toFixed(2)}</div>
            <span className="text-[10px] text-emerald-400/90 font-sans font-semibold">+{Math.round((matchMultiplier - 1) * 100)}% Match Bonus</span>
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

        {/* Live Workload Mileage Estimator for Developers & Non-Technical Teams */}
        <div className="md:col-span-5 p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3 font-mono text-xs">
          {/* Persona Switcher Chips */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-[10px] text-zinc-400 font-sans uppercase font-bold">Estimated Output:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setActivePersona('cursor')}
                title="Cursor IDE Workload"
                className={`px-2 py-0.5 rounded-md text-[10px] transition-all cursor-pointer ${
                  activePersona === 'cursor' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                IDE
              </button>
              <button
                type="button"
                onClick={() => setActivePersona('agent')}
                title="Agent Swarm Workload"
                className={`px-2 py-0.5 rounded-md text-[10px] transition-all cursor-pointer ${
                  activePersona === 'agent' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Agents
              </button>
              <button
                type="button"
                onClick={() => setActivePersona('chat')}
                title="Chatbot Workload"
                className={`px-2 py-0.5 rounded-md text-[10px] transition-all cursor-pointer ${
                  activePersona === 'chat' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setActivePersona('multimodal')}
                title="Multimodal Visual Workload"
                className={`px-2 py-0.5 rounded-md text-[10px] transition-all cursor-pointer ${
                  activePersona === 'multimodal' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Media
              </button>
            </div>
          </div>

          <div className="space-y-1.5 pt-0.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">{currentMetrics.primaryLabel}:</span>
              <strong className="text-white font-bold">{currentMetrics.primaryMetric}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">{currentMetrics.secondaryLabel}:</span>
              <strong className="text-cyan-300 font-bold">{currentMetrics.secondaryMetric}</strong>
            </div>
            <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px]">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>{currentMetrics.highlight}</span>
              </span>
              <span className="text-zinc-500">Zero Retail Markup</span>
            </div>
          </div>
        </div>
      </div>

      {/* E-Commerce Reward Tier Progress Bar */}
      <TierUnlockProgressBar
        currentAmount={effectiveDeposit}
        onSelectTierAmount={(amt) => {
          setSelectedPackAmt(amt);
          setCustomAmt('');
        }}
      />

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
            onClick={() => onInstantDeposit(effectiveDeposit)}
            disabled={isDepositing}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {isDepositing ? 'Processing...' : `Quick Unlock $${effectiveDeposit}`}
          </button>

          <button
            type="button"
            onClick={() => onOpenPaywallModal(effectiveDeposit)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black text-xs font-black uppercase tracking-wider font-mono shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Pay with Stripe / Card</span>
            <ArrowRight className="w-3.5 h-3.5" />
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
          <span>Why is a refundable deposit required for VIP fast-lane routing?</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showFaq ? 'rotate-180' : ''}`} />
        </button>

        {showFaq && (
          <div className="mt-3 p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-xs text-zinc-300 leading-relaxed font-sans animate-in fade-in duration-200">
            <p>
              <strong>1. Anti-Bot Sybil Protection:</strong> We provide unthrottled access to expensive frontier models (GPT-5.6 Sol, Terra, Luna). The initial refundable deposit stops automated bot farms from scraping free keys while giving 100% of your funds back as usable tokens.
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
