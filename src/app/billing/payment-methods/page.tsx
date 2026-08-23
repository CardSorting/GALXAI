'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { BillingSubNav } from '@/components/dashboard/BillingSubNav';
import {
  Landmark,
  CreditCard,
  Plus,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Trash2,
  Check,
  X,
  Lock,
  Building2
} from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';

interface PaymentMethodItem {
  id: string;
  type: 'card' | 'ach' | 'wire';
  brand: string;
  last4: string;
  expiry?: string;
  isDefault: boolean;
  isBackup?: boolean;
}

const INITIAL_METHODS: PaymentMethodItem[] = [
  {
    id: 'pm_visa_4242',
    type: 'card',
    brand: 'Visa',
    last4: '4242',
    expiry: '12/2028',
    isDefault: true
  },
  {
    id: 'pm_mc_8891',
    type: 'card',
    brand: 'Mastercard',
    last4: '8891',
    expiry: '09/2027',
    isDefault: false,
    isBackup: true
  },
  {
    id: 'pm_ach_svb',
    type: 'ach',
    brand: 'ACH Direct Debit (JPMorgan Chase)',
    last4: '9012',
    isDefault: false
  }
];

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethodItem[]>(INITIAL_METHODS);
  const [isAdding, setIsAdding] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    const last4 = cardNumber.slice(-4) || '9988';
    const newPm: PaymentMethodItem = {
      id: `pm_${Date.now()}`,
      type: 'card',
      brand: 'Visa',
      last4,
      expiry: cardExpiry || '08/2029',
      isDefault: false,
      isBackup: true
    };
    setMethods([...methods, newPm]);
    setIsAdding(false);
    setCardNumber('');
    setCardExpiry('');
    setCardCvc('');
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3000);
  };

  const handleSetDefault = (id: string) => {
    setMethods(methods.map(m => ({
      ...m,
      isDefault: m.id === id,
      isBackup: m.id !== id && m.isDefault ? true : m.isBackup
    })));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Billing', href: '/billing' },
            { label: 'Payment Instruments' }
          ]}
        />

        <AuthRequiredGate
          title="Sign In to Manage Payment Instruments"
          description="Stored cards, ACH bank accounts, and invoice billing contacts are private to your authenticated workspace."
          checkoutAmount={50}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Payment Instruments & Invoicing Methods</h1>
            <p className="text-xs text-zinc-400">
              Manage corporate credit cards, ACH direct debit, and wire transfer accounts with automatic backup failover.
            </p>
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider font-mono flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Payment Method</span>
          </button>
        </div>

        <BillingSubNav />

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>New payment method verified and added to corporate account!</span>
          </div>
        )}

        {/* Add Payment Drawer */}
        {isAdding && (
          <form onSubmit={handleAddCard} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-amber-500/30 bg-black/50 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                Add Corporate Payment Instrument
              </h3>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-zinc-400 uppercase text-[10px]">Card Number</label>
                <input
                  type="text"
                  required
                  placeholder="4242 •••• •••• 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 uppercase text-[10px]">Expiration Date</label>
                <input
                  type="text"
                  required
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs font-mono hover:bg-amber-300 transition-all cursor-pointer"
              >
                Verify & Save Card
              </button>
            </div>
          </form>
        )}

        {/* Payment Methods List */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Landmark className="w-4 h-4 text-cyan-400" />
            Configured Corporate Payment Methods
          </h2>

          <div className="space-y-3 font-mono text-xs">
            {methods.map((method) => (
              <div
                key={method.id}
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  method.isDefault
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : 'bg-black/30 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-white font-bold text-xs flex items-center justify-center font-mono">
                    {method.brand.includes('Visa') ? 'VISA' : method.brand.includes('Mastercard') ? 'MC' : 'ACH'}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-sans text-sm">{method.brand}</span>
                      <span className="text-zinc-400">•••• {method.last4}</span>
                      {method.isDefault && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-[9px] font-black uppercase tracking-wider">
                          Default Primary
                        </span>
                      )}
                      {method.isBackup && !method.isDefault && (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[9px] font-bold">
                          Backup Failover
                        </span>
                      )}
                    </div>
                    {method.expiry && (
                      <div className="text-[11px] text-zinc-500">Expires {method.expiry}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {!method.isDefault && (
                    <button
                      onClick={() => handleSetDefault(method.id)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs font-sans font-semibold border border-white/10 cursor-pointer"
                    >
                      Set as Primary
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        </AuthRequiredGate>
      </main>
    </div>
  );
}
