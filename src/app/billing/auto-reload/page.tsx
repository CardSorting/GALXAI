'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { BillingSubNav } from '@/components/dashboard/BillingSubNav';
import {
  RefreshCw,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Play,
  CreditCard,
  Bell,
  Sliders,
  DollarSign,
  Lock,
  ArrowRight,
  Flame,
  AlertCircle
} from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';

export default function AutoReloadPage() {
  const [autoReloadEnabled, setAutoReloadEnabled] = useState(true);
  const [autoReloadThreshold, setAutoReloadThreshold] = useState(10);
  const [autoReloadAmount, setAutoReloadAmount] = useState(50);
  const [monthlyReloadCap, setMonthlyReloadCap] = useState(500);
  const [emailAlertsOnReload, setEmailAlertsOnReload] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  const handleSimulate = () => {
    setIsSimulating(true);
    setSimulationResult(null);

    const bonusMult = autoReloadAmount >= 100 ? 1.10 : autoReloadAmount >= 50 ? 1.05 : 1.0;
    const netCredit = autoReloadAmount * bonusMult;

    setTimeout(() => {
      setIsSimulating(false);
      setSimulationResult(
        `⚡ Simulated Trigger Successful: Balance dipped below $${autoReloadThreshold}.00. Auto-Reload executed for +$${netCredit.toFixed(2)} USD (including ${((bonusMult - 1) * 100).toFixed(0)}% volume bonus). Zero streaming disruption.`
      );
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Billing', href: '/billing' },
            { label: 'Auto-Top Up Safeguards' }
          ]}
        />

        <AuthRequiredGate
          title="Sign In to Manage Auto-Reload Safeguards"
          description="Automatic compute top-up rules, low balance thresholds, and monthly spend caps are private to your authenticated workspace."
          checkoutAmount={50}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Auto-Top Up & Zero-Downtime Safeguards</h1>
            <p className="text-xs text-zinc-400">
              Configure automatic compute balance reloads to ensure your production API keys, coding agents, and servers never stall.
            </p>
          </div>

          <button
            onClick={() => setAutoReloadEnabled(!autoReloadEnabled)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
              autoReloadEnabled
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                : 'bg-zinc-800 text-zinc-400 border-white/10'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${autoReloadEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
            <span>{autoReloadEnabled ? 'Auto-Top Up is ACTIVE' : 'Auto-Top Up is DISABLED'}</span>
          </button>
        </div>

        <BillingSubNav />

        {/* Live Simulation Playground Card */}
        <div className="glass-panel rounded-3xl p-6 space-y-4 border border-cyan-500/30 bg-cyan-500/5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Live Zero-Downtime Trigger Simulation
              </h3>
              <p className="text-xs text-zinc-400">
                Simulate what happens when an active agent loop drops your balance below the threshold.
              </p>
            </div>

            <button
              onClick={handleSimulate}
              disabled={isSimulating || !autoReloadEnabled}
              className="px-5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isSimulating ? (
                <span>Executing Simulation...</span>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-cyan-400" />
                  <span>Run Auto-Reload Test</span>
                </>
              )}
            </button>
          </div>

          {simulationResult && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{simulationResult}</span>
            </div>
          )}
        </div>

        {/* Main Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Rules Configuration */}
          <div className="lg:col-span-8 glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                Auto-Reload Threshold Rules
              </h2>
              <p className="text-xs text-zinc-400">Specify when and how much to reload.</p>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <label className="text-zinc-400 uppercase text-[10px]">1. Low-Balance Trigger Threshold</label>
                <select
                  value={autoReloadThreshold}
                  onChange={(e) => setAutoReloadThreshold(Number(e.target.value))}
                  disabled={!autoReloadEnabled}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
                >
                  <option value={5}>$5.00 Threshold (Low-Volume Side Projects)</option>
                  <option value={10}>$10.00 Threshold (Recommended Developer Default)</option>
                  <option value={25}>$25.00 Threshold (Medium Volume)</option>
                  <option value={50}>$50.00 Threshold (High-Throughput Production)</option>
                </select>
                <span className="text-[11px] text-zinc-500 block font-sans">
                  When available wallet credits fall below this amount, an automatic deposit is triggered.
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <label className="text-zinc-400 uppercase text-[10px]">2. Automatic Reload Amount & Volume Bonus</label>
                <select
                  value={autoReloadAmount}
                  onChange={(e) => setAutoReloadAmount(Number(e.target.value))}
                  disabled={!autoReloadEnabled}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
                >
                  <option value={25}>$25.00 Reload (Base $25.00 Credit)</option>
                  <option value={50}>$50.00 Reload (+5% Bonus &rarr; $52.50 Credit)</option>
                  <option value={100}>$100.00 Reload (+10% Bonus &rarr; $110.00 Credit) [Most Popular]</option>
                  <option value={250}>$250.00 Reload (+10% Bonus &rarr; $275.00 Credit)</option>
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <label className="text-zinc-400 uppercase text-[10px]">3. Monthly Safety Budget Cap</label>
                <select
                  value={monthlyReloadCap}
                  onChange={(e) => setMonthlyReloadCap(Number(e.target.value))}
                  disabled={!autoReloadEnabled}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
                >
                  <option value={250}>Maximum $250.00 / month</option>
                  <option value={500}>Maximum $500.00 / month (Recommended)</option>
                  <option value={1000}>Maximum $1,000.00 / month</option>
                  <option value={5000}>Maximum $5,000.00 / month</option>
                </select>
                <span className="text-[11px] text-zinc-500 block font-sans">
                  Prevents runaway agent execution bills by hard-capping total automatic charges per calendar month.
                </span>
              </div>
            </div>
          </div>

          {/* Payment Card & Notification Preferences */}
          <div className="lg:col-span-4 space-y-6">
            <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Payment Method on File
              </h3>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-white font-bold text-xs flex items-center justify-center font-mono">
                    VISA
                  </div>
                  <div className="font-mono text-xs">
                    <div className="text-white font-bold">•••• 4242</div>
                    <div className="text-zinc-500 text-[10px]">Expires 12/28 • Default</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Active
                </span>
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                Notification Preferences
              </h3>

              <label className="flex items-start gap-3 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailAlertsOnReload}
                  onChange={(e) => setEmailAlertsOnReload(e.target.checked)}
                  className="mt-0.5 rounded bg-black/50 border-white/10 text-amber-400 focus:ring-0"
                />
                <div className="space-y-0.5">
                  <span className="font-semibold text-white">Email Receipt on Reload</span>
                  <p className="text-[11px] text-zinc-400">Send an instant tax receipt and invoice to billing@acme.ai on every trigger.</p>
                </div>
              </label>
            </div>
          </div>
        </div>
        </AuthRequiredGate>
      </main>
    </div>
  );
}
