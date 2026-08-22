'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { BillingSubNav } from '@/components/dashboard/BillingSubNav';
import {
  Gift,
  Sparkles,
  Zap,
  CheckCircle2,
  Copy,
  Check,
  Coins,
  ShieldCheck,
  ArrowRight,
  Flame,
  Clock,
  Share2
} from 'lucide-react';

interface PromoCredit {
  id: string;
  name: string;
  code: string;
  amount: number;
  remaining: number;
  expiresAt: string;
  status: 'active' | 'expired';
}

const INITIAL_PROMOS: PromoCredit[] = [
  {
    id: 'promo_yc_w26',
    name: 'Y Combinator AI Batch Accelerator Grant',
    code: 'YC-W26-GRANT',
    amount: 500.00,
    remaining: 320.50,
    expiresAt: 'Dec 31, 2026',
    status: 'active'
  },
  {
    id: 'promo_dev_starter',
    name: 'Verified Developer Welcome Bonus',
    code: 'DEV-ACTIVATE-10',
    amount: 10.00,
    remaining: 0.00,
    expiresAt: 'Jul 31, 2026',
    status: 'expired'
  }
];

export default function PromoCreditsPage() {
  const [promos, setPromos] = useState<PromoCredit[]>(INITIAL_PROMOS);
  const [voucherCode, setVoucherCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [copiedReferral, setCopiedReferral] = useState(false);

  const referralCode = 'GALX-ENG-9821';
  const referralUrl = `https://galxai.com/join?ref=${referralCode}`;

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;

    setIsRedeeming(true);
    setTimeout(() => {
      setIsRedeeming(false);
      const codeUpper = voucherCode.trim().toUpperCase();
      const newCredit: PromoCredit = {
        id: `promo_${Date.now()}`,
        name: `Redeemed Voucher (${codeUpper})`,
        code: codeUpper,
        amount: 50.00,
        remaining: 50.00,
        expiresAt: 'Dec 31, 2026',
        status: 'active'
      };
      setPromos([newCredit, ...promos]);
      setRedeemSuccess(`🎉 Successfully redeemed code "${codeUpper}"! Credited +$50.00 USD promotional compute.`);
      setVoucherCode('');
      setTimeout(() => setRedeemSuccess(null), 5000);
    }, 700);
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  const totalActivePromoRemaining = promos
    .filter(p => p.status === 'active')
    .reduce((acc, p) => acc + p.remaining, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Billing', href: '/billing' },
            { label: 'Financial Ledger', href: '/billing' },
            { label: 'Promotional Grants & Vouchers' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Promotional Credits & Startup Grants</h1>
            <p className="text-xs text-zinc-400">
              Redeem promotional coupon codes, manage startup accelerator compute grants, and track referral bonuses.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold">
              ${totalActivePromoRemaining.toFixed(2)} USD Active Grants
            </span>
          </div>
        </div>

        <BillingSubNav />

        {redeemSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{redeemSuccess}</span>
          </div>
        )}

        {/* Voucher Redemption Box & Referral Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Redeem Voucher Form */}
          <div className="lg:col-span-6 glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-amber-500/30 bg-amber-500/5">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                Redeem Promo Voucher Code
              </h2>
              <p className="text-xs text-zinc-300">
                Enter your VC grant or promotional voucher code to instantly credit your account.
              </p>
            </div>

            <form onSubmit={handleRedeem} className="space-y-3 font-mono text-xs">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. YC-W26-GRANT or HACKATHON-50"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  className="flex-1 py-3 px-4 rounded-xl bg-black/60 border border-white/10 text-white uppercase placeholder:normal-case focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
                <button
                  type="submit"
                  disabled={isRedeeming}
                  className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black uppercase tracking-wider text-xs font-mono shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isRedeeming ? 'Applying...' : 'Apply Code'}
                </button>
              </div>
              <span className="text-[11px] text-zinc-500 block font-sans">
                Grants apply automatically before your cash balance is deducted.
              </span>
            </form>
          </div>

          {/* Referral Program Box */}
          <div className="lg:col-span-6 glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-cyan-500/30 bg-cyan-500/5 flex flex-col justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-cyan-400" />
                Developer Referral Program
              </h2>
              <p className="text-xs text-zinc-300">
                Share your link. When an engineering team joins, you both receive a <strong>10% compute top-up bonus</strong> forever.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between font-mono text-xs">
              <code className="text-cyan-300 text-[11px] truncate mr-2">{referralUrl}</code>
              <button
                onClick={handleCopyReferral}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-sans font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                {copiedReferral ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedReferral ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Promo Ledger Table */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-400" />
            Promotional Grants & Vouchers History
          </h3>

          <div className="space-y-3 font-mono text-xs">
            {promos.map((promo) => (
              <div
                key={promo.id}
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  promo.status === 'active'
                    ? 'bg-black/30 border-white/10 hover:border-white/20'
                    : 'bg-black/20 border-white/5 opacity-60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white font-sans text-sm">{promo.name}</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 text-cyan-300 text-[10px]">
                      {promo.code}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        promo.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {promo.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500">Expires {promo.expiresAt}</div>
                </div>

                <div className="text-right space-y-0.5">
                  <div className="text-base font-bold text-white font-mono">
                    ${promo.remaining.toFixed(2)} / ${promo.amount.toFixed(2)} USD
                  </div>
                  <span className="text-[10px] text-emerald-400 font-sans">Remaining Available Grant</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
