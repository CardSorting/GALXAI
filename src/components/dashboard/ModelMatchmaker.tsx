'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Zap,
  Check,
  ArrowRight,
  Flame,
  FileText,
  Code2,
  MessageSquare,
  BarChart3,
  Image as ImageIcon,
  Smile,
  ShieldCheck,
  Coins
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

interface MatchmakerGoal {
  id: string;
  icon: any;
  label: string;
  desc: string;
  recommendedModelId: string;
  recommendedModelName: string;
  provider: string;
  why: string;
  context: string;
  pricing: string;
  discount: string;
}

const GOALS: MatchmakerGoal[] = [
  {
    id: 'writing',
    icon: FileText,
    label: 'Writing & Creative Content',
    desc: 'Articles, essays, copywriting, marketing drafts, and books.',
    recommendedModelId: 'gpt-5.6-sol',
    recommendedModelName: 'GPT-5.6 Sol',
    provider: 'OpenAI Flagship Architecture',
    why: 'Deep nuanced prose, creative flair, and 2M token context for long chapters.',
    context: '2,000,000 Tokens',
    pricing: '$3.75 / 1M input • $11.25 / 1M output',
    discount: '25% Wholesale Discount',
  },
  {
    id: 'coding',
    icon: Code2,
    label: 'Coding & Cursor IDE',
    desc: 'Refactoring, debugging TypeScript/Python, and building apps.',
    recommendedModelId: 'gpt-5.6-sol',
    recommendedModelName: 'GPT-5.6 Sol',
    provider: 'OpenAI Flagship Architecture',
    why: 'Highest benchmark on SWE-bench and constrained JSON structured outputs.',
    context: '2,000,000 Tokens',
    pricing: '$3.75 / 1M input • $11.25 / 1M output',
    discount: '25% Wholesale Discount',
  },
  {
    id: 'reasoning',
    icon: BarChart3,
    label: 'Deep Logic & Math Reasoning',
    desc: 'Complex algorithms, financial spreadsheets, and formal logic.',
    recommendedModelId: 'gpt-5.6-terra',
    recommendedModelName: 'GPT-5.6 Terra (Reasoning Engine)',
    provider: 'OpenAI Chain-of-Thought',
    why: 'Autonomous internal reflection tokens for verifiable high-accuracy problem solving.',
    context: '1,000,000 Tokens',
    pricing: '$10.00 / 1M input • $30.00 / 1M output',
    discount: '33% Wholesale Discount',
  },
  {
    id: 'fast-chat',
    icon: MessageSquare,
    label: 'Fast Chatbot & Support',
    desc: 'High-speed customer support bots and real-time assistants.',
    recommendedModelId: 'gpt-5.6-luna',
    recommendedModelName: 'GPT-5.6 Luna (Instant Velocity)',
    provider: 'Ultra-Low Latency Edge',
    why: 'Sub-10ms Time To First Token with fraction-of-a-cent pricing.',
    context: '256,000 Tokens',
    pricing: '$0.30 / 1M input • $0.90 / 1M output',
    discount: '25% Wholesale Discount',
  },
  {
    id: 'luna',
    icon: Flame,
    label: 'Sub-Second Velocity & Streaming',
    desc: 'Inline autocomplete, real-time customer chatbots, and fast micro-agents.',
    recommendedModelId: 'gpt-5.6-luna',
    recommendedModelName: 'OpenAI GPT-5.6 Luna (Flash)',
    provider: 'OpenAI High-Velocity',
    why: 'Sub-15ms Time To First Token with 140+ tokens/second generation velocity.',
    context: '900,000 Tokens',
    pricing: '$0.95 / 1M input • $3.80 / 1M output',
    discount: '36% Wholesale Discount',
  },
  {
    id: 'images',
    icon: ImageIcon,
    label: 'Image & Visual Studio 4K',
    desc: 'Photorealistic banners, concept art, and product mockups.',
    recommendedModelId: 'openai-gpt-image-latest',
    recommendedModelName: 'OpenAI Image Generation',
    provider: 'OpenAI Visual Synthesis',
    why: 'Studio-grade HDR lighting, typography in images, and fine details.',
    context: '4K Ultra-HD Matrix',
    pricing: '$0.060 / Image',
    discount: '25% Wholesale Discount',
  },
];

function BaseModelMatchmaker() {
  const [selectedGoalId, setSelectedGoalId] = useState<string>('writing');
  const activeGoal = GOALS.find((g) => g.id === selectedGoalId) || GOALS[0];

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-indigo-500/25 bg-indigo-500/5 relative overflow-hidden">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-300 uppercase">
            <Smile className="w-3.5 h-3.5" />
            <span>AI Solution Matchmaker (For Non-Technical Users)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Not sure which model to use? Pick your goal:
          </h2>
          <p className="text-xs text-zinc-300 max-w-2xl">
            Click what you want to build and we&apos;ll automatically match you to the ideal model, context size, and wholesale rate.
          </p>
        </div>

        <ShareButton
          variant="pill"
          label="Share Matchmaker"
          title="GALXAI Model Matchmaker"
          description="Find the perfect AI model for coding, writing, chatbots, or huge documents with 25%–40% wholesale savings."
        />
      </div>

      {/* Goal Selector Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {GOALS.map((goal) => {
          const Icon = goal.icon;
          const isSelected = goal.id === selectedGoalId;

          return (
            <button
              key={goal.id}
              onClick={() => setSelectedGoalId(goal.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between space-y-2 ${
                isSelected
                  ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                isSelected ? 'bg-white text-zinc-950 font-bold' : 'bg-white/5 text-zinc-400'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold leading-tight">{goal.label}</div>
                <div className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{goal.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Recommended Model Result Card */}
      <div className="p-5 rounded-2xl bg-black/60 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {activeGoal.discount}
            </span>
            <span className="text-xs font-mono text-zinc-400">{activeGoal.provider}</span>
          </div>

          <h3 className="text-xl font-black text-white">{activeGoal.recommendedModelName}</h3>
          <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">{activeGoal.why}</p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400 pt-1">
            <span>Context: <strong className="text-cyan-300">{activeGoal.context}</strong></span>
            <span>Wholesale Rate: <strong className="text-emerald-400">{activeGoal.pricing}</strong></span>
          </div>
        </div>

        <div className="flex sm:flex-col items-center gap-2 shrink-0 w-full sm:w-auto">
          <Link
            href="/keys"
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Get Free API Key</span>
          </Link>

          <Link
            href={`/models/${activeGoal.recommendedModelId.replace('/', '-')}`}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-center whitespace-nowrap"
          >
            <span>View Full Specs</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export const ModelMatchmaker = withErrorBoundary(BaseModelMatchmaker, {
  name: 'Model Matchmaker'
});
