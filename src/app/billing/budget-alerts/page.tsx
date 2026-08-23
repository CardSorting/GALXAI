'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { BillingSubNav } from '@/components/dashboard/BillingSubNav';
import {
  BellRing,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sliders,
  DollarSign,
  Mail,
  MessageSquare,
  Lock,
  Flame,
  Check
} from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';

export default function BudgetAlertsPage() {
  const [budgetCap, setBudgetCap] = useState(500);
  const [alert50, setAlert50] = useState(true);
  const [alert75, setAlert75] = useState(true);
  const [alert90, setAlert90] = useState(true);
  const [alert100, setAlert100] = useState(true);

  // Channels
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [emailAddress, setEmailAddress] = useState('engineering-alerts@acme.ai');
  const [slackEnabled, setSlackEnabled] = useState(true);
  const [slackWebhook, setSlackWebhook] = useState('https://hooks.slack.com/services/T00/B00/XXXXX');
  const [haltOnOverspend, setHaltOnOverspend] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [testSuccessMsg, setTestSuccessMsg] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState(false);

  const handleTestPing = () => {
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      setTestSuccessMsg('🔔 Test notification sent to Slack (#ai-infrastructure) and engineering-alerts@acme.ai!');
      setTimeout(() => setTestSuccessMsg(null), 5000);
    }, 600);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMsg(true);
    setTimeout(() => setSaveMsg(false), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Billing', href: '/billing' },
            { label: 'Budget Alerts & Governance' }
          ]}
        />

        <AuthRequiredGate
          title="Sign In to Configure Budget Alerts"
          description="Spending thresholds, Slack and email alert webhooks, and emergency circuit breakers are private to your workspace."
          checkoutAmount={50}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Real-Time Budget Alerts & Spend Governance</h1>
            <p className="text-xs text-zinc-400">
              Trigger automated notifications and circuit-breaker protections across Slack, email, and webhooks when spend milestones are reached.
            </p>
          </div>

          <button
            onClick={handleTestPing}
            disabled={isTesting}
            className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isTesting ? 'Dispatching Test...' : 'Send Test Alert Ping'}</span>
          </button>
        </div>

        <BillingSubNav />

        {testSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{testSuccessMsg}</span>
          </div>
        )}

        {saveMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Budget alert thresholds and webhook endpoints saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Thresholds Grid */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                Monthly Spending Milestones
              </h2>
              <p className="text-xs text-zinc-400">
                Receive proactive alerts as monthly compute charges approach your budget threshold.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">50% Milestone</span>
                  <input
                    type="checkbox"
                    checked={alert50}
                    onChange={(e) => setAlert50(e.target.checked)}
                    className="rounded bg-black/50 border-white/10 text-amber-400 focus:ring-0"
                  />
                </div>
                <div className="text-xl font-bold text-white">${(budgetCap * 0.5).toFixed(2)}</div>
                <span className="text-[10px] text-zinc-500 block font-sans">Early month velocity warning</span>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">75% Milestone</span>
                  <input
                    type="checkbox"
                    checked={alert75}
                    onChange={(e) => setAlert75(e.target.checked)}
                    className="rounded bg-black/50 border-white/10 text-amber-400 focus:ring-0"
                  />
                </div>
                <div className="text-xl font-bold text-cyan-300">${(budgetCap * 0.75).toFixed(2)}</div>
                <span className="text-[10px] text-zinc-500 block font-sans">Mid-month budget check-in</span>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">90% Milestone</span>
                  <input
                    type="checkbox"
                    checked={alert90}
                    onChange={(e) => setAlert90(e.target.checked)}
                    className="rounded bg-black/50 border-white/10 text-amber-400 focus:ring-0"
                  />
                </div>
                <div className="text-xl font-bold text-amber-300">${(budgetCap * 0.9).toFixed(2)}</div>
                <span className="text-[10px] text-zinc-500 block font-sans">High spend advisory</span>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">100% Budget Cap</span>
                  <input
                    type="checkbox"
                    checked={alert100}
                    onChange={(e) => setAlert100(e.target.checked)}
                    className="rounded bg-black/50 border-white/10 text-amber-400 focus:ring-0"
                  />
                </div>
                <div className="text-xl font-bold text-rose-400">${budgetCap.toFixed(2)}</div>
                <span className="text-[10px] text-zinc-500 block font-sans">Hard monthly safety cap</span>
              </div>
            </div>
          </div>

          {/* Notification Channels & Circuit Breaker */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Channels */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BellRing className="w-4 h-4 text-cyan-400" />
                Notification Endpoints
              </h3>

              <div className="space-y-4 font-mono text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-zinc-300 font-sans font-semibold">Slack Webhook URL</label>
                    <input
                      type="checkbox"
                      checked={slackEnabled}
                      onChange={(e) => setSlackEnabled(e.target.checked)}
                      className="rounded bg-black/50 border-white/10 text-amber-400 focus:ring-0"
                    />
                  </div>
                  <input
                    type="text"
                    value={slackWebhook}
                    onChange={(e) => setSlackWebhook(e.target.value)}
                    disabled={!slackEnabled}
                    className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500 disabled:opacity-50 font-mono text-[11px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-zinc-300 font-sans font-semibold">Alert Email Address</label>
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                      className="rounded bg-black/50 border-white/10 text-amber-400 focus:ring-0"
                    />
                  </div>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    disabled={!emailAlerts}
                    className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Circuit Breaker Protection */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Automated Circuit Breaker
                </h3>

                <label className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={haltOnOverspend}
                    onChange={(e) => setHaltOnOverspend(e.target.checked)}
                    className="mt-1 rounded bg-black/50 border-white/10 text-amber-400 focus:ring-0"
                  />
                  <div className="space-y-1">
                    <span className="font-bold text-white text-xs">Halt Low-Priority Batch Tasks at 100% Budget</span>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Automatically pauses background scraper or batch queue keys while keeping interactive IDE and production server keys running smoothly.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="px-8 py-3 rounded-2xl bg-amber-400 text-black font-black text-xs uppercase tracking-wider font-mono hover:bg-amber-300 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  Save Governance Settings
                </button>
              </div>
            </div>
          </div>
        </form>
        </AuthRequiredGate>
      </main>
    </div>
  );
}
