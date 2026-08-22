'use client';

import React from 'react';
import Link from 'next/link';
import {
  Zap,
  Key,
  Terminal,
  Cpu,
  Coins,
  ShieldCheck,
  Activity,
  Code2,
  HelpCircle,
  ArrowRight,
  Flame,
  Globe,
  ExternalLink,
  Laptop,
  CheckCircle2,
  Lock,
  GitCompare,
  Building2,
  PieChart,
  Users2,
  FileCheck
} from 'lucide-react';
import { LanguageBadge } from '@/components/common/LanguageBadge';

export function Footer() {
  const footerNavigation = {
    product: [
      { name: 'Frontier AI Models', href: '/models', badge: '12 SOTA' },
      { name: 'API Quickstart Guide', href: '/docs/quickstart', badge: '30s' },
      { name: 'Model Comparison Matrix', href: '/models/compare' },
      { name: 'Developer API Keys', href: '/keys' },
      { name: 'Compute Wallet & Billing', href: '/billing', badge: 'Autopay' },
      { name: 'Real-Time Status & 99.99% SLA', href: '/status' },
    ],
    models: [
      { name: 'OpenAI GPT-5.6 Sol', href: '/models/gpt-5.6-sol', note: 'Reasoning & Coding' },
      { name: 'OpenAI GPT-5.6 Terra', href: '/models/gpt-5.6-terra', note: 'Balanced Frontier' },
      { name: 'OpenAI GPT-5.6 Luna', href: '/models/gpt-5.6-luna', note: 'Sub-second Speed' },
      { name: 'xAI Grok 4.5 (500K)', href: '/models/x-ai-grok-4.5', note: 'Multimodal' },
      { name: 'OpenAI GPT-Image-2', href: '/models/openai-gpt-image-2', note: 'Visual Engine' },
      { name: 'OpenAI DALL-E 3', href: '/models/openai-dalle-3', note: 'High Definition' },
    ],
    developers: [
      { name: 'Async Requests & Results', href: '/queues' },
      { name: '30-Second Quickstart', href: '/docs/quickstart' },
      { name: 'REST & SSE API Reference', href: '/docs/api-reference' },
      { name: 'Cursor & Windsurf IDE Setup', href: '/docs/ide-setup' },
      { name: 'Python & Node.js SDKs', href: '/docs/sdks' },
      { name: 'Gateway Architecture', href: '/docs/architecture' },
    ],
    enterpriseFinance: [
      { name: 'Business Tax Invoices', href: '/billing/invoices', badge: 'PDF' },
      { name: 'Cost Center & Team Budgets', href: '/billing/teams' },
      { name: 'Inference Expense Reports', href: '/billing/expenses' },
      { name: 'Auto-Top Up Safeguards', href: '/billing/auto-reload', badge: 'Zero-Downtime' },
      { name: 'Budget Alerts & Webhooks', href: '/billing/budget-alerts' },
      { name: 'SOC2 Tamper-Evident Audit', href: '/billing/audit-logs' },
      { name: 'Enterprise Volume Contracts', href: '/billing/enterprise', badge: '40% OFF' },
    ],
    pricingAndTrust: [
      { name: 'Builder Grants ($2,500 Match)', href: '/grants', badge: 'Fund' },
      { name: 'Wholesale Pricing & Tiers', href: '/pricing', badge: '25%-40% OFF' },
      { name: '75% Prompt Caching Pass', href: '/pricing#caching' },
      { name: 'Enterprise Compliance & DPA', href: '/compliance', badge: 'HIPAA/GDPR' },
      { name: 'Frequently Asked Questions', href: '/faq' },
      { name: 'Zero-Retention Privacy Policy', href: '/faq' },
      { name: 'Security & Encryption Specs', href: '/faq' },
    ]
  };

  return (
    <footer className="w-full border-t border-white/10 bg-[#07080d]/90 backdrop-blur-xl relative z-20 mt-20">
      {/* Top Value / Conversion Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-b border-white/5">
        <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-emerald-500/20 bg-emerald-500/5">
          <div className="space-y-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>FOUNDING BUILDER GRANT • 50% COMPUTE MATCH ON DEPOSITS</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">Cut your OpenAI &amp; Grok inference bills by 25%–40% today</h3>
            <p className="text-xs text-zinc-400">100% drop-in OpenAI SDK compatibility. Zero code refactoring. 99.99% enterprise uptime SLA.</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/keys/new"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer font-mono"
            >
              <span>Claim $5 Key + 50% Match</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/billing/enterprise"
              className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold border border-white/10 transition-all"
            >
              <span>Enterprise Volume (40%)</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main 5-Column Navigation Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand & Global Status Column */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/25 flex items-center justify-center group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#0d101c] rounded-[10px] flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400 animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-wider text-white">
                  GALX<span className="text-cyan-400">AI</span>
                </span>
              </div>
            </Link>

            <p className="text-xs text-zinc-400 leading-relaxed">
              The high-throughput universal AI model gateway delivering wholesale pricing, sub-15ms failover, and 75% prompt caching.
            </p>

            <div className="pt-2">
              <Link
                href="/status"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 hover:bg-emerald-500/20 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>All Systems 100% Operational</span>
              </Link>
            </div>
          </div>

          {/* Product Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Product & Gateway</h4>
            <ul className="space-y-2 text-xs">
              {footerNavigation.product.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-zinc-400 hover:text-white transition-colors flex items-center justify-between group"
                  >
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 group-hover:text-cyan-300 border border-white/5">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Frontier Models Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Frontier AI Engines</h4>
            <ul className="space-y-2 text-xs font-mono">
              {footerNavigation.models.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-zinc-400 hover:text-cyan-300 transition-colors block group"
                  >
                    <div className="font-semibold text-zinc-300 group-hover:text-cyan-300">{item.name}</div>
                    <span className="text-[10px] text-zinc-500 block font-sans">{item.note}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Enterprise & Financial Governance Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Enterprise & Finance</h4>
            <ul className="space-y-2 text-xs">
              {footerNavigation.enterpriseFinance.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-zinc-400 hover:text-white transition-colors flex items-center justify-between group"
                  >
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 group-hover:text-amber-300 border border-white/5">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing & Trust Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Pricing & Trust</h4>
            <ul className="space-y-2 text-xs">
              {footerNavigation.pricingAndTrust.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-zinc-400 hover:text-white transition-colors flex items-center justify-between group"
                  >
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Legal & Security Bar */}
      <div className="border-t border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500 font-mono">
          <div className="flex items-center gap-4">
            <span>© 2026 GALXAI, Inc. All rights reserved.</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-zinc-400">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Zero Content Retention Certified</span>
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end">
            <LanguageBadge />
            <Link href="/pricing" className="hover:text-zinc-300 transition-colors">Pricing</Link>
            <Link href="/billing/enterprise" className="hover:text-zinc-300 transition-colors">Enterprise</Link>
            <Link href="/docs/api-reference" className="hover:text-zinc-300 transition-colors">API Docs</Link>
            <Link href="/status" className="hover:text-zinc-300 transition-colors">System Status</Link>
            <Link href="/compliance" className="hover:text-zinc-300 transition-colors">Compliance & DPA</Link>
            <Link href="/faq" className="hover:text-zinc-300 transition-colors">FAQs</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
