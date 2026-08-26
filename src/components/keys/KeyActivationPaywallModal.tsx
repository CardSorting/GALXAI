'use client';

import React, { useState } from 'react';
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
  Bot
} from 'lucide-react';
import { TierUnlockProgressBar } from '@/components/dashboard/TierUnlockProgressBar';

interface PaywallPack {
  amount: number;
  label: string;
  tierBonusPct: number;
  badge?: string;
  popular?: boolean;
}

const PAYWALL_PACKS: PaywallPack[] = [
  { amount: 25, label: 'Starter Key', tierBonusPct: 50, badge: '50% Match Bonus', popular: true },
  { amount: 50, label: 'Growth VIP', tierBonusPct: 50, badge: 'VIP Priority 🔓' },
  { amount: 100, label: 'Scale Fleet', tierBonusPct: 50, badge: '600 RPM Fleet 🔓' },
  { amount: 250, label: 'Enterprise Burst', tierBonusPct: 50, badge: 'Unlimited VPC 🔓' }
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
  initialAmount = 10
}: KeyActivationPaywallModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(initialAmount);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple' | 'crypto'>('card');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExp, setCardExp] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [cardName, setCardName] = useState('Alex Developer');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activationStep, setActivationStep] = useState<number>(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const currentAmt = customAmount ? Math.max(10, parseFloat(customAmount) || 10) : selectedAmount;
  const currentPack = PAYWALL_PACKS.find(p => p.amount === currentAmt) || { amount: currentAmt, label: 'Custom Pack', tierBonusPct: currentAmt >= 100 ? 10 : currentAmt >= 50 ? 5 : 0 };
  const welcomeBonus = 5.0; // Guaranteed $5 introductory compute grant
  const tierBonus = currentAmt * (currentPack.tierBonusPct / 100);
  const totalCreditReceived = currentAmt + welcomeBonus + tierBonus;

  // Live Token Mileage Estimates
  const tokensSol = Math.round((totalCreditReceived / 3.75) * 1000000);
  const tokensLuna = Math.round((totalCreditReceived / 0.95) * 1000000);
  const totalImages = Math.round(totalCreditReceived / 0.02);

  const handlePayAndUnlock = () => {
    setIsProcessing(true);
    setActivationStep(1); // 1: Authorizing payment
    setTimeout(() => {
      setActivationStep(2); // 2: Applying $5 match grant
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
      q: 'Why is an initial $10 deposit required to activate the $5 bonus?',
      a: 'To guarantee sub-15ms routing and zero queue wait times on frontier models (GPT-5.6 Sol, Terra, Luna), we provision dedicated high-availability routing slots. The $10 refundable deposit prevents bot scraper swarms while ensuring 100% of your money goes directly toward usable tokens.'
    },
    {
      q: 'What is the 50% Match Bonus?',
      a: 'When you deposit $10 for your first key, we immediately add a $5.00 welcome grant from our developer fund. You start with $15.00 in usable compute credits with zero platform fees.'
    },
    {
      q: 'Can I get a refund on unspent funds?',
      a: 'Yes. Any unspent balance from your initial deposit can be refunded with 1 click directly from the Billing dashboard at any time.'
    },
    {
      q: 'Do compute credits expire?',
      a: 'No. Deposited compute balances and promotional match grants never expire.'
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
                {activationStep === 2 && 'Applying +$5.00 Match Bonus...'}
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
                <Gift className="w-3.5 h-3.5" />
                <span>50% INSTANT MATCH • $5 FREE COMPUTE GRANT</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Deposit $10 to Unlock Key & Claim $5 Free
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-lg mx-auto leading-relaxed">
                Deposit <strong className="text-white">$10.00</strong> to activate your key. We instantly match you with <strong className="text-emerald-300">+$5.00 Free Compute</strong>, crediting <strong className="text-amber-300">$15.00 Total Usable Balance</strong> with 0 platform fees.
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
                  Token Mileage on ${totalCreditReceived.toFixed(2)} Balance:
                </span>
                <span className="text-emerald-400 text-[10px] font-bold">25%–40% Wholesale Rates</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[11px]">
                <div className="p-2 rounded-xl bg-white/5 space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-sans block">GPT-5.6 Sol</span>
                  <strong className="text-white font-bold font-mono">~{(tokensSol / 1000000).toFixed(1)}M tokens</strong>
                </div>
                <div className="p-2 rounded-xl bg-white/5 space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-sans block">GPT-5.6 Luna</span>
                  <strong className="text-cyan-300 font-bold font-mono">~{(tokensLuna / 1000000).toFixed(1)}M tokens</strong>
                </div>
                <div className="p-2 rounded-xl bg-white/5 space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-sans block">4K Images</span>
                  <strong className="text-amber-300 font-bold font-mono">~{totalImages} renders</strong>
                </div>
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

            {/* Deposit Packs Selection Grid */}
            <div className="space-y-2 relative z-10">
              <label className="block text-xs font-mono font-bold text-zinc-300 uppercase">
                Select Deposit Tier
              </label>
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
                          ? 'bg-amber-500/20 border-amber-400 shadow-md shadow-amber-500/15 scale-[1.02]'
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
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-zinc-300 uppercase">
                  Payment Method
                </label>
                <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/50 border border-white/10 text-[11px] font-mono">
                  {(['card', 'apple', 'crypto'] as const).map((method) => (
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
                      {method === 'card' ? 'Credit Card' : method === 'apple' ? 'Apple Pay' : 'Crypto USDC'}
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
                </div>
              )}

              {/* Apple Pay Form */}
              {paymentMethod === 'apple' && (
                <div className="p-5 rounded-2xl bg-black/50 border border-white/10 text-center space-y-2 font-mono text-xs">
                  <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center mx-auto font-black text-sm">
                    Pay
                  </div>
                  <div className="text-white font-bold text-sm">Instant 1-Click Biometric Checkout</div>
                  <p className="text-[11px] text-zinc-400">Authenticated via Touch ID / Face ID with $0 card processing fees.</p>
                </div>
              )}

              {/* Crypto Form */}
              {paymentMethod === 'crypto' && (
                <div className="p-5 rounded-2xl bg-black/50 border border-white/10 text-center space-y-2 font-mono text-xs">
                  <Coins className="w-8 h-8 text-cyan-400 mx-auto" />
                  <div className="text-cyan-300 font-bold text-sm">Instant Stablecoin Top-Up (USDC / USDT)</div>
                  <p className="text-[11px] text-zinc-400">Supported networks: Arbitrum One, Solana, Base, and Polygon with zero slippage.</p>
                </div>
              )}
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
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer font-mono order-1 sm:order-2 hover:scale-[1.02] active:scale-98"
              >
                <Key className="w-4 h-4 text-black" />
                <span>Pay ${currentAmt.toFixed(2)} & Unlock Key ($${totalCreditReceived.toFixed(2)} Credit)</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
