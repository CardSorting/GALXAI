'use client';
import { authEntryPath } from '@/lib/auth/redirects';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Zap,
  Terminal,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
  Code2,
  Cpu,
  Bot,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Flame,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { DEFAULT_POST_AUTH_PATH } from '@/lib/auth/redirects';

// =============================================================================
// BESPOKE 3D TILT & DUAL-LAYER SPOTLIGHT CARD PRIMITIVE
// =============================================================================
interface BespokeSpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  glowColor?: 'cyan' | 'indigo' | 'amber' | 'emerald';
  tilt?: boolean;
}

export function BespokeSpotlightCard({
  children,
  className = '',
  innerClassName = '',
  glowColor = 'cyan',
  tilt = true,
}: BespokeSpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [mouse, setMouse] = useState({
    isHovered: false,
    rotateX: 0,
    rotateY: 0,
  });

  const glowGradients = {
    cyan: 'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(6, 182, 212, 0.16), rgba(99, 102, 241, 0.05) 40%, transparent 80%)',
    indigo: 'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(99, 102, 241, 0.18), rgba(236, 72, 153, 0.05) 40%, transparent 80%)',
    amber: 'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(245, 158, 11, 0.16), rgba(239, 68, 68, 0.05) 40%, transparent 80%)',
    emerald: 'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(16, 185, 129, 0.16), rgba(6, 182, 212, 0.05) 40%, transparent 80%)',
  };

  const borderGlows = {
    cyan: 'radial-gradient(360px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(6, 182, 212, 0.8), transparent 70%)',
    indigo: 'radial-gradient(360px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(129, 140, 248, 0.8), transparent 70%)',
    amber: 'radial-gradient(360px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(251, 191, 36, 0.8), transparent 70%)',
    emerald: 'radial-gradient(360px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(52, 211, 153, 0.8), transparent 70%)',
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotX = tilt ? ((y - rect.height / 2) / (rect.height / 2)) * -4.5 : 0;
    const rotY = tilt ? ((x - rect.width / 2) / (rect.width / 2)) * 4.5 : 0;

    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);

    setMouse({ isHovered: true, rotateX: rotX, rotateY: rotY });
  };

  const handleMouseLeave = () => {
    setMouse({ isHovered: false, rotateX: 0, rotateY: 0 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setMouse((prev) => ({ ...prev, isHovered: true }))}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: mouse.isHovered
          ? `perspective(1200px) rotateX(${mouse.rotateX}deg) rotateY(${mouse.rotateY}deg) scale3d(1.006, 1.006, 1.006)`
          : 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
        transition: mouse.isHovered ? 'transform 0.12s ease-out' : 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
      className={`relative group rounded-3xl overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Layer 1: Ambient Specular Light Beam */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
        style={{
          opacity: mouse.isHovered ? 1 : 0,
          background: glowGradients[glowColor],
        }}
      />

      {/* Layer 2: Dynamic Perimeter Border Tracer */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl p-px transition-opacity duration-300 z-10"
        style={{
          opacity: mouse.isHovered ? 1 : 0,
          background: borderGlows[glowColor],
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
        }}
      />

      {/* Layer 3: Children Content (Protected Layout Container) */}
      <div className={`relative z-20 h-full w-full ${innerClassName}`}>{children}</div>
    </div>
  );
}

export function ArtisanalSignalSection() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeModeTab, setActiveModeTab] = useState<'ui' | 'patch' | 'agents'>('ui');
  const [sandboxMode, setSandboxMode] = useState<'terminal' | 'roi' | 'speed' | 'enclave'>('terminal');

  // ===========================================================================
  // 5. SIMULATED SOVEREIGN PRIVATE ENCLAVE & ZERO DATA RETENTION STATE
  // ===========================================================================
  const [enclaveVpcActive, setEnclaveVpcActive] = useState(true);
  const [zeroRetentionActive, setZeroRetentionActive] = useState(true);
  const [zeroEgressActive, setZeroEgressActive] = useState(true);
  const [frontierEnclaveTier, setFrontierEnclaveTier] = useState<'sol' | 'terra' | 'luna'>('sol');
  const [isVerifyingEnclave, setIsVerifyingEnclave] = useState(false);
  const [enclaveAuditLog, setEnclaveAuditLog] = useState(
    'GALX API • Text and image generation for your applications'
  );

  const verifyPrivateEnclave = (tier: 'sol' | 'terra' | 'luna') => {
    setFrontierEnclaveTier(tier);
    setIsVerifyingEnclave(true);
    setEnclaveAuditLog('🔄 Verifying cryptographic Zero Data Retention handshake with Dedicated VPC...');

    setTimeout(() => {
      setIsVerifyingEnclave(false);
      setEnclaveAuditLog(
        `✅ [CRYPTOGRAPHIC AUDIT PASSED] GALX Nova Enclave Verified\n✔ Data Retention: 0 Days (Strict ZDR Policy)\n✔ Customer Prompt Training: 100% Exemption Guaranteed\n✔ Egress / Ingress Transfer Fee: $0.00 / GB\n✔ High-Availability Edge Verified`
      );
    }, 600);
  };

  // ===========================================================================
  // 1. SIMULATED TERMINAL CLI STATE
  // ===========================================================================
  const CLI_PRESETS = [
    {
      label: 'Hello World',
      cmd: 'npx galxai "Hello"',
      output: 'Example: Hello! Your application can display the generated response here.',
      ttft: '8ms',
      discount: '38% Wholesale',
      cache: '-75% Rebate',
      cost: '$0.00018',
      retail: '$0.0028',
      tokens: 42,
    },
    {
      label: 'Prompt Caching',
      cmd: 'npx galxai "Explain continuous prompt caching in 10 words"',
      output: 'Example: Hello! Your application can display the generated response here.',
      ttft: '6ms',
      discount: '40% Wholesale',
      cache: '-75% Rebate',
      cost: '$0.00012',
      retail: '$0.0024',
      tokens: 38,
    },
    {
      label: 'Drop-in UI',
      cmd: 'npx galxai add image',
      output: '⚡ GALXAI Component Ejector\n✔ Created src/components/ui/GalxImage.tsx\n✔ Embedded Server Action zero-proxy pipeline\n✔ Zero client-side API keys exposed\n\n🚀 Component ready: <GalxImage prompt="..." aspectRatio="16:9" />',
      ttft: '3ms',
      discount: '100% Free',
      cache: 'Active',
      cost: '$0.00000',
      retail: '$0.0000',
      tokens: 29,
    },
    {
      label: 'Agent Skills',
      cmd: 'npx galxai skills',
      output: '⚡ GALXAI Agent Directives Generator\n✔ Wrote .cursorrules (Prevents AI from hallucinating backend proxies)\n✔ Wrote CLAUDE.md & AGENTS.md for Windsurf & Claude Code\n\n🚀 Cursor and Windsurf now build clean, zero-leak frontend primitives on prompt #1.',
      ttft: '4ms',
      discount: '100% Free',
      cache: 'Active',
      cost: '$0.00000',
      retail: '$0.0000',
      tokens: 35,
    },
  ];

  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const [customInputPrompt, setCustomInputPrompt] = useState('Hello');
  const [simulatedStream, setSimulatedStream] = useState(CLI_PRESETS[0].output);
  const [isSimulating, setIsSimulating] = useState(false);
  const [tokensCounter, setTokensCounter] = useState(CLI_PRESETS[0].tokens);
  const [streamSpeed, setStreamSpeed] = useState<'normal' | 'turbo'>('normal');

  const runTerminalSimulation = (presetIdx?: number, customText?: string) => {
    const idx = presetIdx !== undefined ? presetIdx : activePresetIndex;
    if (presetIdx !== undefined) setActivePresetIndex(idx);

    setIsSimulating(true);
    setSimulatedStream('');
    setTokensCounter(0);

    const targetOutput = customText
      ? `⚡ GALX Nova [Managed Edge Ingress]\n✔ Sustainable Tier Applied\n✔ Prefix Cache Active\n\n"Simulated response for: '${customText}'. Clean execution without infrastructure overhead."`
      : CLI_PRESETS[idx].output;

    let currentLength = 0;
    const stepSize = streamSpeed === 'turbo' ? 14 : 6;
    const intervalTime = streamSpeed === 'turbo' ? 8 : 16;

    const interval = setInterval(() => {
      currentLength += Math.floor(Math.random() * stepSize) + 4;
      setTokensCounter((prev) => prev + Math.floor(Math.random() * 3) + 1);

      if (currentLength >= targetOutput.length) {
        setSimulatedStream(targetOutput);
        setIsSimulating(false);
        clearInterval(interval);
      } else {
        setSimulatedStream(targetOutput.slice(0, currentLength));
      }
    }, intervalTime);
  };

  // ===========================================================================
  // 2. SIMULATED LIVE UNIT MARGIN & FINANCIAL CALCULATOR
  // ===========================================================================
  const [activeUsers, setActiveUsers] = useState<number>(2500);
  const [promptsPerDay, setPromptsPerDay] = useState<number>(15);
  const [selectedModelTier, setSelectedModelTier] = useState<'sol' | 'terra' | 'luna'>('sol');

  const modelRates = {
    sol: { retail: 0.0035, wholesale: 0.0021, name: 'GPT-5.6 Sol' },
    terra: { retail: 0.0018, wholesale: 0.0011, name: 'GPT-5.6 Terra' },
    luna: { retail: 0.0006, wholesale: 0.00036, name: 'GPT-5.6 Luna' },
  };

  const totalMonthlyPrompts = activeUsers * promptsPerDay * 30;
  const retailMonthlyCost = Math.round(totalMonthlyPrompts * modelRates[selectedModelTier].retail);
  const galxaiWholesaleCost = Math.round(totalMonthlyPrompts * modelRates[selectedModelTier].wholesale * 0.7); // with 75% prompt cache pass-through
  const cashSavedMonthly = retailMonthlyCost - galxaiWholesaleCost;
  const grossMarginBoost = Math.round((cashSavedMonthly / (retailMonthlyCost || 1)) * 100);

  // ===========================================================================
  // 3. SIMULATED 30-SECOND INTEGRATION SPEED RACE
  // ===========================================================================
  const [raceRunning, setRaceRunning] = useState(false);
  const [raceProgressGalx, setRaceProgressGalx] = useState(100);
  const [raceProgressDiy, setRaceProgressDiy] = useState(8);
  const [activeRaceStep, setActiveRaceStep] = useState(4);

  const RACE_STEPS = [
    { time: '00:05s', text: '1. Add API key in .env.local' },
    { time: '00:15s', text: '2. Point the OpenAI SDK at GALXAI' },
    { time: '00:25s', text: '3. Zero backend proxies, zero client secret leaks' },
    { time: '00:30s', text: '4. Shipped to production & profitable on user #1' },
  ];

  const startSpeedRace = () => {
    setRaceRunning(true);
    setRaceProgressGalx(0);
    setRaceProgressDiy(0);
    setActiveRaceStep(0);

    let g = 0;
    const intervalG = setInterval(() => {
      g += 5;
      setRaceProgressGalx(g);
      if (g >= 25 && g < 50) setActiveRaceStep(1);
      if (g >= 50 && g < 75) setActiveRaceStep(2);
      if (g >= 75 && g < 100) setActiveRaceStep(3);

      if (g >= 100) {
        setRaceProgressGalx(100);
        setActiveRaceStep(4);
        clearInterval(intervalG);
      }
    }, 45);

    let d = 0;
    const intervalD = setInterval(() => {
      d += 0.8;
      if (d >= 16) {
        setRaceProgressDiy(16);
        setRaceRunning(false);
        clearInterval(intervalD);
      } else {
        setRaceProgressDiy(d);
      }
    }, 80);
  };

  const handleCopy = async (text: string, key: string) => {
    const ok = await safeCopyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  return (
    <section className="relative w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-24">
      {/* Dynamic Aurora Backdrop */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[650px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/15 via-indigo-600/10 to-transparent blur-[130px] pointer-events-none -z-10 animate-pulse-glow" />
      <div className="absolute top-1/3 right-10 w-[450px] h-[350px] bg-amber-500/5 blur-[100px] pointer-events-none -z-10" />

      {/* ========================================================================= */}
      {/* 1. MASTER VALUE PROPOSITION HEADER & HYPER-INTERACTIVE SANDBOX            */}
      {/* ========================================================================= */}
      <div className="relative text-center space-y-8 max-w-5xl mx-auto">
        
        {/* Luminous Pulsing Eyebrow with Radar Sweep */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold tracking-wider shadow-lg shadow-cyan-500/10 hover:border-cyan-400/60 transition-all cursor-default">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
          </span>
          <span className="uppercase font-mono">ZERO PLUMBING • WHOLESALE ACCELERATION</span>
        </div>

        {/* Dynamic Kinetic Headline */}
        <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.06]">
          Ship AI in 30 seconds.{' '}
          <span className="text-cyan-300">
            Keep the money you make.
          </span>
        </h2>

        {/* Subtitle */}
        <p className="text-base sm:text-xl text-zinc-400 leading-relaxed font-normal max-w-3xl mx-auto">
          Most AI apps die for two reasons: <strong className="text-zinc-100 font-semibold">they take weeks to build</strong>, and{' '}
          <strong className="text-rose-400 font-semibold">their AI bills are higher than their revenue</strong>.
        </p>

        {/* Value Guarantee Glass Ribbon */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0d1222]/80 border border-white/10 backdrop-blur-2xl max-w-3xl mx-auto shadow-2xl transition-all hover:border-cyan-500/30">
          <p className="text-sm sm:text-base text-zinc-200 font-medium leading-relaxed">
            GALXAI fixes both: <span className="text-cyan-300 font-bold">1 line of code</span> to add AI to your app, and{' '}
            <span className="text-amber-300 font-bold">wholesale pricing</span> so you&apos;re profitable from user #1.
          </p>
        </div>

        {/* ======================================================================= */}
        {/* HYPER-INTERACTIVE MULTIMODAL SANDBOX HUB (BESPOKE 3D SPOTLIGHT CARD)   */}
        {/* ======================================================================= */}
        <BespokeSpotlightCard
          glowColor="cyan"
          tilt={true}
          className="w-full max-w-4xl mx-auto bg-[#060911]/95 border border-white/15 shadow-2xl backdrop-blur-2xl text-left"
          innerClassName="p-4 sm:p-7 space-y-6"
        >
          
          {/* Top Multi-Mode Interactive Switcher */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-sm" />
              <span className="text-zinc-500 text-xs font-mono pl-2">galxai-interactive-hub v5.6</span>
            </div>

            {/* Sandbox View Tabs */}
            <div className="flex items-center flex-wrap gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 text-xs font-mono">
              <button
                onClick={() => setSandboxMode('terminal')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold hover:scale-[1.03] active:scale-[0.97] ${
                  sandboxMode === 'terminal'
                    ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                1. Terminal CLI
              </button>
              <button
                onClick={() => setSandboxMode('roi')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold hover:scale-[1.03] active:scale-[0.97] ${
                  sandboxMode === 'roi'
                    ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                2. Profit Math
              </button>
              <button
                onClick={() => setSandboxMode('speed')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold hover:scale-[1.03] active:scale-[0.97] ${
                  sandboxMode === 'speed'
                    ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                3. 30s Speed Race
              </button>
              <button
                onClick={() => setSandboxMode('enclave')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold hover:scale-[1.03] active:scale-[0.97] ${
                  sandboxMode === 'enclave'
                    ? 'bg-purple-500 text-white font-bold shadow-md shadow-purple-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                4. Private Enclave
              </button>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* TAB 1: INTERACTIVE EDITABLE TERMINAL RUNNER                           */}
          {/* ===================================================================== */}
          {sandboxMode === 'terminal' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Preset Chips */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-[11px] uppercase font-bold">Try Prompts:</span>
                  {CLI_PRESETS.map((preset, idx) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setCustomInputPrompt(preset.label === 'Hello World' ? 'Hello' : preset.label === 'Prompt Caching' ? 'Explain continuous prompt caching in 10 words' : preset.label === 'Drop-in UI' ? 'npx galxai add image' : 'Build profitable AI software');
                        runTerminalSimulation(idx);
                      }}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer hover:scale-[1.04] active:scale-[0.96] ${
                        activePresetIndex === idx
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold'
                          : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
                  <button
                    onClick={() => setStreamSpeed(streamSpeed === 'normal' ? 'turbo' : 'normal')}
                    className={`px-2 py-0.5 rounded border transition-colors cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${
                      streamSpeed === 'turbo' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold' : 'bg-white/5 text-white/70 border-white/5'
                    }`}
                  >
                    Speed: {streamSpeed === 'turbo' ? '⚡ Turbo (10x)' : '1x Realtime'}
                  </button>
                  <span>Hit <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">Enter</kbd></span>
                </div>
              </div>

              {/* Editable Command Line Input */}
              <div className="flex flex-col sm:flex-row items-center gap-2 p-2.5 rounded-2xl bg-black/70 border border-white/15 shadow-inner focus-within:border-cyan-400/60 transition-colors">
                <div className="flex-1 flex items-center gap-2 px-2 text-xs sm:text-sm font-mono text-cyan-200 w-full">
                  <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-zinc-500 select-none">$ npx galxai &quot;</span>
                  <input
                    type="text"
                    value={customInputPrompt}
                    onChange={(e) => setCustomInputPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') runTerminalSimulation(undefined, customInputPrompt);
                    }}
                    placeholder="Type any prompt..."
                    className="flex-1 bg-transparent text-cyan-300 font-bold focus:outline-none placeholder-zinc-600 font-mono text-xs sm:text-sm"
                  />
                  <span className="text-zinc-500 select-none">&quot;</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0">
                  <button
                    onClick={() => runTerminalSimulation(undefined, customInputPrompt)}
                    disabled={isSimulating}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 fill-black" />
                    <span>{isSimulating ? 'Streaming...' : 'Run ($)'}</span>
                  </button>

                  <button
                    onClick={() => handleCopy(`npx galxai "${customInputPrompt}"`, 'hero-cli')}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shrink-0 hover:scale-[1.03] active:scale-[0.97]"
                  >
                    {copiedKey === 'hero-cli' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Streaming Output Box */}
              <div className="relative rounded-2xl bg-[#030509] border border-white/10 p-4 font-mono text-xs sm:text-[13px] text-zinc-300 min-h-[120px] shadow-inner overflow-hidden flex flex-col justify-between">
                <pre className="whitespace-pre-wrap leading-relaxed font-mono">
                  <code>
                    {simulatedStream}
                    {isSimulating && <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse" />}
                  </code>
                </pre>

                {/* Real-Time Telemetry Bar */}
                <div className="pt-4 flex flex-wrap items-center gap-2 text-[11px] border-t border-white/5 mt-3">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    TTFT: {CLI_PRESETS[activePresetIndex].ttft}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-medium">
                    {CLI_PRESETS[activePresetIndex].discount}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-medium">
                    Cache: {CLI_PRESETS[activePresetIndex].cache}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold">
                    Cost: {CLI_PRESETS[activePresetIndex].cost}{' '}
                    <span className="line-through text-zinc-500 font-normal font-sans text-[10px]">
                      ({CLI_PRESETS[activePresetIndex].retail} retail)
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 3: INTERACTIVE PROFIT & GROSS MARGIN CALCULATOR                  */}
          {/* ===================================================================== */}
          {sandboxMode === 'roi' && (
            <div className="space-y-5 animate-in fade-in duration-200 font-sans">
              {/* Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-black/40 p-4 rounded-2xl border border-white/10">
                {/* Model Tier Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase font-bold">Model Engine:</label>
                  <div className="flex rounded-xl bg-white/5 p-1 text-xs font-mono">
                    {(['sol', 'terra', 'luna'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setSelectedModelTier(m)}
                        className={`flex-1 py-1 text-center rounded-lg transition-all cursor-pointer font-bold capitalize hover:scale-[1.03] active:scale-[0.97] ${
                          selectedModelTier === m
                            ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Users Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400 text-[11px]">Active Users:</span>
                    <span className="text-cyan-300 font-bold">{activeUsers.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="20000"
                    step="200"
                    value={activeUsers}
                    onChange={(e) => setActiveUsers(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Prompts Per User / Day */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400 text-[11px]">Prompts / User / Day:</span>
                    <span className="text-indigo-300 font-bold">{promptsPerDay} req</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="50"
                    step="1"
                    value={promptsPerDay}
                    onChange={(e) => setPromptsPerDay(Number(e.target.value))}
                    className="w-full accent-indigo-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Real-Time Calculated ROI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-[10px] uppercase font-bold">Direct Retail Bill</span>
                    <span className="text-rose-400 text-[10px]">OpenAI Direct</span>
                  </div>
                  <div className="text-rose-400 font-black text-xl">${retailMonthlyCost.toLocaleString()} / mo</div>
                  <span className="text-[11px] text-zinc-500 font-sans block">
                    {totalMonthlyPrompts.toLocaleString()} calls @ {modelRates[selectedModelTier].retail * 1000}¢
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 text-[10px] uppercase font-bold">GALXAI Wholesale</span>
                    <span className="text-emerald-400 text-[10px] font-bold">Tier-5 Pipe</span>
                  </div>
                  <div className="text-emerald-300 font-black text-xl">${galxaiWholesaleCost.toLocaleString()} / mo</div>
                  <span className="text-[11px] text-emerald-400/80 font-sans block">
                    Includes 75% prompt cache pass-through
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 text-[10px] uppercase font-bold">Cash Back In Bank</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black">
                      +{grossMarginBoost}% Margin
                    </span>
                  </div>
                  <div className="text-amber-300 font-black text-xl">+${cashSavedMonthly.toLocaleString()} / mo</div>
                  <span className="text-[11px] text-amber-300/90 font-sans block font-semibold">
                    Pure profit on {modelRates[selectedModelTier].name}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 4: INTERACTIVE 30-SECOND SPEED RACE                               */}
          {/* ===================================================================== */}
          {sandboxMode === 'speed' && (
            <div className="space-y-4 animate-in fade-in duration-200 font-sans">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono text-white font-bold block">
                    Time-to-First-Dollar Speed Benchmark
                  </span>
                  <span className="text-[11px] text-zinc-400 font-sans">
                    Compare drop-in zero-proxy primitives vs 4-week backend proxy engineering
                  </span>
                </div>

                <button
                  onClick={startSpeedRace}
                  disabled={raceRunning}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/20 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5 fill-black" />
                  <span>{raceRunning ? 'Racing...' : 'Simulate 30s Race'}</span>
                </button>
              </div>

              {/* Progress 1: GALXAI */}
              <div className="p-4 rounded-2xl bg-[#080d1a] border border-emerald-500/40 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    GALXAI (1-Line Drop-in Primitive)
                  </span>
                  <span className="text-emerald-400 font-black">
                    {raceProgressGalx >= 100 ? '00:30s (Shipped & Profitable!)' : `00:${Math.min(30, Math.floor(raceProgressGalx * 0.3))}s`}
                  </span>
                </div>
                <div className="w-full bg-black/70 rounded-full h-3.5 overflow-hidden p-0.5 border border-white/10">
                  <div
                    className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 h-full rounded-full transition-all duration-200"
                    style={{ width: `${raceProgressGalx}%` }}
                  />
                </div>

                {/* Step checklist items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
                  {RACE_STEPS.map((step, idx) => (
                    <div
                      key={step.text}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                        activeRaceStep > idx
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                          : 'bg-black/30 border-white/5 text-zinc-500'
                      }`}
                    >
                      <span className="text-[10px] text-zinc-400 font-sans">{step.time}</span>
                      <span className="truncate">{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress 2: DIY Custom Proxy Rewrite */}
              <div className="p-3.5 rounded-2xl bg-[#080d1a] border border-rose-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-rose-400 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    DIY Proxy (Docker + Flask + CORS + Key Vault + Streaming)
                  </span>
                  <span className="text-zinc-500">4 Weeks ($150,000 Payroll Burn)</span>
                </div>
                <div className="w-full bg-black/60 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
                  <div
                    className="bg-rose-500/60 h-full rounded-full transition-all duration-300"
                    style={{ width: `${raceProgressDiy}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 5: SOVEREIGN PRIVATE ENCLAVE & ZERO DATA RETENTION SIMULATOR       */}
          {/* ===================================================================== */}
          {sandboxMode === 'enclave' && (
            <div className="space-y-4 animate-in fade-in duration-200 font-sans">
              {/* Header Info & Frontier Model Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/40 p-3.5 rounded-2xl border border-purple-500/30">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono text-purple-300 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    Dedicated Frontier GPT Private Enclave
                  </span>
                  <span className="text-[11px] text-zinc-400 font-sans">
                    Guaranteed Zero Data Retention (ZDR) &amp; Zero Egress Fees behind single-tenant VPCs
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex rounded-xl bg-white/5 p-1 text-xs font-mono">
                    {(['sol', 'terra', 'luna'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => verifyPrivateEnclave(t)}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-bold capitalize hover:scale-[1.03] active:scale-[0.97] ${
                          frontierEnclaveTier === t
                            ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4 Interactive Security Policy Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-xs">
                <div
                  onClick={() => setZeroRetentionActive(!zeroRetentionActive)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer select-none space-y-1 hover:scale-[1.02] active:scale-[0.98] ${
                    zeroRetentionActive
                      ? 'bg-purple-950/20 border-purple-500/40 text-purple-200'
                      : 'bg-black/30 border-white/5 text-zinc-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase">Zero Data Retention</span>
                    <span className={`w-2 h-2 rounded-full ${zeroRetentionActive ? 'bg-purple-400 animate-pulse' : 'bg-zinc-600'}`} />
                  </div>
                  <span className="text-xs font-bold block">0-Day Buffer</span>
                  <span className="text-[10px] text-zinc-400 font-sans block">Never stored or trained on</span>
                </div>

                <div
                  onClick={() => setEnclaveVpcActive(!enclaveVpcActive)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer select-none space-y-1 hover:scale-[1.02] active:scale-[0.98] ${
                    enclaveVpcActive
                      ? 'bg-cyan-950/20 border-cyan-500/40 text-cyan-200'
                      : 'bg-black/30 border-white/5 text-zinc-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase">Dedicated VPC</span>
                    <span className={`w-2 h-2 rounded-full ${enclaveVpcActive ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-600'}`} />
                  </div>
                  <span className="text-xs font-bold block">Private Edge Route</span>
                  <span className="text-[10px] text-zinc-400 font-sans block">Sub-15ms edge routing</span>
                </div>

                <div
                  onClick={() => setZeroEgressActive(!zeroEgressActive)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer select-none space-y-1 hover:scale-[1.02] active:scale-[0.98] ${
                    zeroEgressActive
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                      : 'bg-black/30 border-white/5 text-zinc-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase">Egress Data Fee</span>
                    <span className={`w-2 h-2 rounded-full ${zeroEgressActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                  </div>
                  <span className="text-xs font-bold block">$0.00 / GB Tax</span>
                  <span className="text-[10px] text-zinc-400 font-sans block">Free data transfers</span>
                </div>

                <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/40 text-amber-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase">Prompt Cache</span>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  </div>
                  <span className="text-xs font-bold block">-75% Token Rebate</span>
                  <span className="text-[10px] text-zinc-400 font-sans block">100% sent to balance</span>
                </div>
              </div>

              {/* Cryptographic Audit Terminal Box */}
              <div className="rounded-2xl bg-[#030509] border border-purple-500/30 p-4 font-mono text-xs text-purple-200 min-h-[110px] shadow-inner flex flex-col justify-between space-y-3">
                <pre className="whitespace-pre-wrap leading-relaxed font-mono text-[11px] sm:text-xs">
                  <code>{enclaveAuditLog}</code>
                </pre>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-purple-500/20 text-[10px] text-zinc-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      SOC-2 Type II Certified
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      HIPAA / GDPR Ready
                    </span>
                  </div>

                  <button
                    onClick={() => verifyPrivateEnclave(frontierEnclaveTier)}
                    disabled={isVerifyingEnclave}
                    className="px-3 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500 hover:text-white transition-all cursor-pointer font-bold disabled:opacity-50 hover:scale-[1.03] active:scale-[0.97]"
                  >
                    {isVerifyingEnclave ? 'Auditing Enclave...' : 'Run Cryptographic Audit'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* Primary High-Impact CTA Row (Always Visible)                          */}
          {/* ===================================================================== */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10">
            <div className="flex items-center gap-4 text-xs text-zinc-400 font-sans">
              <span className="flex items-center gap-1 text-zinc-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Zero API Key Leaks
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-zinc-300">
                <Sparkles className="w-4 h-4 text-amber-400" />
                $10 Free Credit
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline text-zinc-300">30s Setup</span>
            </div>

            <Link
              href={authEntryPath(DEFAULT_POST_AUTH_PATH, 'signup')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black font-black text-xs uppercase tracking-wider shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer font-mono"
            >
              <span>Start Building Free ($10 Credit)</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>
          </div>

        </BespokeSpotlightCard>
      </div>

      {/* ========================================================================= */}
      {/* 2. THE REALITY (2-COLUMN ARTISANAL CONTRAST CARDS)                         */}
      {/* ========================================================================= */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
              01 • The Fundamental Reality
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Why Building with AI Has Been Broken
            </h3>
          </div>
          <span className="text-xs text-zinc-500 font-mono hidden sm:inline">2 Existential Flaws Solved</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: The Plumbing Trap */}
          <BespokeSpotlightCard
            glowColor="cyan"
            tilt={true}
            className="bg-[#0b0f1a]/85 border border-white/10 backdrop-blur-xl shadow-2xl h-full flex flex-col"
            innerClassName="p-6 sm:p-8 flex flex-col justify-between space-y-6 h-full"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>FLAW #1: THE PLUMBING TRAP</span>
              </div>

              <h4 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                You shouldn&apos;t have to build a server just to add an AI feature.
              </h4>

              {/* Contrast Split */}
              <div className="space-y-3 pt-2 text-xs sm:text-sm">
                <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/20 text-rose-100 space-y-1">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wide">
                    <span>❌ The Old Way</span>
                  </div>
                  <p className="text-rose-100/75 leading-relaxed font-sans text-xs">
                    Spend 4 weeks writing custom API proxy routes, handling secret browser leaks, chunking streaming WebSockets, and building loading states.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-100 space-y-1 shadow-inner">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>👉 With GALXAI</span>
                  </div>
                  <p className="text-zinc-200 font-medium leading-relaxed font-sans text-xs">
                    Paste 1 line of declarative React into your frontend. Zero backend routes to maintain. Zero secret key exposure.
                  </p>
                </div>
              </div>
            </div>

            {/* Code Visual Micro-Card */}
            <div className="rounded-2xl bg-[#06080e] border border-white/10 p-3.5 font-mono text-[11px] text-zinc-300 space-y-1">
              <div className="flex items-center justify-between text-zinc-500 pb-1 border-b border-white/5">
                <span>Next.js Client Component</span>
                <span className="text-emerald-400">Zero backend needed</span>
              </div>
              <pre className="text-cyan-300 overflow-x-auto py-1">
                <code>{`import { GalxImage } from 'galxai/ui';\n\n<GalxImage prompt="Cyberpunk skyline" aspectRatio="16:9" />`}</code>
              </pre>
            </div>
          </BespokeSpotlightCard>

          {/* Card 2: The Profit Trap */}
          <BespokeSpotlightCard
            glowColor="amber"
            tilt={true}
            className="bg-[#0b0f1a]/85 border border-white/10 backdrop-blur-xl shadow-2xl h-full flex flex-col"
            innerClassName="p-6 sm:p-8 flex flex-col justify-between space-y-6 h-full"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono font-semibold">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                <span>FLAW #2: THE PROFIT TRAP</span>
              </div>

              <h4 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                You shouldn&apos;t lose money when users love your product.
              </h4>

              {/* Contrast Split */}
              <div className="space-y-3 pt-2 text-xs sm:text-sm">
                <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/20 text-rose-100 space-y-1">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wide">
                    <span>❌ The Retail Trap</span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed font-sans text-xs">
                    You charge a user $20/month. They run power-user prompts, and OpenAI bills you $35/month. More users means faster bankruptcy.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-100 space-y-1 shadow-inner">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>👉 With GALXAI</span>
                  </div>
                  <p className="text-zinc-200 font-medium leading-relaxed font-sans text-xs">
                    You get 30%–40% wholesale pricing and 100% of your prompt caching discounts returned to your wallet. You stay in the black on every user.
                  </p>
                </div>
              </div>
            </div>

            {/* Economics Micro-Card */}
            <div className="rounded-2xl bg-[#06080e] border border-white/10 p-3.5 font-mono text-[11px] text-zinc-300 flex items-center justify-between">
              <div>
                <span className="text-zinc-500 block text-[10px]">RETAIL BILL</span>
                <span className="text-rose-400 font-bold line-through">$10,000 / mo</span>
              </div>
              <div className="text-right">
                <span className="text-emerald-400 block text-[10px] font-bold">GALXAI WHOLESALE</span>
                <span className="text-emerald-300 font-black text-sm">$6,200 / mo (-38%)</span>
              </div>
            </div>
          </BespokeSpotlightCard>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SOLUTIONS DESIGNED FOR PRIVATE & SECURE AI WORKFLOWS (3 PILLARS)       */}
      {/* ========================================================================= */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold tracking-widest text-purple-400 uppercase">
              02 • Enterprise Neocloud Architecture
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Solutions Designed for Seamless, Secure, and Efficient Private AI Workflows
            </h3>
          </div>
          <span className="text-xs text-zinc-500 font-mono hidden sm:inline">Frontier GPT Sovereign Infrastructure</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Card 1: Increase Performance */}
          <BespokeSpotlightCard
            glowColor="cyan"
            tilt={true}
            className="bg-[#090d1a]/85 border border-white/10 backdrop-blur-xl shadow-2xl h-full flex flex-col"
            innerClassName="p-6 sm:p-7 flex flex-col justify-between space-y-5 h-full"
          >
            <div className="space-y-3.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
                <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                <span>INCREASE PERFORMANCE</span>
              </div>
              <h4 className="text-xl font-bold text-white leading-snug">
                High-Availability Edge Routing &amp; Continuous Cache
              </h4>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-sans">
                Maximize the speed and efficiency of your AI projects with our high-performance edge infrastructure. Multi-tiered continuous prefix caching cuts token latency by 75% on GALX Nova.
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-500">First Token Latency:</span>
                <span className="text-emerald-400 font-bold">GALX API</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-500">Prefix Cache Rebate:</span>
                <span className="text-cyan-300 font-bold">-75% Cost Pass-Through</span>
              </div>
            </div>
          </BespokeSpotlightCard>

          {/* Card 2: Remove Bottlenecks */}
          <BespokeSpotlightCard
            glowColor="indigo"
            tilt={true}
            className="bg-[#090d1a]/85 border border-white/10 backdrop-blur-xl shadow-2xl h-full flex flex-col"
            innerClassName="p-6 sm:p-7 flex flex-col justify-between space-y-5 h-full"
          >
            <div className="space-y-3.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>REMOVE BOTTLENECKS</span>
              </div>
              <h4 className="text-xl font-bold text-white leading-snug">
                Zero Data Retention &amp; $0.00 Egress Tax
              </h4>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-sans">
                Eliminate obstacles in your enterprise AI workflows. Prompts and outputs are processed in volatile memory with guaranteed Zero Data Retention behind your firewall with zero bandwidth egress penalties.
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-500">Data Retention:</span>
                <span className="text-purple-300 font-bold">0-Day Strict ZDR</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-500">Egress / Ingress:</span>
                <span className="text-emerald-400 font-bold">$0.00 (Zero Egress Tax)</span>
              </div>
            </div>
          </BespokeSpotlightCard>

          {/* Card 3: Optimize Workflow */}
          <BespokeSpotlightCard
            glowColor="amber"
            tilt={true}
            className="bg-[#090d1a]/85 border border-white/10 backdrop-blur-xl shadow-2xl h-full flex flex-col"
            innerClassName="p-6 sm:p-7 flex flex-col justify-between space-y-5 h-full"
          >
            <div className="space-y-3.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>OPTIMIZE WORKFLOW</span>
              </div>
              <h4 className="text-xl font-bold text-white leading-snug">
                1-Line Primitives &amp; Pre-Wired Agent Rules
              </h4>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-sans">
                Streamline operations and accelerate time-to-market. Drop React primitives directly into your UI, or automatically write `.cursorrules` and `AGENTS.md` so coding assistants build clean architectures on prompt #1.
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-500">Integration Speed:</span>
                <span className="text-amber-300 font-bold">30 Seconds (1 Line)</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-500">AI Coding Assistant:</span>
                <span className="text-cyan-300 font-bold">Auto .cursorrules</span>
              </div>
            </div>
          </BespokeSpotlightCard>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. THREE WAYS TO USE IT (BESPOKE INTERACTIVE WORKBENCH)                    */}
      {/* ========================================================================= */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold tracking-widest text-indigo-400 uppercase">
              03 • Architecture in Practice
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              3 Ways to Use GALXAI
            </h3>
          </div>

          {/* Interactive Navigation Pills */}
          <div className="flex items-center p-1 rounded-2xl bg-[#0a0d17] border border-white/15 text-xs font-mono self-start sm:self-auto shadow-inner">
            <button
              onClick={() => setActiveModeTab('ui')}
              className={`px-3.5 py-2 rounded-xl transition-all font-semibold cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${
                activeModeTab === 'ui'
                  ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              1. New App (UI Components)
            </button>
            <button
              onClick={() => setActiveModeTab('patch')}
              className={`px-3.5 py-2 rounded-xl transition-all font-semibold cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${
                activeModeTab === 'patch'
                  ? 'bg-indigo-500 text-white font-bold shadow-md shadow-indigo-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              2. Existing App (1-Line Patch)
            </button>
            <button
              onClick={() => setActiveModeTab('agents')}
              className={`px-3.5 py-2 rounded-xl transition-all font-semibold cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${
                activeModeTab === 'agents'
                  ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              3. AI Agents (Cursor / Windsurf)
            </button>
          </div>
        </div>

        {/* Tab 1: New App (UI Components) */}
        {activeModeTab === 'ui' && (
          <BespokeSpotlightCard
            glowColor="cyan"
            tilt={true}
            className="bg-[#090d19]/90 border border-cyan-500/30 backdrop-blur-2xl shadow-2xl animate-in fade-in duration-300"
            innerClassName="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          >
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-mono font-bold">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>WAY #1: ZERO-BACKEND UI PRIMITIVES</span>
              </div>
              <h4 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Drop AI directly into your frontend in one line.
              </h4>
              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed font-sans">
                Drop an interactive AI image generator into your Next.js or React pages. It handles loading states, secret injection, and error recovery automatically.
              </p>

              <div className="flex items-center gap-4 pt-2 text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Zero API routes</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Zero key leaks</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>30s Setup</span>
                </div>
              </div>
            </div>

            {/* Live Interactive Code Preview */}
            <div className="lg:col-span-6 rounded-2xl bg-[#04060b] border border-white/15 p-5 shadow-2xl font-mono text-xs text-zinc-300 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-zinc-500 text-[11px] pl-2 font-mono">
                    StudioBanner.tsx
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleCopy(
                      `import { GalxImage } from 'galxai/ui';\n\nexport function Banner() {\n  return (\n    <GalxImage\n      prompt="Cyberpunk skyline at dusk"\n      aspectRatio="16:9"\n      interactive\n    />\n  );\n}`,
                      'code-ui'
                    )
                  }
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 transition-all cursor-pointer text-[11px] flex items-center gap-1 hover:scale-[1.04] active:scale-[0.96]"
                >
                  {copiedKey === 'code-ui' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'code-ui' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <pre className="text-cyan-200 overflow-x-auto leading-relaxed text-xs">
                <code>
                  <span className="text-purple-400">import</span> &#123;{' '}
                  <span className="text-amber-300 font-bold">GalxImage</span> &#125;{' '}
                  <span className="text-purple-400">from</span> <span className="text-emerald-300">&apos;galxai/ui&apos;</span>;{'\n\n'}
                  <span className="text-purple-400">export function</span> <span className="text-cyan-400">Banner</span>() &#123;{'\n'}
                  {'  '}<span className="text-purple-400">return</span> ({'\n'}
                  {'    '}&lt;<span className="text-amber-300 font-bold">GalxImage</span>{'\n'}
                  {'      '}prompt=<span className="text-emerald-300">&quot;Cyberpunk skyline at dusk&quot;</span>{'\n'}
                  {'      '}aspectRatio=<span className="text-emerald-300">&quot;16:9&quot;</span>{'\n'}
                  {'      '}interactive{'\n'}
                  {'      '}className=<span className="text-emerald-300">&quot;w-full h-80 rounded-2xl&quot;</span>{'\n'}
                  {'    '}/&gt;{'\n'}
                  {'  '});{'\n'}
                  &#125;
                </code>
              </pre>
            </div>
          </BespokeSpotlightCard>
        )}

        {/* Tab 2: Existing App (1-Line Patch) */}
        {activeModeTab === 'patch' && (
          <BespokeSpotlightCard
            glowColor="indigo"
            tilt={true}
            className="bg-[#090d19]/90 border border-indigo-500/30 backdrop-blur-2xl shadow-2xl animate-in fade-in duration-300"
            innerClassName="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          >
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-mono font-bold">
                <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>WAY #2: 1-LINE UPGRADE</span>
              </div>
              <h4 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Add 1 line. Instantly cut your OpenAI bill by 30%–40%.
              </h4>
              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed font-sans">
                Keep your existing codebase 100% untouched. Add a single import at the top of your app to automatically route all inference calls through GALXAI with sustainable pricing, high-availability edge failover, and prompt caching.
              </p>

              <div className="flex items-center gap-4 pt-2 text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>0 code rewrite</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>100% OpenAI compatible</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Instant discount</span>
                </div>
              </div>
            </div>

            {/* Code Snippet for Patch */}
            <div className="lg:col-span-6 rounded-2xl bg-[#04060b] border border-white/15 p-5 shadow-2xl font-mono text-xs text-zinc-300 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-zinc-400 text-[11px]">server.ts or layout.tsx</span>
                <button
                  onClick={() =>
                    handleCopy(
                      `// Add this one line at the top of your project:\nimport 'galxai/patch';\n\nimport OpenAI from 'openai';\nconst openai = new OpenAI(); // 30-40% cheaper automatically!`,
                      'code-patch'
                    )
                  }
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 transition-all cursor-pointer text-[11px] flex items-center gap-1 hover:scale-[1.04] active:scale-[0.96]"
                >
                  {copiedKey === 'code-patch' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'code-patch' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <pre className="text-indigo-200 overflow-x-auto leading-relaxed text-xs">
                <code>
                  <span className="text-emerald-400 font-bold">// 1. Add this single import at the top of your app:</span>{'\n'}
                  <span className="text-purple-400 font-bold">import</span> <span className="text-emerald-300 font-bold">&apos;galxai/patch&apos;</span>;{'\n\n'}
                  <span className="text-zinc-500">// 2. Your existing OpenAI code is now automatically discounted!</span>{'\n'}
                  <span className="text-purple-400">import</span> OpenAI <span className="text-purple-400">from</span> <span className="text-emerald-300">&apos;openai&apos;</span>;{'\n'}
                  <span className="text-purple-400">const</span> openai = <span className="text-purple-400">new</span> OpenAI();{'\n\n'}
                  <span className="text-purple-400">const</span> response = <span className="text-purple-400">await</span> openai.chat.completions.create(&#123;{'\n'}
                  {'  '}model: <span className="text-emerald-300">&apos;gpt-5.6-sol&apos;</span>,{'\n'}
                  {'  '}messages: [&#123; role: <span className="text-emerald-300">&apos;user&apos;</span>, content: <span className="text-emerald-300">&apos;Analyze data&apos;</span> &#125;],{'\n'}
                  &#125;);
                </code>
              </pre>
            </div>
          </BespokeSpotlightCard>
        )}

        {/* Tab 3: AI Agents (Cursor / Claude Code / Windsurf) */}
        {activeModeTab === 'agents' && (
          <BespokeSpotlightCard
            glowColor="amber"
            tilt={true}
            className="bg-[#090d19]/90 border border-amber-500/30 backdrop-blur-2xl shadow-2xl animate-in fade-in duration-300"
            innerClassName="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          >
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-mono font-bold">
                <Bot className="w-3.5 h-3.5 text-amber-400" />
                <span>WAY #3: CODING AGENT DIRECTIVES</span>
              </div>
              <h4 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Pre-wire Cursor, Claude Code, and Windsurf.
              </h4>
              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed font-sans">
                When AI coding assistants write code for you, they frequently hallucinate messy backend proxies and prompt users for API keys. Run 1 command to write exact rules into `.cursorrules` and `AGENTS.md`.
              </p>

              <div className="flex items-center gap-4 pt-2 text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Auto .cursorrules</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Auto CLAUDE.md</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Zero hallucinated proxies</span>
                </div>
              </div>
            </div>

            {/* Terminal Command Box */}
            <div className="lg:col-span-6 rounded-2xl bg-[#04060b] border border-white/15 p-5 shadow-2xl font-mono text-xs text-zinc-300 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-amber-400 font-bold text-[11px]">Run in your project root:</span>
                <button
                  onClick={() => handleCopy(`npx galxai skills`, 'code-agents')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 transition-all cursor-pointer text-[11px] flex items-center gap-1 hover:scale-[1.04] active:scale-[0.96]"
                >
                  {copiedKey === 'code-agents' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'code-agents' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-black/60 border border-amber-500/20 text-amber-200 font-mono text-sm flex items-center justify-between">
                <code>npx galxai skills</code>
              </div>

              <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                Instantly generates rules for Cursor, Claude Code, and Windsurf so they build clean, zero-proxy GALXAI architectures on prompt #1.
              </p>
            </div>
          </BespokeSpotlightCard>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. THE MATH (PURE HIGH-SIGNAL COMPARISON MATRIX)                           */}
      {/* ========================================================================= */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
              04 • The Unit Economics
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              The Math: Doing It Yourself vs GALXAI
            </h3>
          </div>
          <span className="text-xs text-zinc-500 font-mono hidden sm:inline">Clear ROI</span>
        </div>

        <BespokeSpotlightCard
          glowColor="emerald"
          tilt={false}
          className="border border-white/10 bg-[#090d18]/90 backdrop-blur-2xl shadow-2xl overflow-hidden"
          innerClassName="w-full"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm font-sans">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-zinc-400 font-mono text-xs uppercase tracking-wider">
                  <th className="py-4 px-6">Dimension</th>
                  <th className="py-4 px-6 text-rose-400">Doing It Yourself / Raw APIs</th>
                  <th className="py-4 px-6 text-emerald-400 font-bold bg-emerald-500/5">With GALXAI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6 font-medium text-white">Time to ship a feature</td>
                  <td className="py-4 px-6 text-zinc-400">3–4 Weeks of plumbing</td>
                  <td className="py-4 px-6 font-bold text-emerald-300 bg-emerald-500/5">30 Seconds</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6 font-medium text-white">Backend servers to maintain</td>
                  <td className="py-4 px-6 text-zinc-400">5–10 custom API routes &amp; proxies</td>
                  <td className="py-4 px-6 font-bold text-emerald-300 bg-emerald-500/5">Zero</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6 font-medium text-white">API Token Cost</td>
                  <td className="py-4 px-6 text-zinc-400">100% full retail list price</td>
                  <td className="py-4 px-6 font-bold text-emerald-300 bg-emerald-500/5">Wholesale (30%–40% Off)</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6 font-medium text-white">Prompt cache savings</td>
                  <td className="py-4 px-6 text-zinc-400">Kept by provider</td>
                  <td className="py-4 px-6 font-bold text-emerald-300 bg-emerald-500/5">100% Refunded to You</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6 font-medium text-white">Data Retention &amp; Privacy</td>
                  <td className="py-4 px-6 text-zinc-400">Prompts logged &amp; training risk</td>
                  <td className="py-4 px-6 font-bold text-emerald-300 bg-emerald-500/5">0-Day Strict Zero Data Retention (ZDR)</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6 font-medium text-white">Data Transfer Fees</td>
                  <td className="py-4 px-6 text-zinc-400">Egress &amp; ingress bandwidth taxes</td>
                  <td className="py-4 px-6 font-bold text-emerald-300 bg-emerald-500/5">$0.00 (Zero Egress Tax)</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6 font-medium text-white">Stolen API key risk</td>
                  <td className="py-4 px-6 text-zinc-400">High (accidental client leak)</td>
                  <td className="py-4 px-6 font-bold text-emerald-300 bg-emerald-500/5">Zero (Server-only injection)</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6 font-medium text-white">Traffic spike behavior</td>
                  <td className="py-4 px-6 text-zinc-400">HTTP 429 Rate Limit crashes</td>
                  <td className="py-4 px-6 font-bold text-emerald-300 bg-emerald-500/5">Instant High-Availability Edge Failover</td>
                </tr>
              </tbody>
            </table>
          </div>
        </BespokeSpotlightCard>
      </div>

      {/* ========================================================================= */}
      {/* 5. ARTISANAL BOTTOM CALL TO ACTION BANNER                                  */}
      {/* ========================================================================= */}
      <BespokeSpotlightCard
        glowColor="cyan"
        tilt={true}
        className="bg-gradient-to-b from-[#0e1424] via-[#090d19] to-[#06080f] border border-cyan-500/30 shadow-2xl"
        innerClassName="p-8 sm:p-14 text-center space-y-6"
      >
        <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
          <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Stop building plumbing.{' '}
            <span className="text-cyan-300">
              Start making money.
            </span>
          </h3>
          <p className="text-sm sm:text-base text-zinc-400 font-medium font-sans">
            Get your live API key in 10 seconds. Includes $10 free compute credit. No credit card required.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup?next=/keys"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl hover:scale-[1.04] active:scale-[0.96] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-black" />
              <span>Get API Key ($10 Free Credit)</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>

            <Link
              href="/docs"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.04] active:scale-[0.96]"
            >
              <span>Read Documentation</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            </Link>
          </div>

          <div className="pt-3 flex items-center justify-center gap-6 text-[11px] font-mono text-zinc-500">
            <span className="flex items-center gap-1 text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Zero Lock-In
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-zinc-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              No Credit Card
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-zinc-400">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              1-Line Setup
            </span>
          </div>
        </div>
      </BespokeSpotlightCard>
    </section>
  );
}
