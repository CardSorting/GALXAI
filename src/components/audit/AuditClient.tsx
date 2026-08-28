'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  ShieldAlert,
  AlertTriangle,
  Zap,
  TrendingDown,
  Cpu,
  Layers,
  Coins,
  Check,
  Copy,
  Clock,
  Settings2,
  FileText,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Activity,
  Sliders,
  ChevronRight,
  Sparkles,
  Terminal,
  Code2,
  Users2,
  Building2,
  Play,
  RotateCcw,
  Search,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { BroccoliLiveTelemetryWidget } from './BroccoliLiveTelemetryWidget';

interface EnterpriseScalePreset {
  id: string;
  name: string;
  badge: string;
  monthlySpend: number;
  description: string;
}

const ENTERPRISE_SCALE_PRESETS: EnterpriseScalePreset[] = [
  {
    id: 'startup',
    name: 'Growth AI Startup',
    badge: '$15k/mo Spend',
    monthlySpend: 15000,
    description: 'Fast-moving team with un-cached prompt prefixes and staging test key overburn.',
  },
  {
    id: 'midmarket',
    name: 'Mid-Market SaaS',
    badge: '$68.4k/mo Spend',
    monthlySpend: 68400,
    description: 'Multi-service architecture defaulting to Sol for simple routing and agent workflows.',
  },
  {
    id: 'scaleup',
    name: 'FinTech / Scale-Up',
    badge: '$250k/mo Spend',
    monthlySpend: 250000,
    description: 'High-throughput RAG & subagent workloads suffering from repeated semantic queries.',
  },
  {
    id: 'enterprise',
    name: 'Global Enterprise',
    badge: '$1.2M/mo Spend',
    monthlySpend: 1200000,
    description: 'Decentralized engineering departments without centralized spend governance or circuit breakers.',
  },
];

interface LeakageCategory {
  id: string;
  title: string;
  sharePercent: number; // percentage of total waste
  currentModel: string;
  remediatedModel: string;
  rootCause: string;
  galxAction: string;
  sampleBeforeCode: string;
  sampleAfterCode: string;
}

const LEAKAGE_CATEGORIES: LeakageCategory[] = [
  {
    id: 'misallocation',
    title: 'Frontier Model Misallocation',
    sharePercent: 37.5,
    currentModel: 'gpt-5.6-sol ($4.00 in / $20.00 out)',
    remediatedModel: 'gpt-5.6-luna ($0.20 in / $1.20 out)',
    rootCause: 'Developers defaulted to flagship Sol reasoning for simple 1-sentence classification and JSON routing.',
    galxAction: 'Recommends Luna for named low-risk workloads; enforcement requires approved regression evidence.',
    sampleBeforeCode: `// Direct Retail Call (Unmanaged Overspend)
const res = await openai.chat.completions.create({
  model: "gpt-5.6-sol", // Flagship $20/1M output rate
  messages: [{ role: "user", content: "Is this inquiry billing, technical, or account?" }]
});`,
    sampleAfterCode: `// GalX evidence-gated route policy
// Candidate: Luna ($1.20/1M output); requested model remains active by default
// Enforce only after shadow evaluation meets the approved quality threshold`,
  },
  {
    id: 'cache_collision',
    title: 'Cache-Busting Header Volatility',
    sharePercent: 28.5,
    currentModel: 'gpt-5.6-sol (0% Cache Hit Rate)',
    remediatedModel: 'gpt-5.6-sol (cache-read opportunity)',
    rootCause: 'ISO timestamps and session UUIDs placed at line 1 of system prompts, invalidating 100% of prefix RAM cache.',
    galxAction: 'Diagnoses the first divergent prefix and recommends explicit, application-owned cache controls.',
    sampleBeforeCode: `// Broken System Prompt (0% Cache Hit)
const systemPrompt = \`Current Time: \${new Date().toISOString()}
Session ID: \${crypto.randomUUID()}
\${LARGE_STATIC_CORPORATE_RAG_SCHEMA_2500_TOKENS}\`;`,
    sampleAfterCode: `// Recommended application change (review before rollout)
// Keep the stable 2,500-token schema at the front of the prompt
// Verify provider-reported cache reads/writes after deployment`,
  },
  {
    id: 'staging_overburn',
    title: 'Uncapped CI/CD & Staging Overburn',
    sharePercent: 18.0,
    currentModel: 'gpt-5.6-sol (Unmonitored CI Key)',
    remediatedModel: 'gpt-5.6-luna (Policy Capped $25/day)',
    rootCause: 'Automated GitHub Actions PR test runner executing 4,000 full-context inference calls per day on master.',
    galxAction: 'Enforces a deterministic spend ceiling; model changes still require an approved route policy.',
    sampleBeforeCode: `// GitHub Actions CI Pipeline (Running on every commit)
- name: Run E2E Evaluation Suite
  env:
    OPENAI_API_KEY: \${{ secrets.PROD_OPENAI_API_KEY }} // No spend cap!`,
    sampleAfterCode: `// GalX staging governance policy
// Key tagged: env=staging -> max spend clamped at $25/day
// Optional Luna route requires workload-specific evaluation approval`,
  },
  {
    id: 'agent_recursion',
    title: 'Runaway Autonomous Agent Cycles',
    sharePercent: 16.0,
    currentModel: 'gpt-5.6-terra (Unbounded Loop)',
    remediatedModel: 'gpt-5.6-terra (Circuit Breaker Clamped)',
    rootCause: 'Autonomous subagent stuck in 48-turn recursive loop on unhandled linter exception, burning $120+ in 4 minutes.',
    galxAction: 'A deterministic turn ceiling blocks additional calls and returns a structured policy error.',
    sampleBeforeCode: `// Unbounded Agent Loop
while (!taskComplete) {
  const step = await agent.thinkAndAct(); // Stuck in retry loop (Turn 48/∞)
}`,
    sampleAfterCode: `// GalX deterministic request policy
// session_id + turn_count are required attribution fields
// Calls beyond the approved turn ceiling are rejected`,
  },
];

interface DepartmentChargeback {
  department: string;
  lead: string;
  share: number;
  topService: string;
}

const DEPARTMENT_CHARGEBACKS: DepartmentChargeback[] = [
  { department: 'Customer Experience & Support AI', lead: 'Sarah M. (VP Support)', share: 0.38, topService: 'customer-support-router' },
  { department: 'Core Product Engineering & RAG', lead: 'David K. (Staff Architect)', share: 0.32, topService: 'rag-document-agent' },
  { department: 'DevOps & Quality Infrastructure', lead: 'Alex R. (Head of Infra)', share: 0.18, topService: 'ci-runner-github-actions' },
  { department: 'Autonomous Agents & Labs', lead: 'Elena T. (AI Research Lead)', share: 0.12, topService: 'autonomous-code-reviewer' },
];

export function AuditClient() {
  const [activeTab, setActiveTab] = useState<'waterfall' | 'governance' | 'attribution' | 'playground'>('waterfall');
  const [isAutonomousMode, setIsAutonomousMode] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('midmarket');
  const [monthlySpendInput, setMonthlySpendInput] = useState<number>(68400);
  const [copiedAudit, setCopiedAudit] = useState<boolean>(false);
  const [copiedEnv, setCopiedEnv] = useState<boolean>(false);
  const [integrationCodeTab, setIntegrationCodeTab] = useState<'env' | 'ts' | 'py' | 'curl'>('env');
  
  // Playground state
  const [playgroundPrompt, setPlaygroundPrompt] = useState<string>(
    'Please classify the following support ticket into billing, tech_support, or feature_request: "My credit card was charged twice for invoice #4920."'
  );
  const [playgroundTargetModel, setPlaygroundTargetModel] = useState<string>('gpt-5.6-sol');
  const [playgroundAnalyzing, setPlaygroundAnalyzing] = useState<boolean>(false);
  const [playgroundResult, setPlaygroundResult] = useState<{
    workloadClass: string;
    evidenceStatus: string;
    recommendedRoute: string;
    originalCostPer1M: number;
    optimizedCostPer1M: number;
    savingsDeltaPercent: number;
    cacheStatus: string;
  } | null>(null);

  // Policy Engine Toggles
  const [policyTierCascading, setPolicyTierCascading] = useState<boolean>(true);
  const [policyPrefixAlignment, setPolicyPrefixAlignment] = useState<boolean>(true);
  const [policyStagingCaps, setPolicyStagingCaps] = useState<boolean>(true);
  const [policyCircuitBreaker, setPolicyCircuitBreaker] = useState<boolean>(true);
  const [maxAgentTurns, setMaxAgentTurns] = useState<number>(12);

  // Inbound Form
  const [inboundEmail, setInboundEmail] = useState<string>('');
  const [inboundCompany, setInboundCompany] = useState<string>('');
  const [isSubmittingLead, setIsSubmittingLead] = useState<boolean>(false);
  const [leadSubmitted, setLeadSubmitted] = useState<boolean>(false);

  const applyPreset = (preset: EnterpriseScalePreset) => {
    setSelectedPresetId(preset.id);
    setMonthlySpendInput(preset.monthlySpend);
  };

  // Calculations scaled to monthlySpendInput
  const calculations = useMemo(() => {
    // Illustrative scenario only. A real audit must derive this rate from reconciled usage.
    const totalPotentialWaste = monthlySpendInput * 0.52;
    
    let activeWasteRemediated = 0;
    if (policyTierCascading) activeWasteRemediated += totalPotentialWaste * (LEAKAGE_CATEGORIES[0].sharePercent / 100);
    if (policyPrefixAlignment) activeWasteRemediated += totalPotentialWaste * (LEAKAGE_CATEGORIES[1].sharePercent / 100);
    if (policyStagingCaps) activeWasteRemediated += totalPotentialWaste * (LEAKAGE_CATEGORIES[2].sharePercent / 100);
    if (policyCircuitBreaker) activeWasteRemediated += totalPotentialWaste * (LEAKAGE_CATEGORIES[3].sharePercent / 100);

    const netMonthlySpend = isAutonomousMode
      ? monthlySpendInput - activeWasteRemediated
      : monthlySpendInput;

    const annualSavings = activeWasteRemediated * 12;
    const savingsPercent = monthlySpendInput > 0 ? (activeWasteRemediated / monthlySpendInput) * 100 : 0;

    return {
      totalPotentialWaste,
      activeWasteRemediated,
      netMonthlySpend,
      annualSavings,
      savingsPercent,
    };
  }, [monthlySpendInput, isAutonomousMode, policyTierCascading, policyPrefixAlignment, policyStagingCaps, policyCircuitBreaker]);

  const handleRunPlaygroundAnalysis = () => {
    setPlaygroundAnalyzing(true);
    setTimeout(() => {
      setPlaygroundAnalyzing(false);
      setPlaygroundResult({
        workloadClass: 'classification',
        evidenceStatus: 'candidate_only',
        recommendedRoute: 'gpt-5.6-luna',
        originalCostPer1M: 20.00,
        optimizedCostPer1M: 1.20,
        savingsDeltaPercent: 94.0,
        cacheStatus: 'Cache eligibility requires provider telemetry; writes may cost more than uncached input.',
      });
    }, 450);
  };

  const handleCopyAudit = async () => {
    const text = `=====================================================================
GALXAI AI SPEND GOVERNANCE SCENARIO
Report Mode: ${isAutonomousMode ? 'ILLUSTRATIVE POLICY SCENARIO' : 'BASELINE SCENARIO'}
=====================================================================
Gross Unmanaged OpenAI Spend:  $${monthlySpendInput.toLocaleString()}/mo ($${(monthlySpendInput * 12).toLocaleString()}/yr)
Modeled Addressable Spend:     -$${calculations.activeWasteRemediated.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo (-${calculations.savingsPercent.toFixed(1)}%)
Modeled Post-Policy Spend:     $${calculations.netMonthlySpend.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo
Modeled Annual Opportunity:    $${calculations.annualSavings.toLocaleString('en-US', { maximumFractionDigits: 0 })}/yr

IMPORTANT: Values below are illustrative assumptions, not measured savings or an audit result.

Illustrative Spend Opportunity Breakdown:
1. [Frontier Misallocation]    -$${(calculations.totalPotentialWaste * (LEAKAGE_CATEGORIES[0].sharePercent / 100)).toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo (Sol defaulted on simple classification)
2. [Cache-Busting Prefixes]    -$${(calculations.totalPotentialWaste * (LEAKAGE_CATEGORIES[1].sharePercent / 100)).toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo (Moving timestamps breaking prefix hash)
3. [Uncapped Staging Pipelines] -$${(calculations.totalPotentialWaste * (LEAKAGE_CATEGORIES[2].sharePercent / 100)).toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo (CI/CD test suites hitting prod models)
4. [Runaway Recursive Loops]   -$${(calculations.totalPotentialWaste * (LEAKAGE_CATEGORIES[3].sharePercent / 100)).toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo (Unhandled agent tool error loops)

Departmental Spend Attribution:
${DEPARTMENT_CHARGEBACKS.map((d) => `- ${d.department}: $${(monthlySpendInput * d.share).toLocaleString()}/mo (${(d.share * 100).toFixed(0)}%)`).join('\n')}

Gateway integration:
OPENAI_BASE_URL="https://gateway.galx.ai/v1"

Audit generated via: https://galx.ai/audit
=====================================================================`;

    const ok = await safeCopyToClipboard(text);
    if (ok) {
      setCopiedAudit(true);
      setTimeout(() => setCopiedAudit(false), 2000);
    }
  };

  const handleCopyEnv = async (content: string) => {
    const ok = await safeCopyToClipboard(content);
    if (ok) {
      setCopiedEnv(true);
      setTimeout(() => setCopiedEnv(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs items={[{ label: 'Enterprise AI Spend Forensic & Governance' }]} />

        {/* Hero Header */}
        <section id="audit-hero" className="glass-panel rounded-2xl p-6 sm:p-10 space-y-6 border border-white/10 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Enterprise AI Spend Forensic &amp; Governance Control Tower
            </h1>
            <ShareButton
              variant="pill"
              label="Share Audit Hub"
              title="GALXAI Enterprise AI Spend Forensic & Governance Control Tower"
              description="Reverse-audit production OpenAI traffic. Discover the exact microservices, un-cached prompt prefixes, and frontier model misallocations burning your budget."
            />
          </div>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            Answer the two fundamental questions of enterprise AI FinOps: <span className="text-white font-bold">“Why is our AI bill so high?”</span> and <span className="text-emerald-400 font-bold">“How do we make it stop?”</span> Reverse-audit production OpenAI traffic to pinpoint microservice leakage, cache-busting prompt prefixes, and runaway agent loops.
          </p>

          <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-400/20 rounded-lg px-3 py-2 font-sans">
            This page is an illustrative planning simulator. Savings, allocation, cache, and routing figures become audit findings only after usage is ingested, reconciled, and quality-validated.
          </p>

          {/* Scale Presets Selector */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-300 uppercase flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Simulate Enterprise Scale Workloads</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">Select a scale or enter custom spend below</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {ENTERPRISE_SCALE_PRESETS.map((preset) => {
                const isActive = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isActive
                        ? 'bg-indigo-600/20 border-indigo-400 text-white shadow-lg shadow-indigo-500/10'
                        : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-black/60 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs font-mono">{preset.name}</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-cyan-300">
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-2">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Precision Monthly Spend Slider & Number Input */}
          <div className="p-4 rounded-xl bg-black/60 border border-white/10 flex flex-wrap items-center justify-between gap-4 font-mono">
            <div className="space-y-1">
              <span className="text-xs text-zinc-300 font-bold block">Gross Monthly OpenAI Spend:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500 font-bold">$</span>
                <input
                  type="number"
                  min={1000}
                  max={5000000}
                  step={1000}
                  value={monthlySpendInput}
                  onChange={(e) => {
                    setMonthlySpendInput(Math.max(1000, Number(e.target.value)));
                    setSelectedPresetId('');
                  }}
                  className="w-32 px-2.5 py-1 rounded-md bg-black border border-white/20 text-white font-black text-sm text-right focus:outline-none focus:border-cyan-400"
                />
                <span className="text-xs text-zinc-400">/mo</span>
              </div>
            </div>

            <div className="flex-1 max-w-md w-full">
              <input
                type="range"
                min={5000}
                max={500000}
                step={2500}
                value={monthlySpendInput > 500000 ? 500000 : monthlySpendInput}
                onChange={(e) => {
                  setMonthlySpendInput(Number(e.target.value));
                  setSelectedPresetId('');
                }}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>$5k/mo</span>
                <span>$100k/mo</span>
                <span>$250k/mo</span>
                <span>$500k+/mo</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAutonomousMode(!isAutonomousMode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                  isAutonomousMode
                    ? 'bg-emerald-500 text-black border-emerald-400'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{isAutonomousMode ? 'Modeled Policies Applied' : 'Baseline Scenario'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Illustrative Spend Scenario Overview */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          <div className="glass-panel p-4 rounded-xl border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span>Gross Retail Spend</span>
              <Coins className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tabular-nums">
              ${monthlySpendInput.toLocaleString()}
              <span className="text-xs text-zinc-400 font-normal">/mo</span>
            </div>
            <p className="text-[10px] text-zinc-400">Direct unmanaged OpenAI traffic</p>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span>Modeled Addressable Spend</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 tabular-nums">
              -${calculations.activeWasteRemediated.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              <span className="text-xs text-zinc-400 font-normal">/mo</span>
            </div>
            <p className="text-[10px] text-rose-300 font-bold">-{calculations.savingsPercent.toFixed(1)}% illustrative opportunity</p>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span>Modeled Post-Policy Spend</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-300 tabular-nums">
              ${calculations.netMonthlySpend.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              <span className="text-xs text-zinc-400 font-normal">/mo</span>
            </div>
            <p className="text-[10px] text-emerald-400">Requires measured usage and approved policies</p>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span>Modeled Annual Opportunity</span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tabular-nums">
              ${calculations.annualSavings.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              <span className="text-xs text-zinc-400 font-normal">/yr</span>
            </div>
            <p className="text-[10px] text-zinc-400">Illustrative, not a savings guarantee</p>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 gap-2 font-mono text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('waterfall')}
            className={`pb-3 px-3 transition-colors cursor-pointer border-b-2 font-bold flex items-center gap-2 shrink-0 ${
              activeTab === 'waterfall'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Opportunity Scenario</span>
          </button>
          <button
            onClick={() => setActiveTab('governance')}
            className={`pb-3 px-3 transition-colors cursor-pointer border-b-2 font-bold flex items-center gap-2 shrink-0 ${
              activeTab === 'governance'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Evidence-Gated Policies</span>
          </button>
          <button
            onClick={() => setActiveTab('attribution')}
            className={`pb-3 px-3 transition-colors cursor-pointer border-b-2 font-bold flex items-center gap-2 shrink-0 ${
              activeTab === 'attribution'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Departmental Cost Attribution</span>
          </button>
          <button
            onClick={() => setActiveTab('playground')}
            className={`pb-3 px-3 transition-colors cursor-pointer border-b-2 font-bold flex items-center gap-2 shrink-0 ${
              activeTab === 'playground'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>Policy Simulator</span>
          </button>
        </div>

        {/* Tab 1: Forensic Waste Waterfall */}
        {activeTab === 'waterfall' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Illustrative Breakdown: 4 Common Waste Modes</span>
                </h2>
                <p className="text-xs text-zinc-400 font-sans">
                  Scenario values scale against ${monthlySpendInput.toLocaleString()}/mo; they are not detected from production telemetry.
                </p>
              </div>

              <button
                onClick={handleCopyAudit}
                className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
              >
                {copiedAudit ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAudit ? 'Scenario Copied!' : 'Export Planning Scenario'}</span>
              </button>
            </div>

            <div className="space-y-4">
              {LEAKAGE_CATEGORIES.map((item) => {
                const categoryWastedMonthly = calculations.totalPotentialWaste * (item.sharePercent / 100);
                return (
                  <div
                    key={item.id}
                    className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 space-y-4 hover:border-white/20 transition-all"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-bold text-white font-mono text-base">{item.title}</h3>
                          <span className="text-[11px] font-mono text-rose-400 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 font-bold">
                            {item.sharePercent}% of Scenario
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 mt-1 font-sans">{item.rootCause}</p>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-base font-black text-rose-400 tabular-nums">
                          -${categoryWastedMonthly.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          ${(categoryWastedMonthly * 12).toLocaleString('en-US', { maximumFractionDigits: 0 })}/yr modeled
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <span className="text-zinc-500">Candidate intervention:</span>
                        <span className="text-zinc-400 line-through">{item.currentModel}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">{item.remediatedModel}</span>
                      </div>

                      <div className="text-[11px] text-emerald-300 flex items-center gap-1.5 font-sans">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{item.galxAction}</span>
                      </div>
                    </div>

                    {/* Code Diff Inspector */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase text-rose-400 font-bold">Before: Unmanaged Code</span>
                        <pre className="p-3 rounded-xl bg-black/80 border border-rose-500/20 text-[11px] font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                          <code>{item.sampleBeforeCode}</code>
                        </pre>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Candidate: review, evaluate, then approve</span>
                        <pre className="p-3 rounded-xl bg-black/80 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                          <code>{item.sampleAfterCode}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Tab 2: Evidence-Gated Governance Policies */}
        {activeTab === 'governance' && (
          <section className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Evidence-Gated Policy Engine &amp; Guardrails</span>
              </h2>
              <p className="text-xs text-zinc-400 font-sans">Model deterministic limits and route candidates. Model substitution stays off until workload-specific quality evidence is approved.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-white flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={policyTierCascading}
                      onChange={(e) => setPolicyTierCascading(e.target.checked)}
                      className="rounded accent-emerald-400 cursor-pointer"
                    />
                    <span>Evidence-Gated Model Routing</span>
                  </label>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    +${(calculations.totalPotentialWaste * (LEAKAGE_CATEGORIES[0].sharePercent / 100)).toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo
                  </span>
                </div>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  Recommends a lower-cost model only for named, low-risk workloads. Enforcement requires sufficient samples, a regression threshold, and an unexpired approval.
                </p>
              </div>

              <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-white flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={policyPrefixAlignment}
                      onChange={(e) => setPolicyPrefixAlignment(e.target.checked)}
                      className="rounded accent-emerald-400 cursor-pointer"
                    />
                    <span>Cache Diagnostics &amp; Prefix Controls</span>
                  </label>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    +${(calculations.totalPotentialWaste * (LEAKAGE_CATEGORIES[1].sharePercent / 100)).toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo
                  </span>
                </div>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  Identifies the first unstable prefix and recommends application-owned prompt changes. Provider-reported cache reads and writes verify the result.
                </p>
              </div>

              <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-white flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={policyStagingCaps}
                      onChange={(e) => setPolicyStagingCaps(e.target.checked)}
                      className="rounded accent-emerald-400 cursor-pointer"
                    />
                    <span>Staging &amp; CI/CD Spend Ceilings</span>
                  </label>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    +${(calculations.totalPotentialWaste * (LEAKAGE_CATEGORIES[2].sharePercent / 100)).toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo
                  </span>
                </div>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  Hard-caps automated CI keys at $25/day. An optional Luna route remains subject to a separately approved workload policy.
                </p>
              </div>

              <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-white flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={policyCircuitBreaker}
                      onChange={(e) => setPolicyCircuitBreaker(e.target.checked)}
                      className="rounded accent-emerald-400 cursor-pointer"
                    />
                    <span>Agent Recursion Circuit Breakers</span>
                  </label>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    +${(calculations.totalPotentialWaste * (LEAKAGE_CATEGORIES[3].sharePercent / 100)).toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                    Blocks subsequent gateway calls after the attributed session exceeds the configured turn ceiling.
                  </p>
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pt-1">
                    <span>Max Recursive Turns:</span>
                    <span className="text-emerald-400 font-bold">{maxAgentTurns} turns</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={30}
                    step={1}
                    value={maxAgentTurns}
                    onChange={(e) => setMaxAgentTurns(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tab 3: Departmental Cost Attribution */}
        {activeTab === 'attribution' && (
          <section className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>Departmental Spend Attribution &amp; Chargebacks</span>
              </h2>
              <p className="text-xs text-zinc-400 font-sans">
                Illustrative allocation only. Production chargeback requires complete request-level attribution and billing reconciliation.
              </p>
            </div>

            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden font-mono text-xs">
              <div className="grid grid-cols-12 bg-black/60 p-4 font-bold text-zinc-400 border-b border-white/10">
                <div className="col-span-4">Department / Business Unit</div>
                <div className="col-span-3">Department Lead</div>
                <div className="col-span-3">Primary Microservice</div>
                <div className="col-span-2 text-right">Monthly Spend</div>
              </div>

              <div className="divide-y divide-white/5">
                {DEPARTMENT_CHARGEBACKS.map((dept, idx) => {
                  const deptSpend = monthlySpendInput * dept.share;
                  const deptSaved = calculations.activeWasteRemediated * dept.share;
                  return (
                    <div key={idx} className="grid grid-cols-12 p-4 items-center text-zinc-300 hover:bg-white/[0.02] transition-colors">
                      <div className="col-span-4 font-bold text-white flex items-center gap-2">
                        <Users2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{dept.department}</span>
                      </div>
                      <div className="col-span-3 text-zinc-400">{dept.lead}</div>
                      <div className="col-span-3">
                        <code className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-300 text-[11px]">
                          {dept.topService}
                        </code>
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="font-bold text-white">${deptSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo</div>
                        <div className="text-[10px] text-emerald-400">-${deptSaved.toLocaleString('en-US', { maximumFractionDigits: 0 })} modeled</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Tab 4: Local Policy Simulator */}
        {activeTab === 'playground' && (
          <section className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" />
                <span>Local Workload &amp; Policy Simulator</span>
              </h2>
              <p className="text-xs text-zinc-400 font-sans">
                Explore a deterministic classification scenario. This client-side demo does not inspect production traffic, measure quality, or change the selected model.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
              <div className="lg:col-span-7 glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
                <div className="space-y-2">
                  <label className="text-zinc-300 font-bold uppercase block text-[11px]">
                    Target Client Model Setting
                  </label>
                  <select
                    value={playgroundTargetModel}
                    onChange={(e) => setPlaygroundTargetModel(e.target.value)}
                    className="w-full p-3 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="gpt-5.6-sol">gpt-5.6-sol (Flagship - $4.00 In / $20.00 Out)</option>
                    <option value="gpt-5.6-terra">gpt-5.6-terra (Balanced - $2.00 In / $12.00 Out)</option>
                    <option value="gpt-5.6-luna">gpt-5.6-luna (Fast - $0.20 In / $1.20 Out)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-zinc-300 font-bold uppercase block text-[11px]">
                    Prompt Payload Content
                  </label>
                  <textarea
                    rows={4}
                    value={playgroundPrompt}
                    onChange={(e) => setPlaygroundPrompt(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 leading-relaxed"
                  />
                </div>

                <button
                  onClick={handleRunPlaygroundAnalysis}
                  disabled={playgroundAnalyzing}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {playgroundAnalyzing ? (
                    <span>Applying Scenario Rules...</span>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-black" />
                      <span>Run Policy Scenario</span>
                    </>
                  )}
                </button>
              </div>

              <div className="lg:col-span-5 glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="border-b border-white/10 pb-2 flex items-center justify-between">
                    <span className="font-bold text-white uppercase text-[11px]">Illustrative Result</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                      Local simulation
                    </span>
                  </div>

                  {playgroundResult ? (
                    <div className="space-y-3 font-mono text-xs">
                      <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1">
                        <div className="flex justify-between text-zinc-400">
                          <span>Workload class:</span>
                          <span className="text-emerald-400 font-bold">{playgroundResult.workloadClass}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-sans">
                          Rule-based candidate only. Quality equivalence has not been established by this simulator.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-black/80 border border-emerald-500/40 space-y-1">
                        <div className="flex justify-between text-white font-bold">
                          <span>Candidate route:</span>
                          <span className="text-emerald-400">{playgroundResult.recommendedRoute}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-zinc-400">
                          <span>Output Cost Delta:</span>
                          <span className="text-emerald-300 font-bold">-${playgroundResult.savingsDeltaPercent.toFixed(1)}%</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-300 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>{playgroundResult.cacheStatus}</span>
                      </div>
                      <div className="text-[10px] text-amber-200">
                        Evidence status: {playgroundResult.evidenceStatus}. The requested model remains effective until shadow evaluation is approved.
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-zinc-500 space-y-2">
                      <Search className="w-6 h-6 mx-auto text-zinc-600" />
                      <p className="text-xs">Click &quot;Run Policy Scenario&quot; to see the candidate recommendation and its evidence requirement.</p>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-zinc-500 pt-2 border-t border-white/5">
                  Production enforcement is opt-in, fail-closed, and limited to approved policies.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Live BroccoliDB L1 In-Memory Telemetry Substrate Widget */}
        <section>
          <BroccoliLiveTelemetryWidget />
        </section>

        {/* 1-Line Gateway Multi-Language Drop-in Panel */}
        <section className="glass-panel p-6 sm:p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Connect Traffic Through the Gateway</span>
              </h3>
              <p className="text-xs text-zinc-300 font-sans">
                Point an OpenAI-compatible client to the gateway, supply an issued GalX key, and start in observe mode before enabling policies.
              </p>
            </div>

            <div className="flex rounded-lg bg-black/60 p-0.5 border border-white/10 font-mono text-xs">
              <button
                onClick={() => setIntegrationCodeTab('env')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  integrationCodeTab === 'env' ? 'bg-emerald-500 text-black font-bold' : 'text-white/70 hover:text-white'
                }`}
              >
                .env
              </button>
              <button
                onClick={() => setIntegrationCodeTab('ts')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  integrationCodeTab === 'ts' ? 'bg-emerald-500 text-black font-bold' : 'text-white/70 hover:text-white'
                }`}
              >
                TypeScript
              </button>
              <button
                onClick={() => setIntegrationCodeTab('py')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  integrationCodeTab === 'py' ? 'bg-emerald-500 text-black font-bold' : 'text-white/70 hover:text-white'
                }`}
              >
                Python
              </button>
              <button
                onClick={() => setIntegrationCodeTab('curl')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  integrationCodeTab === 'curl' ? 'bg-emerald-500 text-black font-bold' : 'text-white/70 hover:text-white'
                }`}
              >
                cURL
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black/80 border border-white/10 font-mono text-xs text-emerald-300 flex items-center justify-between gap-4 overflow-x-auto">
            {integrationCodeTab === 'env' && (
              <code>OPENAI_BASE_URL=&quot;https://gateway.galx.ai/v1&quot;</code>
            )}
            {integrationCodeTab === 'ts' && (
              <code>import OpenAI from &apos;openai&apos;;&#10;const openai = new OpenAI({`{ baseURL: &apos;https://gateway.galx.ai/v1&apos; }`});</code>
            )}
            {integrationCodeTab === 'py' && (
              <code>from openai import OpenAI&#10;client = OpenAI(base_url=&quot;https://gateway.galx.ai/v1&quot;)</code>
            )}
            {integrationCodeTab === 'curl' && (
              <code>curl https://gateway.galx.ai/v1/chat/completions -H &quot;Authorization: Bearer $GALXAI_API_KEY&quot;</code>
            )}

            <button
              onClick={() => {
                const code =
                  integrationCodeTab === 'env'
                    ? 'OPENAI_BASE_URL="https://gateway.galx.ai/v1"'
                    : integrationCodeTab === 'ts'
                    ? "import OpenAI from 'openai';\nconst openai = new OpenAI({ baseURL: 'https://gateway.galx.ai/v1' });"
                    : integrationCodeTab === 'py'
                    ? 'from openai import OpenAI\nclient = OpenAI(base_url="https://gateway.galx.ai/v1")'
                    : 'curl https://gateway.galx.ai/v1/chat/completions -H "Authorization: Bearer $GALXAI_API_KEY"';
                handleCopyEnv(code);
              }}
              className="text-zinc-400 hover:text-white px-2.5 py-1 rounded bg-white/10 text-[11px] shrink-0 cursor-pointer transition-colors"
            >
              {copiedEnv ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        </section>

        {/* Enterprise Audit Lead Capture */}
        <section className="glass-panel rounded-2xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Request a 30-Day Read-Only Spend Review</span>
            </h3>
            <p className="text-xs text-zinc-400 font-sans">
              Build a reconciled usage baseline, close attribution gaps, and review quality-gated policy candidates before any enforcement decision.
            </p>
          </div>

          {leadSubmitted ? (
            <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Enterprise audit requested! Your team onboarding link and $100 trial key are being sent.</span>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!inboundEmail || isSubmittingLead) return;
                setIsSubmittingLead(true);
                try {
                  const res = await fetch('/api/inbound/lead', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: inboundEmail,
                      companyName: inboundCompany || 'Enterprise Org',
                      source: 'audit_hub',
                      modelPreference: 'gpt-5.6-sol',
                      estimatedMonthlySpend: monthlySpendInput,
                      stack: ['openai', 'langchain', 'nextjs'],
                      notes: `Requested Enterprise Spend Forensic Audit. Modeled spend: $${monthlySpendInput}/mo with $${calculations.activeWasteRemediated}/mo identified waste.`,
                    }),
                  });
                  if (res.ok) setLeadSubmitted(true);
                } catch {
                  // fallback
                } finally {
                  setIsSubmittingLead(false);
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono"
            >
              <input
                type="email"
                required
                value={inboundEmail}
                onChange={(e) => setInboundEmail(e.target.value)}
                placeholder="name@company.com"
                className="px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder:text-zinc-500 text-xs focus:border-emerald-400 focus:outline-none"
              />
              <input
                type="text"
                value={inboundCompany}
                onChange={(e) => setInboundCompany(e.target.value)}
                placeholder="Company / Team Name"
                className="px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder:text-zinc-500 text-xs focus:border-emerald-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSubmittingLead}
                className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmittingLead ? 'Generating Key...' : 'Claim $100 Key & Audit →'}
              </button>
            </form>
          )}
        </section>

        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />
      </main>

      {/* Floating Conversion Dock */}
      <FloatingConversionDock />
    </div>
  );
}
