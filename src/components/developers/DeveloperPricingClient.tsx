'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { EXCLUSIVE_MODEL_CATALOG, type ModelSpecItem } from '@/core/router/PublicModelCatalog';
import { STRIPE_CHECKOUT_PACKS, calculateComputeCredit } from '@/lib/stripe/config';
import {
  Zap,
  Check,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Terminal,
  Copy,
  Code2,
  SlidersHorizontal,
  Layers,
  Cpu,
  HelpCircle,
  Clock,
  Flame,
  ArrowUpRight,
  Globe,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

const CODE_EXAMPLES = {
  python: `from openai import OpenAI

# Drop-in compatible with standard OpenAI SDK
client = OpenAI(
    api_key="galx_live_...",
    base_url="https://api.galx.ai/v1"
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Architect a high-performance streaming pipeline."}]
)
print(response.choices[0].message.content)`,

  typescript: `import OpenAI from 'openai';

// 100% drop-in replacement for OpenAI SDK in TypeScript / Node
const openai = new OpenAI({
  apiKey: process.env.GALX_API_KEY,
  baseURL: 'https://api.galx.ai/v1',
});

const completion = await openai.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Design an event-driven microservices schema.' }],
});
console.log(completion.choices[0].message.content);`,

  curl: `curl https://galx.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer galx_live_..." \\
  -d '{
    "model": "gpt-5-6-luna",
    "messages": [{"role": "user", "content": "Hello, agentic coding world!"}]
  }'`,

  cursor: `// In Cursor / Windsurf Settings -> OpenAI API:
// Base URL: https://galx.ai/v1
// API Key:  galx_live_your_api_key_here
// Override Models: gpt-5-6-luna`,
};

export function DeveloperPricingClient() {
  const { user } = useAuth();
  const [busyAmount, setBusyAmount] = useState<number | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'python' | 'typescript' | 'curl' | 'cursor'>('typescript');

  // Interactive Calculator State
  const [monthlyTokensMillions, setMonthlyTokensMillions] = useState<number>(50);
  const [cacheHitPercent, setCacheHitPercent] = useState<number>(60);
  const [selectedModelId, setSelectedModelId] = useState<string>('gpt-5-6-luna');

  // Model filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'reasoning' | 'balanced' | 'fast' | 'image'>('all');

  const selectedModel = useMemo(() => {
    return EXCLUSIVE_MODEL_CATALOG.find(m => m.id === selectedModelId) || EXCLUSIVE_MODEL_CATALOG[0];
  }, [selectedModelId]);

  // Calculator computations
  const estimatedCost = useMemo(() => {
    const inputRatio = 0.7;
    const outputRatio = 0.3;
    const totalTokens = monthlyTokensMillions;
    const inputTokens = totalTokens * inputRatio;
    const outputTokens = totalTokens * outputRatio;

    const cachedInputTokens = inputTokens * (cacheHitPercent / 100);
    const standardInputTokens = inputTokens * (1 - cacheHitPercent / 100);

    const inputRate = selectedModel.inputPricePer1M;
    const cachedRate = selectedModel.cachedInputPricePer1M ?? (inputRate * 0.25);
    const outputRate = selectedModel.outputPricePer1M;

    const baseCost = (standardInputTokens * inputRate) + (cachedInputTokens * cachedRate) + (outputTokens * outputRate);
    const unCachedCost = (inputTokens * inputRate) + (outputTokens * outputRate);
    const cacheSavings = Math.max(0, unCachedCost - baseCost);

    // Recommended package
    let recommendedTier = 10;
    if (baseCost > 250) recommendedTier = 500;
    else if (baseCost > 100) recommendedTier = 250;
    else if (baseCost > 50) recommendedTier = 100;
    else if (baseCost > 25) recommendedTier = 50;
    else if (baseCost > 10) recommendedTier = 25;

    return {
      baseCost: Math.max(0.1, Number(baseCost.toFixed(2))),
      unCachedCost: Number(unCachedCost.toFixed(2)),
      cacheSavings: Number(cacheSavings.toFixed(2)),
      recommendedTier,
    };
  }, [monthlyTokensMillions, cacheHitPercent, selectedModel]);

  // Filtered Models
  const filteredModels = useMemo(() => {
    return EXCLUSIVE_MODEL_CATALOG.filter(m => {
      const matchesSearch = m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'reasoning') return m.supportsReasoning;
      if (selectedCategory === 'image') return m.category === 'image';
      if (selectedCategory === 'fast') return m.id.includes('luna') || m.id.includes('mini');
      if (selectedCategory === 'balanced') return m.id.includes('terra') || (!m.supportsReasoning && m.category === 'llm');
      return true;
    });
  }, [searchQuery, selectedCategory]);

  const handleCopy = (key: string, text: string) => {
    safeCopyToClipboard(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  async function handlePurchaseTier(amount: number) {
    if (busyAmount !== null) return;
    setBusyAmount(amount);
    setErrorNotice(null);

    try {
      const requestId = crypto.randomUUID();
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {})
        },
        body: JSON.stringify({
          amount,
          requestId,
          returnPath: '/developers?developer_checkout=returned'
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not start checkout.');
      const target = new URL(result.url);
      if (target.protocol !== 'https:' || target.hostname !== 'checkout.stripe.com') {
        throw new Error('Could not open secure checkout.');
      }
      window.location.assign(target.href);
    } catch (e: any) {
      setErrorNotice(e?.message || 'Could not open checkout. Please check your connection and try again.');
      setBusyAmount(null);
    }
  }

  const tiers = [
    {
      amount: 10,
      name: 'Developer Tier',
      tagline: 'Instant API Access Pass',
      badge: 'INSTANT UNLOCK ⚡',
      isPopular: true,
      concurrency: '60 RPM / 40k TPM',
      welcome: '$0.00',
      match: '$0.00',
      totalUsable: '$10.00',
      description: 'Instant Developer Tier activation. 100% pay-as-you-go prepaid credit for Images & Frontier models without waitlist delay.',
      perks: [
        'Instant API Key minting (/keys) with zero waitlist',
        'Drop-in OpenAI SDK & Cursor/Windsurf compatibility',
        'Full $10.00 Pay-As-You-Go compute balance',
        'Images API generation (/v1/images/generations)',
        'Standard Tier 1 throughput with safety spend caps',
      ],
      buttonLabel: 'Get Developer Tier ($10)',
    },
    {
      amount: 25,
      name: 'Starter Builder',
      tagline: '50% Compute Match',
      badge: '50% MATCH',
      isPopular: false,
      concurrency: '120 RPM Concurrency',
      welcome: '$5.00',
      match: '$12.50 (50%)',
      totalUsable: '$42.50',
      description: 'Ideal for early-stage builders deploying production prototypes and agentic workflows.',
      perks: [
        'All Developer Tier capabilities included',
        '$42.50 total usable compute credit',
        '75% Prompt Cache pass-through discount',
        'Standard Rate Lock Guarantee',
        'Standard Email & Community Discord Support',
      ],
      buttonLabel: 'Get Starter Pack ($25)',
    },
    {
      amount: 50,
      name: 'Growth VIP',
      tagline: 'Sub-15ms VIP Priority Lane',
      badge: 'VIP HIGH-ROLLER 🔓',
      isPopular: true,
      concurrency: '300 RPM Concurrency',
      welcome: '$5.00',
      match: '$30.00 (60%)',
      totalUsable: '$85.00',
      description: 'Engineered for scaling agentic fleets requiring dedicated high-throughput concurrency lanes.',
      perks: [
        'Sub-15ms VIP Priority Routing Lane',
        '300 RPM Burst Concurrency Capacity',
        '$85.00 total usable compute credit (60% Match)',
        'Automatic Failover Anycast Routing',
        'Priority Technical Support Lane',
      ],
      buttonLabel: 'Get Growth VIP ($50)',
    },
    {
      amount: 100,
      name: 'Fleet Scale',
      tagline: '600 RPM Autonomous Swarms',
      badge: '75% SCALE MATCH 🚀',
      isPopular: false,
      concurrency: '600 RPM Concurrency',
      welcome: '$5.00',
      match: '$75.00 (75%)',
      totalUsable: '$180.00',
      description: 'Built for high-velocity teams running automated multi-agent code analysis & bulk image pipelines.',
      perks: [
        '600 RPM High-Concurrency Pipeline',
        '$180.00 total compute credit (75% match)',
        'Priority Global Edge Ingestion',
        'Prompt Caching multi-turn persistence',
        'Direct Discord Architect Support Channel',
      ],
      buttonLabel: 'Get Fleet Scale ($100)',
    },
    {
      amount: 250,
      name: 'Enterprise Sovereign',
      tagline: 'Dedicated VPC & Double Match',
      badge: '100% DOUBLE MATCH 👑',
      isPopular: false,
      concurrency: '1,200 RPM Concurrency',
      welcome: '$5.00',
      match: '$250.00 (100%)',
      totalUsable: '$505.00',
      description: 'Maximum 100% double compute match with dedicated isolated VPC compute lanes.',
      perks: [
        '2.00x 100% Double Match ($505 Total Usable Credit)',
        'Dedicated VPC Private Lane & Vault',
        '1,200 RPM Concurrency Capacity',
        'Custom Corporate Invoicing & ACH Terms',
        'Dedicated Account Infrastructure Engineer',
      ],
      buttonLabel: 'Get Sovereign Pack ($250)',
    },
    {
      amount: 500,
      name: 'Hyperscale Infra',
      tagline: 'Unlimited Burst & Custom SLA',
      badge: '100% DOUBLE MATCH ✨',
      isPopular: false,
      concurrency: 'Unlimited Burst',
      welcome: '$5.00',
      match: '$500.00 (100%)',
      totalUsable: '$1,005.00',
      description: 'Enterprise-grade SLA guarantee with unlimited burst and dedicated Slack bridge.',
      perks: [
        '$1,005.00 total usable compute credit',
        'Unlimited Concurrency Burst & Dedicated Route',
        '99.99% Availability Custom SLA Guarantee',
        'Direct Private Slack Channel with Core Team',
        'Custom Fine-Tuning & Model Weight Cache',
      ],
      buttonLabel: 'Get Hyperscale ($500)',
    },
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 selection:bg-indigo-500 selection:text-white">
      <Navigation />
      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Developers', href: '/developers' }, { label: 'Pricing & Compute Tiers' }]} />

        {/* Hero Section */}
        <header className="relative mt-4 overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/40 via-[#0d101c] to-[#07090e] p-8 sm:p-12">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">
              <Sparkles size={14} className="text-indigo-400 animate-pulse" />
              <span>Developer API & Pay-As-You-Go Tiers</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Frontier Intelligence. <br />
              <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-indigo-100 bg-clip-text text-transparent">
                Sustainable Developer Compute.
              </span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-zinc-300 sm:text-lg">
              A creative playground and sustainable developer platform serving OpenAI GPT-5.6 Luna. Private internal testing confirmed GPT-5.6 Luna delivers the highest performance per dollar so developers can test, build, and reach their goals without being constrained by quality, price, or exploration.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a href="#tiers" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30">
                Explore Compute Tiers <ArrowRight size={16} />
              </a>
              <a href="#calculator" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-zinc-200 transition-all hover:bg-white/10 hover:text-white">
                <SlidersHorizontal size={16} /> Estimate Workload
              </a>
              <Link href="/keys" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-300 hover:text-indigo-200 underline underline-offset-4">
                Manage API Keys <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
          {/* Subtle background glow effect */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />
        </header>

        {errorNotice && (
          <div className="mt-6 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200" role="alert">
            {errorNotice}
          </div>
        )}

        {/* Value Prop Badges */}
        <section className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-white/5 bg-[#0d101c] p-4">
            <div className="flex items-center gap-2.5 text-indigo-400">
              <Zap size={18} />
              <span className="font-semibold text-zinc-200">Instant Unlock</span>
            </div>
            <p className="mt-1.5 text-xs text-zinc-400">Purchase $10 tier to unlock API keys immediately without waitlist.</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#0d101c] p-4">
            <div className="flex items-center gap-2.5 text-emerald-400">
              <Flame size={18} />
              <span className="font-semibold text-zinc-200">Up to 100% Match</span>
            </div>
            <p className="mt-1.5 text-xs text-zinc-400">Deposits receive instant compute bonuses from $5 to $500.</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#0d101c] p-4">
            <div className="flex items-center gap-2.5 text-sky-400">
              <Lock size={18} />
              <span className="font-semibold text-zinc-200">ZDR Enclaves</span>
            </div>
            <p className="mt-1.5 text-xs text-zinc-400">Zero Data Retention guarantee; inputs and outputs are never stored.</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#0d101c] p-4">
            <div className="flex items-center gap-2.5 text-purple-400">
              <Globe size={18} />
              <span className="font-semibold text-zinc-200">OpenAI Drop-In</span>
            </div>
            <p className="mt-1.5 text-xs text-zinc-400">Change 1 line in OpenAI SDK or Cursor/Windsurf to connect.</p>
          </div>
        </section>

        {/* Tiers Grid */}
        <section id="tiers" className="scroll-mt-24 pt-16">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Prepaid Compute Tiers & Passes</h2>
              <p className="mt-1 text-sm text-zinc-400">One-time deposits with non-expiring compute balances. Zero hidden subscriptions.</p>
            </div>
            <div className="text-xs text-zinc-400">
              Looking for unlimited Image Studio creation? <Link href="/pricing" className="text-indigo-400 underline hover:text-indigo-300">View GALX Pro ($10/mo)</Link>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tiers.map((tier) => {
              const isSelected = busyAmount === tier.amount;
              return (
                <div
                  key={tier.amount}
                  className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-200 ${
                    tier.isPopular
                      ? 'border-indigo-500/50 bg-gradient-to-b from-[#13172e] to-[#0d101c] shadow-xl shadow-indigo-950/50'
                      : 'border-white/10 bg-[#0d101c] hover:border-white/20'
                  }`}
                >
                  {tier.badge && (
                    <div className="absolute -top-3 right-6 rounded-full bg-indigo-500 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-white shadow-md">
                      {tier.badge}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">{tier.tagline}</p>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-white">${tier.amount}</span>
                      <span className="text-xs text-zinc-400">USD one-time</span>
                    </div>

                    {/* Credit calculation breakdown box */}
                    <div className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-3 text-xs leading-relaxed text-zinc-300">
                      <div className="flex justify-between font-medium">
                        <span>Total Usable Credit:</span>
                        <strong className="text-indigo-300 font-bold">{tier.totalUsable}</strong>
                      </div>
                      <div className="mt-1 flex justify-between text-[11px] text-zinc-400">
                        <span>Deposit: ${tier.amount}.00</span>
                        <span>Match Grant: {tier.match}</span>
                      </div>
                      <div className="mt-0.5 flex justify-between text-[11px] text-zinc-400">
                        <span>Welcome Grant: {tier.welcome}</span>
                        <span>Concurrency: {tier.concurrency}</span>
                      </div>
                    </div>

                    <p className="mt-4 text-xs leading-5 text-zinc-300">{tier.description}</p>

                    <ul className="mt-5 space-y-2 text-xs text-zinc-300">
                      {tier.perks.map((perk, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5">
                    <button
                      onClick={() => handlePurchaseTier(tier.amount)}
                      disabled={busyAmount !== null}
                      className={`w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-all ${
                        tier.isPopular
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50'
                          : 'border border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white disabled:opacity-50'
                      }`}
                    >
                      {isSelected ? 'Redirecting to Stripe…' : tier.buttonLabel}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Interactive Workload & Cost Calculator */}
        <section id="calculator" className="scroll-mt-24 pt-16">
          <div className="rounded-2xl border border-white/10 bg-[#0d101c] p-6 sm:p-10">
            <div className="max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Interactive Estimator</span>
              <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Calculate Your Real Inference Costs</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Adjust token throughput and caching hit rates to estimate your monthly spend across frontier OpenAI models and matched compute tiers.
              </p>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-12">
              {/* Sliders Area */}
              <div className="space-y-6 lg:col-span-7">
                {/* Model Selector */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Select Target Frontier Model
                  </label>
                  <select
                    value={selectedModelId}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/15 bg-[#07090e] px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  >
                    {EXCLUSIVE_MODEL_CATALOG.filter(m => m.category === 'llm').map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} (${model.inputPricePer1M.toFixed(2)} in / ${model.outputPricePer1M.toFixed(2)} out per 1M)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Token Volume Slider */}
                <div>
                  <div className="flex justify-between text-sm">
                    <label className="font-medium text-zinc-200">Monthly Token Volume</label>
                    <span className="font-bold text-indigo-300 tabular-nums">{monthlyTokensMillions} Million Tokens</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="500"
                    step="5"
                    value={monthlyTokensMillions}
                    onChange={(e) => setMonthlyTokensMillions(Number(e.target.value))}
                    className="mt-3 w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <span>1M (Hobbyist)</span>
                    <span>50M (Startup)</span>
                    <span>250M (Production)</span>
                    <span>500M (Scale)</span>
                  </div>
                </div>

                {/* Prompt Cache Hit Ratio Slider */}
                <div>
                  <div className="flex justify-between text-sm">
                    <label className="font-medium text-zinc-200">Prompt Caching Hit Ratio</label>
                    <span className="font-bold text-emerald-400 tabular-nums">{cacheHitPercent}% Cached</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="5"
                    value={cacheHitPercent}
                    onChange={(e) => setCacheHitPercent(Number(e.target.value))}
                    className="mt-3 w-full accent-emerald-500 cursor-pointer"
                  />
                  <p className="mt-1.5 text-xs text-zinc-400">
                    GALX automatically caches repeated system prompts, few-shot examples, and documentation, discounting cached input tokens by up to 75-90%.
                  </p>
                </div>
              </div>

              {/* Estimate Summary Area */}
              <div className="flex flex-col justify-between rounded-xl border border-indigo-500/20 bg-gradient-to-b from-[#13172e] to-[#07090e] p-6 lg:col-span-5">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Estimated Monthly Spend</h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-white tabular-nums">${estimatedCost.baseCost}</span>
                    <span className="text-xs text-zinc-400">USD / mo</span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs border-y border-white/10 py-3 text-zinc-300">
                    <div className="flex justify-between">
                      <span>Standard List Rate:</span>
                      <span className="line-through text-zinc-500">${estimatedCost.unCachedCost}</span>
                    </div>
                    <div className="flex justify-between font-medium text-emerald-400">
                      <span>Prompt Cache Savings:</span>
                      <span>-${estimatedCost.cacheSavings}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Context Window:</span>
                      <span>{(selectedModel.contextWindowTokens / 1000).toFixed(0)}k Tokens</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="text-xs font-medium text-zinc-400">Recommended Compute Pack:</span>
                    <div className="mt-1 flex items-center justify-between font-semibold text-white">
                      <span>${estimatedCost.recommendedTier} Compute Tier</span>
                      <span className="text-xs text-indigo-300">
                        {calculateComputeCredit(estimatedCost.recommendedTier).tier.badge}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => handlePurchaseTier(estimatedCost.recommendedTier)}
                    disabled={busyAmount !== null}
                    className="w-full rounded-lg bg-indigo-600 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {busyAmount === estimatedCost.recommendedTier ? 'Redirecting to Stripe…' : `Purchase $${estimatedCost.recommendedTier} Compute Pack`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Model Rates Catalog Table */}
        <section id="catalog" className="scroll-mt-24 pt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Frontier Model & Visual Synthesis Catalog</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Curated around GPT-5.6 Luna and Image Studio — benchmarked for the highest performance per dollar with zero artificial markups.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2 text-xs">
              {(['all', 'reasoning', 'balanced', 'fast', 'image'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-3 py-1.5 font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  {cat === 'all' ? 'All Models' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-white/10 bg-[#0d101c]">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-white/10 bg-white/[0.02] text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3.5">Model ID</th>
                  <th scope="col" className="px-4 py-3.5">Category</th>
                  <th scope="col" className="px-4 py-3.5">Input / 1M</th>
                  <th scope="col" className="px-4 py-3.5">Cached Input / 1M</th>
                  <th scope="col" className="px-4 py-3.5">Output / 1M</th>
                  <th scope="col" className="px-4 py-3.5">Context Window</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredModels.map(model => (
                  <tr key={model.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <Link href={`/models/${model.id}`} className="hover:text-indigo-300 underline underline-offset-2">
                          {model.id}
                        </Link>
                        {model.supportsReasoning && (
                          <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300">
                            REASONING
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-normal text-zinc-400 line-clamp-1 max-w-xs sm:max-w-sm mt-0.5">
                        {model.description}
                      </div>
                    </td>
                    <td className="px-4 py-4 capitalize text-zinc-300">
                      {model.category === 'image' ? 'Image Generation' : model.supportsReasoning ? 'Deep Reasoning' : 'General LLM'}
                    </td>
                    <td className="px-4 py-4 tabular-nums text-zinc-200">
                      ${model.inputPricePer1M.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 tabular-nums font-medium text-emerald-400">
                      {model.cachedInputPricePer1M ? `$${model.cachedInputPricePer1M.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-4 tabular-nums text-zinc-200">
                      ${model.outputPricePer1M.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 tabular-nums text-zinc-300">
                      {model.contextWindowTokens ? `${(model.contextWindowTokens / 1000).toFixed(0)}k tokens` : 'Standard'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/models/${model.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300"
                      >
                        Specs <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Drop-In SDK Integration Box */}
        <section id="integration" className="scroll-mt-24 pt-16">
          <div className="rounded-2xl border border-white/10 bg-[#0d101c] p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Integration Ergonomics</span>
                <h2 className="mt-1 text-2xl font-bold text-white">100% OpenAI Drop-In Compatibility</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Switch endpoints with standard OpenAI SDKs, LangChain, LlamaIndex, Cursor, or Windsurf by changing <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs text-indigo-300">baseURL</code>.
                </p>
              </div>

              {/* Language Tabs */}
              <div className="flex gap-2">
                {(['typescript', 'python', 'curl', 'cursor'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveCodeTab(tab)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-all ${
                      activeCodeTab === tab
                        ? 'bg-indigo-600 text-white'
                        : 'border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Display Area */}
            <div className="relative mt-6 rounded-xl border border-white/10 bg-[#05070a] p-4 sm:p-6 font-mono text-xs sm:text-sm text-zinc-300">
              <button
                onClick={() => handleCopy('code-snippet', CODE_EXAMPLES[activeCodeTab])}
                className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
                title="Copy code snippet"
              >
                {copiedKey === 'code-snippet' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedKey === 'code-snippet' ? 'Copied' : 'Copy'}</span>
              </button>
              <pre className="overflow-x-auto whitespace-pre leading-relaxed">{CODE_EXAMPLES[activeCodeTab]}</pre>
            </div>
          </div>
        </section>

        {/* Feature Comparison Matrix */}
        <section id="comparison" className="scroll-mt-24 pt-16">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Compare Developer Access Options</h2>
            <p className="mt-2 text-sm text-zinc-400">Choose between instant pay-as-you-go developer compute or free waitlist cohort review.</p>
          </div>

          <div className="mt-8 overflow-x-auto rounded-xl border border-white/10 bg-[#0d101c]">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-white/10 bg-white/[0.02] text-zinc-400">
                <tr>
                  <th scope="col" className="px-4 py-3.5">Capability / Feature</th>
                  <th scope="col" className="px-4 py-3.5">Free Cohort Preview</th>
                  <th scope="col" className="px-4 py-3.5 text-indigo-300 font-bold">Developer Tier ($10)</th>
                  <th scope="col" className="px-4 py-3.5">Growth VIP ($50)</th>
                  <th scope="col" className="px-4 py-3.5">Sovereign / Enterprise ($250+)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                <tr>
                  <td className="px-4 py-3.5 font-medium text-white">Activation Speed</td>
                  <td className="px-4 py-3.5">Manual review (No promised date)</td>
                  <td className="px-4 py-3.5 text-indigo-300 font-bold">Instant (0s delay) ⚡</td>
                  <td className="px-4 py-3.5 font-semibold">Instant ⚡</td>
                  <td className="px-4 py-3.5 font-semibold">Instant / Custom ACH</td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5 font-medium text-white">Usable Compute Credit</td>
                  <td className="px-4 py-3.5">$0.00 (Trial limits)</td>
                  <td className="px-4 py-3.5 text-emerald-400 font-bold">$10.00 (100% usable)</td>
                  <td className="px-4 py-3.5 text-emerald-400 font-bold">$85.00 (60% match)</td>
                  <td className="px-4 py-3.5 text-emerald-400 font-bold">$505.00 - $1,005.00 (100% Double Match)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5 font-medium text-white">Concurrency Limit</td>
                  <td className="px-4 py-3.5">20 RPM</td>
                  <td className="px-4 py-3.5">60 RPM</td>
                  <td className="px-4 py-3.5 text-sky-400 font-semibold">300 RPM (VIP Lane)</td>
                  <td className="px-4 py-3.5 text-sky-400 font-semibold">1,200+ RPM / Unlimited</td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5 font-medium text-white">OpenAI Frontier Models (GPT-5.6)</td>
                  <td className="px-4 py-3.5"><Check size={16} className="text-emerald-400" /></td>
                  <td className="px-4 py-3.5"><Check size={16} className="text-emerald-400" /></td>
                  <td className="px-4 py-3.5"><Check size={16} className="text-emerald-400" /></td>
                  <td className="px-4 py-3.5"><Check size={16} className="text-emerald-400" /></td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5 font-medium text-white">Images Generation API (/v1/images)</td>
                  <td className="px-4 py-3.5"><Check size={16} className="text-emerald-400" /></td>
                  <td className="px-4 py-3.5"><Check size={16} className="text-emerald-400" /></td>
                  <td className="px-4 py-3.5"><Check size={16} className="text-emerald-400" /></td>
                  <td className="px-4 py-3.5"><Check size={16} className="text-emerald-400" /></td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5 font-medium text-white">Zero Data Retention (ZDR) Enclave</td>
                  <td className="px-4 py-3.5"><Check size={16} className="text-emerald-400" /></td>
                  <td className="px-4 py-3.5"><Check size={16} className="text-emerald-400" /></td>
                  <td className="px-4 py-3.5"><Check size={16} className="text-emerald-400" /></td>
                  <td className="px-4 py-3.5"><Check size={16} className="text-emerald-400" /></td>
                </tr>
                <tr>
                  <td className="px-4 py-3.5 font-medium text-white">Dedicated VPC & SLA</td>
                  <td className="px-4 py-3.5">—</td>
                  <td className="px-4 py-3.5">—</td>
                  <td className="px-4 py-3.5">—</td>
                  <td className="px-4 py-3.5 text-purple-400 font-semibold"><Check size={16} className="text-purple-400 inline" /> Dedicated VPC + 99.99% SLA</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Architecture & Consumption Controls */}
        <section className="scroll-mt-24 pt-16">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Predictable Developer Economics</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Built on the proven billing patterns of Twilio, OpenAI, and Stripe. No unbacked loans, zero negative overdrafts, and no surprise postpaid invoices.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Layers size={20} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">1. Prepaid Balance</h3>
              <p className="mt-1 text-xs text-indigo-400 font-medium uppercase tracking-wider">Runway Control</p>
              <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                Your wallet holds non-expiring usage credits. Deposits purchase immediate API runway without locking you into monthly recurring seat fees.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <SlidersHorizontal size={20} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">2. Spend Velocity Cap</h3>
              <p className="mt-1 text-xs text-emerald-400 font-medium uppercase tracking-wider">Safety Control</p>
              <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                Developer-configured daily spend limits act as an automated circuit breaker. If an autonomous agent enters an unexpected loop, execution safely pauses at your limit.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Cpu size={20} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">3. Throughput Tiers</h3>
              <p className="mt-1 text-xs text-sky-400 font-medium uppercase tracking-wider">Capacity Control</p>
              <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                RPM and TPM concurrency limits are governed by account maturity and verified usage. Adding funds increases your runway, protecting all developers from noisy neighbors.
              </p>
            </div>
          </div>
        </section>

        {/* Developer FAQ */}
        <section id="faq" className="scroll-mt-24 pt-16">
          <h2 className="text-2xl font-bold text-white">Developer Pricing FAQ</h2>
          <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
            <details className="group py-4">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-200 hover:text-indigo-300">
                How does the $10 Developer Tier unlock work?
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                When you make a $10 deposit for the Developer Tier, your account is immediately verified and approved in our developer database with $10.00 of usable pay-as-you-go credit. You can generate API keys right away at <Link href="/keys" className="text-indigo-400 underline">/keys</Link> and start calling endpoints for images and frontier OpenAI models with zero waitlist delay.
              </p>
            </details>
            <details className="group py-4">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-200 hover:text-indigo-300">
                Does depositing more money increase my RPM/TPM throughput limits?
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                No. Concurrency limits (RPM and TPM) are governed by your account Tier (Tier 1 starts at 60 RPM / 40k TPM). Adding funds increases your prepaid runway, not your instantaneous burst velocity. Higher throughput tiers unlock automatically as your account matures and completes verified billing cycles.
              </p>
            </details>
            <details className="group py-4">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-200 hover:text-indigo-300">
                Can an infinite loop or runaway agent cause unexpected debts?
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                No. GALX enforces strict zero-negative-balance guarantees. Every streaming request uses atomic two-phase reservations (auth-and-capture) clamped to 1,024-token chunks. Furthermore, your configured Daily Spend Limit acts as a hard stop, completely preventing surprise bills.
              </p>
            </details>
            <details className="group py-4">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-200 hover:text-indigo-300">
                How does Auto-Recharge work?
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                You can configure an optional Auto-Recharge rule (e.g., recharge $10 or $25 when balance drops below $4.00) with a mandatory monthly recharge ceiling. This ensures autonomous agents never halt due to empty wallets while keeping your financial exposure strictly bounded.
              </p>
            </details>
            <details className="group py-4">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-200 hover:text-indigo-300">
                Do prepaid compute credits expire?
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                No. All purchased compute credits and match grants are non-expiring and remain active on your wallet balance until consumed by your API requests.
              </p>
            </details>
            <details className="group py-4">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-200 hover:text-indigo-300">
                Is GALX Pro included in the Developer Tier?
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                No. GALX Pro ($10/mo) is a dedicated subscription for high-velocity Image Studio creation, priority GPU queues, and unlimited prompt remixes. Developer API compute is a separate pay-as-you-go credit pool.
              </p>
            </details>
            <details className="group py-4">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-200 hover:text-indigo-300">
                How does prompt caching save money?
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                When sending multi-turn conversation histories or repeated documentation schemas, the model caches previous input tokens and bills subsequent matching tokens at a 75% to 90% discount.
              </p>
            </details>
          </div>
        </section>

        {/* CTA Footer */}
        <footer className="mt-16 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-[#0d101c] to-indigo-950/40 p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to build with frontier intelligence?</h2>
          <p className="mt-2 text-sm text-zinc-300 max-w-xl mx-auto">
            Unlock the Developer Tier in 30 seconds or explore model architecture specifications.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => handlePurchaseTier(10)}
              disabled={busyAmount !== null}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50"
            >
              {busyAmount === 10 ? 'Opening checkout…' : 'Get Developer Tier ($10)'}
            </button>
            <Link
              href="/models"
              className="rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/10 hover:text-white"
            >
              Browse Model Catalog
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
