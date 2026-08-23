'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  ShieldCheck,
  Lock,
  CreditCard,
  Zap,
  Gift,
  Flame,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Clock,
  Coins,
  Check,
  ChevronRight,
  Tag,
  AlertCircle,
  HelpCircle,
  Laptop,
  CheckCheck,
  MessageSquare,
  Brain,
  Image as ImageIcon,
  Building2,
  FileCheck2,
  Receipt
} from 'lucide-react';
import { TrustSeals } from '@/components/common/TrustSeals';

interface TierSpec {
  amount: number;
  label: string;
  badge: string;
  multiplier: number;
  perks: string[];
  outputMileage: string;
}

const CHECKOUT_TIERS: Record<number, TierSpec> = {
  25: {
    amount: 25,
    label: 'Starter Builder',
    badge: '50% Match Bonus',
    multiplier: 1.5,
    perks: ['50% Instant Compute Match', '$5 Free Welcome Credit', 'Standard Rate Lock'],
    outputMileage: '~15,000 Chat Completions or 800 Code Tasks'
  },
  50: {
    amount: 50,
    label: 'Growth VIP Shard',
    badge: 'VIP Shards 🔓',
    multiplier: 1.6,
    perks: ['Sub-15ms VIP Shards', '+$30 Free Matched Compute', '75% Prompt Cache Pass-Through'],
    outputMileage: '~35,000 Chat Completions or 2,000 Code Tasks'
  },
  100: {
    amount: 100,
    label: 'Fleet Scale',
    badge: '600 RPM Fleet 🔓',
    multiplier: 1.75,
    perks: ['600 RPM Concurrency Burst', '+$75 Free Matched Compute', 'Priority Anycast Failover'],
    outputMileage: '~80,000 Chat Completions or 5,000 Code Tasks'
  },
  250: {
    amount: 250,
    label: 'Enterprise Sovereign',
    badge: 'Unlimited VPC 🔓',
    multiplier: 2.0,
    perks: ['2.00x Double Compute Match', 'Dedicated VPC Lane', 'Unlimited Concurrency Burst'],
    outputMileage: '~220,000 Chat Completions or 15,000 Code Tasks'
  }
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawAmount = parseInt(searchParams.get('amount') || '50', 10);
  const initialAmount = [25, 50, 100, 250].includes(rawAmount) ? rawAmount : 50;

  const [selectedAmount, setSelectedAmount] = useState<number>(initialAmount);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto' | 'ach'>('card');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [autoReloadEnabled, setAutoReloadEnabled] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>('FOUNDING50');
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(899); // 14:59 countdown
  const [showWorkloadSim, setShowWorkloadSim] = useState(false);

  // 15-minute rate lock countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 899));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentTier = CHECKOUT_TIERS[selectedAmount] || CHECKOUT_TIERS[50];
  const welcomeGrant = 5.0;
  const matchBonusDollars = (selectedAmount * (currentTier.multiplier - 1));
  const totalUsableCompute = selectedAmount + welcomeGrant + matchBonusDollars;

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'FOUNDING50' || promoCode.trim().toUpperCase() === 'WELCOME5') {
      setAppliedPromo(promoCode.trim().toUpperCase());
      setPromoCode('');
    }
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      router.push(`/checkout/success?amount=${selectedAmount}&total=${totalUsableCompute}&tier=${encodeURIComponent(currentTier.label)}&email=${encodeURIComponent(email || 'developer@company.com')}`);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 font-sans antialiased selection:bg-amber-500/30 selection:text-amber-200 flex flex-col justify-between">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/3 w-[600px] h-[400px] bg-amber-500/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-emerald-500/8 rounded-full blur-[140px]" />
      </div>

      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 relative z-10">
        {/* Step Progression Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-xs font-mono">
            <Link href="/pricing" className="text-zinc-400 hover:text-white transition-colors">
              1. Compute Tier
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Lock className="w-3 h-3" />
              2. Secure Checkout &amp; Rate Lock
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-zinc-600">3. Instant Key Activation</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold self-start sm:self-auto">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>Rate Lock Reserved For: {formatTimer(timeLeft)}</span>
          </div>
        </div>

        {/* 2-Column E-Commerce Checkout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Express 1-Click & Payment Details */}
          <div className="lg:col-span-7 space-y-6">
            {/* Express 1-Click Checkout Banner */}
            <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4 bg-black/40">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 block text-center">
                ⚡ Express 1-Click Checkout
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsProcessing(true);
                    setTimeout(() => {
                      router.push(`/checkout/success?amount=${selectedAmount}&total=${totalUsableCompute}&tier=${encodeURIComponent(currentTier.label)}&method=ApplePay`);
                    }, 800);
                  }}
                  className="py-3.5 px-4 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-98"
                >
                  <span> Pay</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProcessing(true);
                    setTimeout(() => {
                      router.push(`/checkout/success?amount=${selectedAmount}&total=${totalUsableCompute}&tier=${encodeURIComponent(currentTier.label)}&method=GooglePay`);
                    }, 800);
                  }}
                  className="py-3.5 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-98 border border-white/10 font-mono"
                >
                  <span>G Pay</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProcessing(true);
                    setTimeout(() => {
                      router.push(`/checkout/success?amount=${selectedAmount}&total=${totalUsableCompute}&tier=${encodeURIComponent(currentTier.label)}&method=USDC`);
                    }, 800);
                  }}
                  className="col-span-2 sm:col-span-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-98 font-mono"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>USDC 1-Click</span>
                </button>
              </div>

              <div className="relative flex items-center justify-center pt-2">
                <div className="w-full border-t border-white/10" />
                <span className="absolute px-3 bg-[#07080d] text-[10px] uppercase font-mono font-bold text-zinc-500">
                  Or Pay with Credit Card / Corporate Invoice
                </span>
              </div>
            </div>

            {/* Main Checkout Form */}
            <form onSubmit={handleSubmitOrder} className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6 bg-black/40">
              {/* Step 1: Compute Amount Selector */}
              <div className="space-y-3">
                <label className="block text-xs font-mono font-bold text-zinc-300 uppercase">
                  1. Select Compute Deposit Pack:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[25, 50, 100, 250].map((amt) => {
                    const tier = CHECKOUT_TIERS[amt];
                    const isSelected = selectedAmount === amt;
                    const totalLoaded = amt * tier.multiplier + 5;

                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setSelectedAmount(amt)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02]'
                            : 'bg-black/60 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <span className="text-[9px] font-mono font-black text-amber-300 uppercase block mb-1">
                          {tier.badge}
                        </span>
                        <div className="font-mono text-xl font-black text-white">${amt}</div>
                        <span className="text-xs font-mono font-bold text-emerald-400 mt-1">
                          → ${totalLoaded.toFixed(0)} Credits
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Contact & Invoicing Information */}
              <div className="space-y-4 pt-2">
                <label className="block text-xs font-mono font-bold text-zinc-300 uppercase">
                  2. Contact &amp; Invoice Details:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">API Key &amp; Receipt Email *</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="founder@company.com"
                      className="w-full py-2.5 px-3.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">Company / Legal Entity (For Invoice)</span>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Corp, Inc."
                      className="w-full py-2.5 px-3.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Payment Method Selector */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-mono font-bold text-zinc-300 uppercase">
                  3. Payment Method (256-Bit Encrypted):
                </label>
                <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-3 px-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === 'card'
                        ? 'bg-amber-500/20 border-amber-400 text-white'
                        : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <span>Credit Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('crypto')}
                    className={`py-3 px-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === 'crypto'
                        ? 'bg-cyan-500/20 border-cyan-400 text-white'
                        : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Coins className="w-4 h-4 text-cyan-400" />
                    <span>USDC / Crypto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('ach')}
                    className={`py-3 px-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === 'ach'
                        ? 'bg-purple-500/20 border-purple-400 text-white'
                        : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-purple-400" />
                    <span>Bank ACH</span>
                  </button>
                </div>

                {paymentMethod === 'card' && (
                  <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase block mb-1">Card Number</span>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="4242 •••• •••• 4242"
                          defaultValue="•••• •••• •••• 4242"
                          className="w-full py-2.5 pl-3.5 pr-10 rounded-xl bg-black/80 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                        />
                        <Lock className="w-3.5 h-3.5 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase block mb-1">Expires</span>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          defaultValue="12/28"
                          className="w-full py-2.5 px-3.5 rounded-xl bg-black/80 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase block mb-1">CVC</span>
                        <input
                          type="text"
                          placeholder="CVC"
                          defaultValue="928"
                          className="w-full py-2.5 px-3.5 rounded-xl bg-black/80 border border-white/10 text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Value Add-on Order Bump */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="autoReload"
                  checked={autoReloadEnabled}
                  onChange={(e) => setAutoReloadEnabled(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-emerald-400 accent-emerald-400 cursor-pointer"
                />
                <label htmlFor="autoReload" className="text-xs space-y-1 cursor-pointer">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Enable Zero-Downtime Auto-Reload Protection (Recommended)</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Automatically reload ${selectedAmount} only when your compute balance dips below $5.00 USD. You can pause or cancel anytime with 1 click.
                  </p>
                </label>
              </div>

              {/* Submit Order Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-2xl shadow-amber-500/30 cursor-pointer hover:scale-[1.01] active:scale-99 disabled:opacity-50 font-mono"
              >
                <Lock className="w-4 h-4 fill-black" />
                <span>{isProcessing ? 'Processing Secure Deposit...' : `Pay $${selectedAmount}.00 & Claim $${totalUsableCompute.toFixed(2)} Credits`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Trust Footers */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-zinc-400 pt-2">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>100% Unspent Refund Guarantee</span>
                </div>
                <div className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>256-Bit SSL Encrypted</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Instant API Key Delivery</span>
                </div>
              </div>
            </form>
          </div>

          {/* Right Column: Sticky Order Summary Drawer */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/30 bg-black/60 shadow-2xl space-y-6 sticky top-24">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>Order Summary</span>
                </h2>
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  {currentTier.label}
                </span>
              </div>

              {/* Itemized Breakdown */}
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center text-zinc-300">
                  <span>Prepaid Compute Deposit ({currentTier.label}):</span>
                  <span className="font-bold text-white">${selectedAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5" />
                    <span>Welcome Builder Credit:</span>
                  </span>
                  <span className="font-bold">+$5.00 FREE</span>
                </div>

                <div className="flex justify-between items-center text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    <span>50% Compute Match Bonus:</span>
                  </span>
                  <span className="font-bold">+${matchBonusDollars.toFixed(2)} FREE</span>
                </div>

                <div className="flex justify-between items-center text-zinc-400">
                  <span>Gateway Router Surcharge:</span>
                  <span className="font-bold text-emerald-400">$0.00 (Zero Markup)</span>
                </div>

                <div className="flex justify-between items-center text-zinc-400">
                  <span>Taxes &amp; Payment Processing:</span>
                  <span className="font-bold text-zinc-200">$0.00</span>
                </div>
              </div>

              {/* Promo Code Input */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Promo Code"
                    className="flex-1 py-2 px-3 rounded-xl bg-black/80 border border-white/10 text-xs text-white uppercase font-mono focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>

                {appliedPromo && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-amber-400" />
                      <span>Code <strong>{appliedPromo}</strong> Applied!</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold">50% Match Active</span>
                  </div>
                )}
              </div>

              {/* Total Due & Usable Balance Comparison */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-emerald-500/10 border border-amber-400/50 space-y-3 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-300 font-sans uppercase font-bold">Total Due Today:</span>
                  <div className="text-2xl font-black text-white">${selectedAmount.toFixed(2)} USD</div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                  <span className="text-xs text-amber-300 font-sans font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Total Usable Compute Credited:
                  </span>
                  <div className="text-2xl font-black text-emerald-300">${totalUsableCompute.toFixed(2)} USD</div>
                </div>
              </div>

              {/* Output Mileage Estimates */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Estimated Workload Capacity:</span>
                </div>
                <div className="text-white font-medium text-[11px] leading-relaxed">
                  ⚡ {currentTier.outputMileage}
                </div>
              </div>

              {/* Unlocked Tier Perks */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-[11px] font-mono font-bold uppercase text-zinc-400 block">
                  Included with Your Key:
                </span>
                <div className="space-y-1.5 text-xs text-zinc-300 font-sans">
                  {currentTier.perks.map((perk, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{perk}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Instant Bearer Key Minting &amp; Invoicing</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Consumer Trust Seals */}
        <TrustSeals />
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#07080d] flex items-center justify-center text-zinc-400 font-mono text-xs">
        Loading secure checkout...
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
