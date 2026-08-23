'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { BillingSubNav } from '@/components/dashboard/BillingSubNav';
import {
  Webhook,
  Send,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Check,
  X,
  Lock,
  Radio,
  KeyRound,
  ExternalLink,
  Code
} from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  status: 'active' | 'failing';
  lastDelivery: string;
}

const INITIAL_WEBHOOKS: WebhookEndpoint[] = [
  {
    id: 'wh_slack_fin',
    name: 'Slack #finance-alerts Webhook',
    url: 'https://hooks.slack.com/services/T0123/B0456/7890abcdef',
    events: ['billing.threshold.90', 'billing.auto_reload.success', 'key.created'],
    secret: 'whsec_9a8b7c6d5e4f3a2b1c0d',
    status: 'active',
    lastDelivery: 'Today at 04:15 UTC (200 OK)'
  },
  {
    id: 'wh_datadog',
    name: 'Datadog SIEM Security Audit Pipeline',
    url: 'https://http-intake.logs.datadoghq.com/api/v2/logs',
    events: ['key.deleted', 'budget.cap.exceeded', 'auth.failure'],
    secret: 'whsec_dd8192a73c091f82b',
    status: 'active',
    lastDelivery: 'Yesterday at 22:45 UTC (200 OK)'
  }
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(INITIAL_WEBHOOKS);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['billing.auto_reload.success']);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<string | null>(null);

  const availableEvents = [
    { id: 'billing.auto_reload.success', label: 'Auto-Reload Executed (+Credit Added)' },
    { id: 'billing.threshold.90', label: 'Spend Milestone 90% Reached' },
    { id: 'budget.cap.exceeded', label: 'Budget Cap 100% Breached' },
    { id: 'key.created', label: 'New API Key Minted' },
    { id: 'key.deleted', label: 'API Key Revoked / Deleted' },
    { id: 'auth.failure', label: 'Suspicious Auth Failure Spike' }
  ];

  const handleToggleEvent = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId]
    );
  };

  const handleAddWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    const newWh: WebhookEndpoint = {
      id: `wh_${Date.now()}`,
      name: name.trim(),
      url: url.trim(),
      events: selectedEvents,
      secret: `whsec_${Math.random().toString(36).substring(2, 15)}`,
      status: 'active',
      lastDelivery: 'Never delivered'
    };

    setWebhooks([...webhooks, newWh]);
    setIsAdding(false);
    setName('');
    setUrl('');
  };

  const handleTestDispatch = (whId: string) => {
    setIsTesting(whId);
    setTimeout(() => {
      setIsTesting(null);
      setTestResult(`⚡ HMAC-SHA256 test payload delivered to endpoint (HTTP 200 OK - 12ms latency)!`);
      setTimeout(() => setTestResult(null), 5000);
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Billing', href: '/billing' },
            { label: 'Spend Governance', href: '/billing/budget-alerts' },
            { label: 'Webhook Integrations' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Enterprise Webhooks & Event Streams</h1>
            <p className="text-xs text-zinc-400">
              Stream signed financial events and billing telemetry in real-time to Slack, Datadog, PagerDuty, or custom backend endpoints.
            </p>
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider font-mono flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Webhook Endpoint</span>
          </button>
        </div>

        <BillingSubNav />

        <AuthRequiredGate
          title="Sign In to Manage Webhook Subscriptions"
          description="Webhook endpoint URLs, HMAC signing secrets, and event delivery pipelines are private to your workspace."
          checkoutAmount={50}
        >
          {testResult && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{testResult}</span>
          </div>
        )}

        {/* Add Webhook Drawer */}
        {isAdding && (
          <form onSubmit={handleAddWebhook} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-amber-500/30 bg-black/50 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Webhook className="w-4 h-4 text-amber-400" />
                Register New Webhook Endpoint
              </h3>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 uppercase text-[10px]">Endpoint Friendly Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Billing SIEM"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 uppercase text-[10px]">Destination HTTPS URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://api.yourdomain.com/webhooks/galxai"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-zinc-400 uppercase text-[10px] font-mono">Subscribed Events</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {availableEvents.map((evt) => (
                  <label
                    key={evt.id}
                    onClick={() => handleToggleEvent(evt.id)}
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                      selectedEvents.includes(evt.id)
                        ? 'bg-amber-500/10 border-amber-500/30 text-white'
                        : 'bg-black/30 border-white/5 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(evt.id)}
                      onChange={() => {}}
                      className="rounded bg-black/50 border-white/10 text-amber-400 focus:ring-0"
                    />
                    <div className="font-mono text-[11px]">{evt.label}</div>
                  </label>
                ))}
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
                Save & Sign Webhook
              </button>
            </div>
          </form>
        )}

        {/* Webhooks Grid */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            Configured Webhook Endpoints
          </h2>

          <div className="space-y-4 font-mono text-xs">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3 hover:border-white/20 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-sans text-sm">{wh.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] font-bold border border-emerald-500/20">
                        Active
                      </span>
                    </div>
                    <code className="text-zinc-400 text-[11px] truncate block max-w-xl">{wh.url}</code>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestDispatch(wh.id)}
                      disabled={isTesting === wh.id}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer font-sans font-semibold border border-white/5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isTesting === wh.id ? 'Sending...' : 'Test Ping'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-zinc-500">
                  <div className="flex items-center gap-2">
                    <span>Events: <strong>{wh.events.length} subscribed</strong></span>
                    <span>•</span>
                    <span>Signing Secret: <code className="text-zinc-400">{wh.secret.slice(0, 10)}...</code></span>
                  </div>
                  <span className="text-zinc-400">{wh.lastDelivery}</span>
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
