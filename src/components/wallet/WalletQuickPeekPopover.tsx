'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Sparkles,
  Zap,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Plus,
  Coins,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { WalletTopUpModal } from './WalletTopUpModal';

interface WalletQuickPeekPopoverProps {
  balance: number;
  hasVerifiedDeposit: boolean;
  onTopUpSuccess?: (amount: number, totalCredited: number) => void;
}

export function WalletQuickPeekPopover({
  balance,
  hasVerifiedDeposit,
  onTopUpSuccess
}: WalletQuickPeekPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const recentTransactions = [
    {
      id: 'tx_1',
      desc: 'API Chat: OpenAI GPT-5.6 Sol',
      amount: -0.007750,
      saved: 0.003250,
      time: 'Just now'
    },
    {
      id: 'tx_2',
      desc: 'Stream Chat: GPT-5.6 Terra',
      amount: -0.003420,
      saved: 0.001480,
      time: '4m ago'
    },
    {
      id: 'tx_3',
      desc: 'Prepaid Pack (+50% Match)',
      amount: 150.00,
      saved: 50.00,
      time: '2h ago'
    }
  ];

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Navbar Balance Trigger Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold hover:bg-emerald-500/20 transition-all cursor-pointer shadow-sm hover:scale-105"
        aria-label={`Developer Compute Wallet. Current balance: $${balance.toFixed(2)}`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <Wallet className="w-3.5 h-3.5 text-emerald-400" />
        <span>${balance.toFixed(2)}</span>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-zinc-950/95 border border-white/15 rounded-3xl p-5 shadow-2xl z-50 space-y-4 font-mono animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl">
          {/* Top Balance Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="uppercase font-sans font-semibold">Available Compute Balance</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                Active • Micro-Billed
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-black text-white tracking-tight flex items-baseline gap-1.5">
                <span>${balance.toFixed(2)}</span>
                <span className="text-xs text-zinc-400 font-sans">USD</span>
              </div>

              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsTopUpOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold font-sans text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-amber-500/20 hover:scale-105"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Top Up</span>
              </button>
            </div>

            {/* Runway Meter */}
            <div className="p-3 rounded-2xl bg-black/50 border border-white/5 space-y-1 text-xs font-sans">
              <div className="flex items-center justify-between text-zinc-300 font-medium">
                <span>Projected Runway:</span>
                <span className="text-cyan-300 font-mono font-bold">~45 Days</span>
              </div>
              <div className="text-[11px] text-zinc-500">
                Supports ~18,400 queries at current traffic volume.
              </div>
            </div>
          </div>

          {/* Micro-Transactions Strip */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-sans font-semibold">
              <span>Recent Activity</span>
              <span className="text-emerald-400 text-[10px]">Sub-Cent Live</span>
            </div>

            <div className="space-y-1.5">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-[11px] hover:bg-white/[0.04] transition-all"
                >
                  <div className="space-y-0.5 truncate max-w-[190px]">
                    <div className="text-white truncate font-medium font-sans">{tx.desc}</div>
                    <div className="text-[10px] text-zinc-500">{tx.time}</div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={tx.amount < 0 ? 'text-zinc-200' : 'text-emerald-400 font-bold'}>
                      {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(4)}
                    </div>
                    {tx.saved > 0 && (
                      <div className="text-[9px] text-emerald-400">
                        Saved ${tx.saved.toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full Dashboard Link */}
          <div className="pt-2 border-t border-white/10">
            <Link
              href="/billing"
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-sans font-bold flex items-center justify-center gap-1.5 transition-all border border-white/10 cursor-pointer"
            >
              <span>Open Full Billing &amp; Usage Explorer</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </Link>
          </div>
        </div>
      )}

      {/* Top Up Modal */}
      <WalletTopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        onSuccess={(amt, total) => {
          if (onTopUpSuccess) onTopUpSuccess(amt, total);
        }}
      />
    </div>
  );
}
