'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Key,
  CreditCard,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Lock,
  X,
  ArrowRight,
  Gift,
  Coins,
  ShieldAlert,
  Flame,
  Wallet,
  Cpu,
  HelpCircle,
  ChevronDown,
  Check,
  Copy,
  Terminal,
  Layers,
  Bot,
  Building2,
  ExternalLink,
  Receipt,
  QrCode
} from 'lucide-react';
import { TierUnlockProgressBar } from '@/components/dashboard/TierUnlockProgressBar';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface PaywallPack {
  amount: number;
  label: string;
  tierBonusPct: number;
  badge?: string;
  popular?: boolean;
  multiplier: number;
  highlight: string;
}

const PAYWALL_PACKS: PaywallPack[] = [
  { amount: 25, label: 'Starter Builder', tierBonusPct: 50, badge: '50% Instant Match', popular: true, multiplier: 1.5, highlight: '120 RPM • 75% Prompt Caching' },
  { amount: 50, label: 'Growth VIP', tierBonusPct: 60, badge: 'VIP Fast-Lane 🔓', multiplier: 1.6, highlight: '300 RPM • Sub-15ms VIP Anycast' },
  { amount: 100, label: 'Scale Fleet', tierBonusPct: 75, badge: '600 RPM Fleet 🔓', multiplier: 1.75, highlight: '600 RPM • Concurrency Burst Pass' },
  { amount: 250, label: 'Enterprise Sovereign', tierBonusPct: 100, badge: '100% Double Match 🔓', multiplier: 2.0, highlight: 'Unlimited Concurrency • Custom VPC' }
];

interface KeyActivationPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amount: number, totalCredit: number) => void;
  keyLabel?: string;
  initialAmount?: number;
}

export function KeyActivationPaywallModal({
  isOpen,
  onClose,
  onSuccess,
  keyLabel = 'Developer Gateway Key',
  initialAmount = 25
}: KeyActivationPaywallModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(initialAmount);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [activePersona, setActivePersona] = useState<'cursor' | 'agent' | 'chat' | 'multimodal'>('cursor');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'stripe' | 'crypto'>('card');
  const [autoReload, setAutoReload] = useState(true);
  const [cryptoNetwork, setCryptoNetwork] = useState<'base' | 'arbitrum' | 'solana' | 'polygon'>('base');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExp, setCardExp] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [cardName, setCardName] = useState('Alex Developer');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activationStep, setActivationStep] = useState<number>(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const currentAmt = customAmount ? Math.max(10, parseFloat(customAmount) || 25) : selectedAmount;
  const currentPack = PAYWALL_PACKS.find(p => p.amount === currentAmt) || {
    amount: currentAmt,
    label: 'Custom Tier',
    tierBonusPct: currentAmt >= 250 ? 100 : currentAmt >= 100 ? 75 : currentAmt >= 50 ? 60 : 50,
    multiplier: currentAmt >= 250 ? 2.0 : currentAmt >= 100 ? 1.75 : currentAmt >= 50 ? 1.6 : 1.5,
    highlight: 'Standard High-Speed Anycast Routing'
  };
  const welcomeBonus = 5.0; // Instant introductory compute grant
  const tierBonus = currentAmt * (currentPack.tierBonusPct / 100);
  const totalCreditReceived = currentAmt + welcomeBonus + tierBonus;

  // Persona-based metrics calculation
  const getModalMetrics = () => {
    switch (activePersona) {
      case 'cursor':
        return [
          { label: 'Code Completions', val: `~${Math.round((totalCreditReceived / 0.035) * 10).toLocaleString()}` },
          { label: 'Refactor Tasks', val: `~${Math.round(totalCreditReceived / 0.08).toLocaleString()}` },
          { label: 'Cache Rebate', val: '75% Active' }
        ];
      case 'agent':
        return [
          { label: 'Tool Steps', val: `~${Math.round(totalCreditReceived * 240).toLocaleString()}` },
          { label: 'Goal Executions', val: `~${Math.round(totalCreditReceived * 18).toLocaleString()}` },
          { label: 'Throughput', val: `${currentAmt >= 250 ? '1,200' : currentAmt >= 100 ? '600' : currentAmt >= 50 ? '300' : '120'} RPM` }
        ];
      case 'chat':
        return [
          { label: 'Chat Turns', val: `~${Math.round((totalCreditReceived / 0.002) * 10).toLocaleString()}` },
          { label: 'Tokens Streamed', val: `~${Math.round(totalCreditReceived * 320).toLocaleString()}k` },
          { label: 'Anycast Latency', val: '< 15ms' }
        ];
      case 'multimodal':
        return [
          { label: 'Image Renders', val: `~${Math.round(totalCreditReceived / 0.02).toLocaleString()}` },
          { label: 'Embedding Dims', val: `~${Math.round(totalCreditReceived * 25).toLocaleString()}M` },
          { label: 'Wholesale Discount', val: '25%–40%' }
        ];
    }
  };

  const handleStripeCheckoutRedirect = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: currentAmt,
          autoReload: autoReload,
          successUrl: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&amount=${currentAmt}&total=${totalCreditReceived}&tier=${encodeURIComponent(currentPack.label)}&source=key_activation`,
          cancelUrl: `${window.location.origin}/keys?canceled=true`
        })
      });
      const data = await res.json().catch(() => ({}));
      if (data?.success && data.url) {
        window.location.href = data.url;
      } else {
        handlePayAndUnlock();
      }
    } catch {
      handlePayAndUnlock();
    }
  };

  const handlePayAndUnlock = () => {
    if (paymentMethod === 'stripe') {
      handleStripeCheckoutRedirect();
      return;
    }

    setIsProcessing(true);
    setActivationStep(1); // 1: Authorizing payment
    setTimeout(() => {
      setActivationStep(2); // 2: Applying match grant
      setTimeout(() => {
        setActivationStep(3); // 3: Minting key
        setTimeout(() => {
          setIsProcessing(false);
          onSuccess(currentAmt, totalCreditReceived);
          setActivationStep(0);
        }, 800);
      }, 700);
    }, 700);
  };

  const faqItems = [
    {
      q: 'How does the 50%–100% Match Bonus work?',
      a: 'When you activate a compute tier, we immediately credit your wallet with your full deposit plus a guaranteed promotional match grant (e.g. deposit $25, receive $37.50 + $5 welcome bonus = $42.50 total compute credit).'
    },
    {
      q: 'Can I get a refund on unspent balances?',
      a: 'Yes. 100% of any unspent deposited funds can be refunded back to your original payment method at any time with 1 click from the Billing settings.'
    },
    {
      q: 'Do compute credits or match bonuses expire?',
      a: 'Never. All deposited balances and match credits remain active in your workspace wallet indefinitely.'
    },
    {
      q: 'Can I use this single key across Cursor, Windsurf, Python, and Claude Code?',
      a: 'Yes. GALXAI keys are universal OpenAI/Anthropic drop-in tokens. Simply point your base URL to https://galx.ai/v1.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl glass-panel border border-amber-500/40 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 overflow-hidden max-h-[94vh] overflow-y-auto bg-gradient-to-b from-zinc-950 via-[#07080d] to-black">
        {/* Glow ambient accent */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer transition-colors z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {isProcessing || activationStep > 0 ? (
          <div className="py-12 text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
              <div className="absolute inset-2 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Key className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-2 max-w-sm mx-auto">
              <h3 className="text-xl font-black text-white">
                {activationStep === 1 && 'Authorizing Deposit...'}
                {activationStep === 2 && 'Applying Match Bonus...'}
                {activationStep === 3 && 'Minting Dedicated Bearer Key...'}
              </h3>
              <p className="text-xs text-amber-300/90 font-mono">
                {activationStep === 1 && `Charging $${currentAmt.toFixed(2)} USD via ${paymentMethod.toUpperCase()}`}
                {activationStep === 2 && `Crediting +$${totalCreditReceived.toFixed(2)} total balance to wallet`}
                {activationStep === 3 && `Provisioning ${keyLabel}`}
              </p>
            </div>

            <div className="w-64 h-2 rounded-full bg-white/10 mx-auto overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${activationStep * 33.3}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Header & GTM Badge */}
            <div className="space-y-2 text-center relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold shadow-md shadow-amber-500/10">
                <Gift className="w-3.5 h-3.5 text-amber-400" />
                <span>UP TO 100% MATCH • $5.00 WELCOME GRANT INCLUDED</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Activate {currentPack.label} (${currentAmt})
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-lg mx-auto leading-relaxed">
                Deposit <strong className="text-white">${currentAmt.toFixed(2)} USD</strong> to unlock your universal key with <strong className="text-emerald-300">+{currentPack.tierBonusPct}% Match Bonus</strong> (${totalCreditReceived.toFixed(2)} Total Usable Credits). 100% refundable with $0 platform fees.
              </p>
            </div>

            {/* Value Exchange Visualizer Strip */}
            <div className="p-4 rounded-2xl bg-black/60 border border-amber-500/30 grid grid-cols-3 gap-2 font-mono text-center relative z-10">
              <div className="p-2.5 sm:p-3 rounded-xl bg-white/5 space-y-0.5">
                <span className="text-[10px] text-zinc-400 uppercase font-sans font-semibold">1. Your Deposit</span>
                <div className="text-base sm:text-xl font-black text-white">${currentAmt.toFixed(2)}</div>
                <span className="text-[10px] text-zinc-500 font-sans">100% Usable</span>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 space-y-0.5 relative overflow-hidden">
                <span className="text-[10px] text-emerald-400 uppercase font-sans font-bold flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  2. Free Match
                </span>
                <div className="text-base sm:text-xl font-black text-emerald-300">+${(welcomeBonus + tierBonus).toFixed(2)}</div>
                <span className="text-[10px] text-emerald-400/90 font-sans font-semibold">Instant Grant</span>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 space-y-0.5 relative overflow-hidden">
                <span className="text-[10px] text-amber-400 uppercase font-sans font-bold flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  3. Total Balance
                </span>
                <div className="text-base sm:text-xl font-black text-amber-300">${totalCreditReceived.toFixed(2)}</div>
                <span className="text-[10px] text-amber-400/90 font-sans font-semibold">Available Now</span>
              </div>
            </div>

            {/* Token Mileage Calculator for Non-Technical Users */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 font-mono text-xs space-y-2 relative z-10">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="font-sans font-semibold text-[11px] text-white flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  Workload Mileage:
                </span>
                <div className="flex gap-1">
                  {(['cursor', 'agent', 'chat', 'multimodal'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActivePersona(p)}
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all cursor-pointer ${
                        activePersona === p ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {p === 'cursor' ? 'IDE' : p === 'agent' ? 'Agents' : p === 'chat' ? 'Chat' : 'Media'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[11px]">
                {getModalMetrics().map((m, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-white/5 space-y-0.5">
                    <span className="text-[10px] text-zinc-400 font-sans block">{m.label}</span>
                    <strong className="text-white font-bold font-mono">{m.val}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* E-Commerce Reward Tier Progress Bar */}
            <TierUnlockProgressBar
              currentAmount={currentAmt}
              onSelectTierAmount={(amt) => {
                setSelectedAmount(amt);
                setCustomAmount('');
              }}
            />

            {/* Deposit Packs Selection Grid & Custom Amount */}
            <div className="space-y-2 relative z-10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-zinc-300 uppercase">
                  Select Deposit Tier
                </label>
                <span className="text-[11px] font-mono text-amber-300">
                  Tier Bonus: +{currentPack.tierBonusPct}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PAYWALL_PACKS.map((pack) => {
                  const isSelected = selectedAmount === pack.amount && !customAmount;
                  const packBonus = 5.0 + (pack.amount * pack.tierBonusPct / 100);
                  const total = pack.amount + packBonus;

                  return (
                    <button
                      key={pack.amount}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(pack.amount);
                        setCustomAmount('');
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 shadow-md shadow-amber-500/15 scale-[1.02] ring-1 ring-amber-400/50'
                          : 'bg-black/40 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {pack.badge && (
                        <span className="text-[10px] font-mono font-bold uppercase tracking-tight text-amber-300 block mb-0.5">
                          {pack.badge}
                        </span>
                      )}
                      <div className="font-mono text-base font-black text-white">${pack.amount}</div>
                      <div className="text-[10px] text-emerald-400 font-mono font-bold mt-0.5">
                        → ${total.toFixed(2)} credit
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Amount Input Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-black/50 border border-white/10 font-mono text-xs">
                <span className="text-zinc-400 text-[11px] flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>Custom Compute Amount:</span>
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
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full py-1.5 pl-7 pr-3 rounded-xl bg-black/80 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  {customAmount && Number(customAmount) >= 10 && (
                    <span className="text-emerald-400 font-bold text-[11px] whitespace-nowrap">
                      → ${totalCreditReceived.toFixed(2)} Credit
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-zinc-300 uppercase">
                  Payment Method
                </label>
                <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/50 border border-white/10 text-[11px] font-mono">
                  {(['card', 'stripe', 'crypto'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                        paymentMethod === method
                          ? 'bg-amber-400 text-black font-bold shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {method === 'card' ? 'Quick Card' : method === 'stripe' ? 'Stripe Checkout' : 'Crypto USDC'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Form */}
              {paymentMethod === 'card' && (
                <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3 font-mono text-xs">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-zinc-400 uppercase">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-zinc-400 uppercase">Card Number</label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full py-2 pl-9 pr-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] text-zinc-400 uppercase">Expires (MM/YY)</label>
                      <input
                        type="text"
                        value={cardExp}
                        onChange={(e) => setCardExp(e.target.value)}
                        className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] text-zinc-400 uppercase">CVC / Security Code</label>
                      <input
                        type="password"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 text-center"
                      />
                    </div>
                  </div>

                  {/* Auto-Reload Toggle */}
                  <div className="pt-2 border-t border-white/10 flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="modalAutoReload"
                      checked={autoReload}
                      onChange={(e) => setAutoReload(e.target.checked)}
                      className="mt-0.5 w-3.5 h-3.5 rounded accent-amber-400 cursor-pointer"
                    />
                    <label htmlFor="modalAutoReload" className="text-[11px] text-zinc-400 cursor-pointer">
                      <span className="text-white font-bold">Auto-reload balance</span> when tokens dip below $5.00 (+10% match bonus on all reloads).
                    </label>
                  </div>
                </div>
              )}

              {/* Stripe Hosted Checkout Form */}
              {paymentMethod === 'stripe' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-black/50 border border-[#635BFF]/40 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#635BFF]/20 text-[#635BFF] font-black text-xs border border-[#635BFF]/40">
                        stripe
                      </span>
                      <span className="text-white font-bold text-xs">Official Hosted Checkout</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">PCI SAQ-A Zero-Scope</span>
                  </div>

                  <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                    Redirects to Stripe&apos;s encrypted payment page with support for <strong className="text-white">Apple Pay</strong>, <strong className="text-white">Google Pay</strong>, <strong className="text-white">Link</strong>, company tax invoice PDF generation, and automated VAT collection.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
                    <div className="p-2 rounded-xl bg-white/5 flex items-center gap-1.5 text-zinc-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>256-Bit TLS Bank Encrypted</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5 flex items-center gap-1.5 text-zinc-300">
                      <Receipt className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Instant VAT Tax Receipt</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Crypto Form */}
              {paymentMethod === 'crypto' && (
                <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-[11px] text-zinc-400">Select Blockchain Network:</span>
                    <div className="flex gap-1">
                      {(['base', 'arbitrum', 'solana', 'polygon'] as const).map((net) => (
                        <button
                          key={net}
                          type="button"
                          onClick={() => setCryptoNetwork(net)}
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all cursor-pointer ${
                            cryptoNetwork === net ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {net}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase">USDC Escrow Deposit Address ({cryptoNetwork.toUpperCase()}):</span>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-black/80 border border-white/10 text-[11px] text-cyan-300">
                      <code className="truncate max-w-[260px]">0x71C...89eF43</code>
                      <button
                        type="button"
                        onClick={async () => {
                          await safeCopyToClipboard('0x71C25e771F7A4384914c62c2fD7E690B4489eF43');
                          setCopiedAddress(true);
                          setTimeout(() => setCopiedAddress(false), 2000);
                        }}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        {copiedAddress ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Corporate Invoice & Tax Receipt Link */}
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-zinc-300 text-[11px]">Need a company expense invoice, VAT, or multi-seat team checkout?</span>
              </div>
              <Link
                href={`/checkout?amount=${currentAmt}`}
                className="text-[11px] font-bold text-indigo-300 hover:text-indigo-200 flex items-center gap-1 shrink-0 underline"
              >
                <span>Full Invoice Checkout</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {/* In-Modal FAQ Accordion */}
            <div className="space-y-1.5 pt-1 border-t border-white/10 relative z-10">
              <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase">
                Frequently Asked Questions
              </div>
              <div className="space-y-1">
                {faqItems.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div key={idx} className="rounded-xl bg-black/30 border border-white/5 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full p-2.5 text-left text-xs text-zinc-300 hover:text-white flex items-center justify-between gap-2 font-sans font-semibold cursor-pointer"
                      >
                        <span>{item.q}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-white' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-2.5 text-[11px] text-zinc-400 leading-relaxed font-sans animate-in fade-in duration-150">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10 relative z-10">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-semibold transition-all order-2 sm:order-1"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handlePayAndUnlock}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer font-mono order-1 sm:order-2 hover:scale-[1.02] active:scale-98 ${
                  paymentMethod === 'stripe'
                    ? 'bg-gradient-to-r from-[#635BFF] to-[#7a73ff] hover:from-[#5851ea] hover:to-[#6c65f0] text-white shadow-[#635BFF]/30'
                    : 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black shadow-amber-500/25'
                }`}
              >
                {paymentMethod === 'stripe' ? (
                  <>
                    <ExternalLink className="w-4 h-4 text-white" />
                    <span>Proceed to Stripe Checkout (${currentAmt.toFixed(2)})</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 text-black" />
                    <span>Pay ${currentAmt.toFixed(2)} & Unlock Key (${totalCreditReceived.toFixed(2)} Credit)</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
