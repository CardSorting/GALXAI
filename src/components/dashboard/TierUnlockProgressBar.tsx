'use client';

import React from 'react';
import {
  Zap,
  Flame,
  ShieldCheck,
  Cpu,
  Server,
  Sparkles,
  Gift,
  Lock,
  CheckCircle2
} from 'lucide-react';

interface TierUnlockProgressBarProps {
  currentAmount: number;
  onSelectTierAmount?: (amount: number) => void;
  className?: string;
}

interface TierMilestone {
  amount: number;
  label: string;
  perk: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MILESTONES: TierMilestone[] = [
  { amount: 25, label: '$25 Starter', perk: '50% Match Bonus', icon: CoinsIcon },
  { amount: 50, label: '$50 Growth', perk: 'Sub-15ms VIP Shard', icon: Zap },
  { amount: 100, label: '$100 Scale', perk: '600 RPM Concurrency', icon: Server },
  { amount: 250, label: '$250 Fleet', perk: 'Unlimited Burst Lane', icon: Cpu },
  { amount: 500, label: '$500 Enterprise', perk: '1-on-1 Arch Review', icon: ShieldCheck }
];

function CoinsIcon({ className }: { className?: string }) {
  return <Flame className={className} />;
}

export function TierUnlockProgressBar({
  currentAmount,
  onSelectTierAmount,
  className = ''
}: TierUnlockProgressBarProps) {
  // Find next milestone
  const nextMilestone = MILESTONES.find(m => m.amount > currentAmount) || MILESTONES[MILESTONES.length - 1];
  const distanceToNext = Math.max(0, nextMilestone.amount - currentAmount);
  const isMaxTier = currentAmount >= 500;

  // Percentage calculation based on 500 max
  const progressPct = Math.min(100, Math.round((currentAmount / 500) * 100));

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-black/50 border border-white/10 space-y-4 font-mono text-xs ${className}`}>
      {/* Top Status & Next Perk Teaser */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold">
            <Gift className="w-3.5 h-3.5 text-amber-400" />
          </span>
          <span className="text-white font-bold text-xs">
            {isMaxTier ? (
              <span className="text-emerald-300">All VIP Infrastructure Tiers Unlocked!</span>
            ) : (
              <>
                Add <strong className="text-amber-300">${distanceToNext}</strong> to unlock <strong className="text-cyan-300">{nextMilestone.perk}</strong>
              </>
            )}
          </span>
        </div>

        <span className="text-[10px] text-zinc-400 uppercase bg-white/5 px-2.5 py-1 rounded-md border border-white/5 self-start sm:self-auto">
          Active Deposit: <strong className="text-white">${currentAmount} USD</strong>
        </span>
      </div>

      {/* Visual Gamified Bar */}
      <div className="relative pt-1 pb-2">
        {/* Track */}
        <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-white/10 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-400 rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${Math.max(5, progressPct)}%` }}
          />
        </div>

        {/* Milestone Markers */}
        <div className="grid grid-cols-5 gap-1 pt-3">
          {MILESTONES.map((m) => {
            const isUnlocked = currentAmount >= m.amount;
            const Icon = m.icon;

            return (
              <button
                key={m.amount}
                type="button"
                onClick={() => onSelectTierAmount && onSelectTierAmount(m.amount)}
                className={`flex flex-col items-center text-center group cursor-pointer transition-all p-1 rounded-xl ${
                  isUnlocked
                    ? 'text-amber-300'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    isUnlocked
                      ? 'bg-amber-400 text-black shadow-md shadow-amber-500/30'
                      : 'bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700'
                  }`}
                >
                  {isUnlocked ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3 h-3" />}
                </div>
                <span className="text-[10px] font-bold mt-1">${m.amount}</span>
                <span className="text-[9px] text-zinc-400 hidden sm:block truncate max-w-[70px]">{m.perk}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
