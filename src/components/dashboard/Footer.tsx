'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap,
  Flame,
  ArrowRight,
  Lock
} from 'lucide-react';
import { LanguageBadge } from '@/components/common/LanguageBadge';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';
import { SlaHealthEngine, SlaProbeResult } from '@/lib/resilience/SlaHealthEngine';

function BaseFooter() {
  const pathname = usePathname();
  const [slaStatus, setSlaStatus] = useState<SlaProbeResult | null>(null);

  useEffect(() => {
    const engine = SlaHealthEngine.getInstance();
    const unsubscribe = engine.subscribe(setSlaStatus);
    engine.probe();
    return () => unsubscribe();
  }, []);

  const usesFocusedAppShell =
    !pathname ||
    pathname === '/' ||
    pathname.startsWith('/settings');

  if (usesFocusedAppShell) {
    return null;
  }
  const footerNavigation = {
    product: [
      { name: 'Frontier AI Models', href: '/models', badge: '6 SOTA' },
      { name: 'Speed & Latency Benchmarks', href: '/benchmarks', badge: 'Telemetry' },
      { name: 'Token Savings Calculator', href: '/calculator', badge: 'ROI' },
      { name: 'About GALX AI', href: '/about' },
      { name: 'Careers & Open Roles', href: '/careers', badge: 'Hiring' },
      { name: 'API Quickstart Guide', href: '/docs/quickstart', badge: '30s' },
      { name: 'Model Comparison Matrix', href: '/models/compare' },
      { name: 'Developer API Keys', href: '/keys' },
      { name: 'Compute Wallet & Billing', href: '/billing', badge: 'Autopay' },
      { name: 'Real-Time System Status', href: '/status' },
    ],
    models: [
      { name: 'OpenAI GPT-5.6 Sol', href: '/models/gpt-5.6-sol', note: 'Reasoning & Coding' },
      { name: 'OpenAI GPT-5.6 Terra', href: '/models/gpt-5.6-terra', note: 'Balanced Frontier' },
      { name: 'OpenAI GPT-5.6 Luna', href: '/models/gpt-5.6-luna', note: 'Sub-second Speed' },
      { name: 'OpenAI GPT-Image-2', href: '/models/openai-gpt-image-2', note: 'Visual Engine' },
      { name: 'OpenAI GPT-Image-1.5', href: '/models/openai-gpt-image-1.5', note: 'Photoreal SOTA' },
      { name: 'OpenAI GPT-Image-1', href: '/models/openai-gpt-image-1', note: 'Turbo Diffusion' },
    ],
    developers: [
      { name: 'AI Gateway Glossary', href: '/glossary', badge: 'New' },
      { name: 'Stream Benchmark Studio', href: '/tools/stream-benchmark', badge: 'Simulator' },
      { name: 'Enterprise ROI Calculator', href: '/tools/roi-calculator', badge: 'Budget' },
      { name: 'Context Window Visualizer', href: '/tools/context-window-visualizer', badge: '900K Tokens' },
      { name: 'Latency & TTFT Estimator', href: '/tools/latency-estimator', badge: '<12ms' },
      { name: 'Model Cost Comparator', href: '/tools/model-cost-comparator', badge: 'Pricing' },
      { name: 'Voice Agents Solution', href: '/solutions/autonomous-voice-agents', badge: 'Voice' },
      { name: 'Structured JSON Extraction', href: '/solutions/structured-data-extraction', badge: 'JSON' },
      { name: 'Multi-Agent Swarms', href: '/solutions/multi-agent-swarms', badge: 'Swarms' },
      { name: 'C# .NET SDK Quickstart', href: '/docs/sdks/csharp', badge: '.NET' },
      { name: 'Java Spring Boot SDK', href: '/docs/sdks/java', badge: 'Java' },
      { name: 'AI Token Counter Studio', href: '/tools/token-counter', badge: 'BPE' },
      { name: 'Function Calling Studio', href: '/tools/function-calling-builder', badge: 'Tools' },
      { name: 'Embeddings & Vector Calculator', href: '/tools/embeddings-calculator', badge: 'RAG' },
      { name: 'API Key Health Checker', href: '/tools/api-key-checker', badge: 'Tester' },
      { name: 'JSON Schema to Zod / Pydantic', href: '/tools/json-schema-generator', badge: 'Builder' },
      { name: 'Anycast Edge Architecture', href: '/architecture/anycast-edge-proxy', badge: 'Whitepaper' },
      { name: 'API Request Builder', href: '/tools/api-request-builder', badge: 'Generator' },
      { name: 'Coding LLM Benchmarks', href: '/benchmarks/coding-and-reasoning', badge: 'SOTA' },
      { name: 'Agent Tool Calling Benchmarks', href: '/benchmarks/autonomous-agentic-tool-calling', badge: '99.4%' },
      { name: 'OpenAI Gateway Portal', href: '/providers/openai', badge: 'Wholesale' },
      { name: 'Prompt Compressor Tool', href: '/tools/prompt-compressor', badge: '-35%' },
      { name: 'Claude Code Setup', href: '/docs/integrations/claude-code', badge: 'CLI' },
      { name: 'Continue.dev IDE', href: '/docs/integrations/continue-dev', badge: 'IDE' },
      { name: 'Next.js SSE Streaming', href: '/cookbook/streaming-sse-nextjs', badge: 'Recipe' },
      { name: 'Prompt Caching Tool', href: '/tools/prompt-caching-calculator', badge: '-75%' },
      { name: 'Migrate from OpenAI Direct', href: '/migrate/openai-direct', badge: '-35%' },
      { name: 'Cursor & IDE Setup', href: '/docs/integrations/cursor' },
      { name: 'Coding Agents Fleet', href: '/solutions/coding-agents', badge: 'Solution' },
      { name: 'Together AI Alternative', href: '/alternatives/together-ai', badge: 'Wholesale' },
      { name: 'Portkey Alternative', href: '/alternatives/portkey', badge: '0% Fee' },
      { name: 'OpenRouter Alternative', href: '/alternatives/openrouter', badge: '0% Fee' },
      { name: 'REST & SSE API Reference', href: '/docs/api-reference' },
    ],
    enterpriseFinance: [
      { name: 'Small Business & Squad Seats', href: '/solutions/small-business', badge: '5 Included' },
      { name: 'Seats & Member Governance', href: '/teams/seats', badge: 'Roster' },
      { name: 'Pending Invites & Magic Links', href: '/teams/invites' },
      { name: 'Member Spend Caps & Safety', href: '/teams/spend-limits' },
      { name: 'Cost Center & Squad Budgets', href: '/teams/cost-centers' },
      { name: 'Security & 2FA Policies', href: '/teams/security' },
      { name: 'Enterprise Fleet & Net-30', href: '/solutions/enterprise', badge: '40% OFF' },
      { name: 'Business Tax Invoices', href: '/billing/invoices', badge: 'PDF' },
      { name: 'Inference Expense Reports', href: '/billing/expenses' },
      { name: 'Auto-Top Up Safeguards', href: '/billing/auto-reload', badge: 'Zero-Downtime' },
      { name: 'Budget Alerts & Webhooks', href: '/billing/budget-alerts' },
      { name: 'SOC2 Tamper-Evident Audit', href: '/billing/audit-logs' },
    ],
    pricingAndTrust: [
      { name: 'Wholesale Pricing & Tiers', href: '/pricing', badge: '25%-40% OFF' },
      { name: 'OpenAI Outage Postmortem', href: '/postmortems/openai-major-outage-failover', badge: 'Postmortem' },
      { name: 'Prompt Injection Defense', href: '/security/patterns/prompt-injection-defense', badge: 'OWASP 01' },
      { name: 'Cybersecurity & SOC Triage', href: '/industries/cybersecurity-and-soc', badge: 'SOC 2' },
      { name: 'Automotive & Robotics AI', href: '/industries/automotive-and-robotics', badge: 'Edge' },
      { name: 'Education & EdTech AI', href: '/industries/education-and-edtech', badge: 'FERPA' },
      { name: 'Healthcare & Life Sciences', href: '/industries/healthcare-and-lifesciences', badge: 'HIPAA/BAA' },
      { name: 'Active-Active Failover SLA', href: '/reliability/preventing-outages-during-openai-downtime', badge: '99.99%' },
      { name: 'EU AI Act Compliance', href: '/security/eu-ai-act', badge: 'Compliant' },
      { name: 'OpenRouter vs GALXAI', href: '/alternatives/openrouter' },
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
              <span>50% INSTANT COMPUTE MATCH ON DEPOSITS</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">Cut your OpenAI inference bills by 25%–40% today</h3>
            <p className="text-xs text-zinc-400">100% drop-in OpenAI SDK compatibility. Zero code refactoring. Active failover resilience.</p>
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
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-[1px] shadow-lg shadow-cyan-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
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
              The universal AI gateway and 429 burst shield delivering 25%–40% token savings, sub-15ms failover, and 75% prompt cache pass-through.
            </p>

            <div className="pt-2">
              <Link
                href="/status"
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-mono transition-colors ${
                  slaStatus?.status === 'offline'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    slaStatus?.status === 'offline' ? 'bg-amber-400' : 'bg-emerald-400'
                  } animate-pulse`}
                />
                <span>
                  {slaStatus?.status === 'offline'
                    ? 'Offline Mode (Cached)'
                    : 'Active • All Systems Operational'}
                </span>
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
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 group-hover:text-cyan-300 border border-white/5">
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
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 group-hover:text-amber-300 border border-white/5">
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
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
              <span>Zero Content Retention Enforced</span>
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

function FooterFallback() {
  return (
    <footer className="border-t border-white/10 bg-[#07090e] py-6 px-4 text-xs text-zinc-500 font-mono">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
        <span>© 2026 GALXAI, Inc. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <Link href="/models" className="hover:text-white transition-colors">Models</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/billing" className="hover:text-white transition-colors">Billing</Link>
          <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
        </div>
      </div>
    </footer>
  );
}

export const Footer = withErrorBoundary(BaseFooter, {
  name: 'Global Footer',
  fallback: <FooterFallback />
});
