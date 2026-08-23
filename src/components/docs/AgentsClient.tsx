'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { DocsFeedback } from '@/components/dashboard/DocsFeedback';
import {
  Bot,
  Zap,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';

export function AgentsClient() {
  const [activeTab, setActiveTab] = useState<'crewai' | 'langgraph' | 'autogen' | 'vercel'>('crewai');
  const [copiedKey, setCopiedKey] = useState(false);

  const recipes = {
    crewai: {
      framework: 'CrewAI (Python)',
      pkg: 'pip install crewai',
      code: `from crewai import Agent, Task, Crew, Process, LLM

# Configure GALXAI Gateway as drop-in LLM for CrewAI
galx_llm = LLM(
    model="gpt-5.6-sol",
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key",
    temperature=0.2
)

# 1. Define Autonomous Researcher Agent
researcher = Agent(
    role="Frontier AI Architect",
    goal="Analyze sub-15ms gateway latency benchmarks",
    backstory="You are an expert infrastructure researcher specializing in high-throughput LLM routing.",
    llm=galx_llm,
    verbose=True
)

# 2. Define Autonomous Task
task = Task(
    description="Summarize key architectural advantages of automated prefix KV-caching in 3 points.",
    expected_output="A concise 3-bullet technical brief.",
    agent=researcher
)

# 3. Kickoff Autonomous Swarm
crew = Crew(agents=[researcher], tasks=[task], process=Process.sequential)
result = crew.kickoff()
print(result)`,
    },
    langgraph: {
      framework: 'LangGraph & LangChain Agents (Python)',
      pkg: 'pip install langgraph langchain-openai',
      code: `from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool

@tool
def calculate_cache_savings(input_tokens: int, requests: int) -> float:
    """Calculate 75% prompt cache savings in dollars."""
    uncached = (input_tokens * requests * 1.875) / 1000000
    cached = (input_tokens * requests * 0.46875) / 1000000
    return uncached - cached

# Initialize LangChain LLM connected to GALXAI
llm = ChatOpenAI(
    model="gpt-5.6-sol",
    openai_api_base="https://api.galx.ai/v1",
    openai_api_key="galx_live_your_gateway_key"
)

# Build Autonomous ReAct Agent Graph
agent = create_react_agent(llm, tools=[calculate_cache_savings])
response = agent.invoke({"messages": [("user", "How much do we save with 10k tokens over 50k requests?")]})
print(response["messages"][-1].content)`,
    },
    autogen: {
      framework: 'Microsoft AutoGen (Python)',
      pkg: 'pip install autogen-agentchat autogen-ext',
      code: `import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

async def main():
    # Connect AutoGen client to GALXAI Gateway
    model_client = OpenAIChatCompletionClient(
        model="gpt-5.6-sol",
        base_url="https://api.galx.ai/v1",
        api_key="galx_live_your_gateway_key"
    )

    agent = AssistantAgent(
        name="SecurityAuditor",
        model_client=model_client,
        system_message="You are a strict Zero-Data-Retention security auditor."
    )

    result = await agent.run(task="Verify if encrypted payloads are zeroized in RAM.")
    print(result.messages[-1].content)

asyncio.run(main())`,
    },
    vercel: {
      framework: 'Next.js & Vercel AI SDK Swarms (TypeScript)',
      pkg: 'npm install ai @ai-sdk/openai zod',
      code: `import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { z } from "zod";

const galxai = openai({
  baseURL: "https://api.galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

// Autonomous Multi-Step Swarm Execution with maxSteps
export async function runAgentWorkflow(task: string) {
  const result = await generateText({
    model: galxai("gpt-5.6-sol"),
    maxSteps: 10,
    tools: {
      fetchOrder: tool({
        description: "Fetch order details",
        parameters: z.object({ orderId: z.string() }),
        execute: async ({ orderId }) => ({ id: orderId, status: "delivered" }),
      }),
    },
    prompt: task,
  });

  return result.text;
}`,
    },
  };

  const handleCopy = async (code: string) => {
    await safeCopyToClipboard(code);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'AI Agents & Autonomous Swarms' },
          ]}
        />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
              <Bot className="w-3.5 h-3.5" />
              <span>AGENT SWARM OPTIMIZED INFRASTRUCTURE</span>
            </div>
            <Link
              href="/keys/new"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase font-mono tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Claim Key ($5 Credit)</span>
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">AI Agents &amp; Autonomous Swarms Hub</h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-3xl font-sans">
            High-concurrency infrastructure engineered specifically for agent swarms, parallel tool-calling loops, and multi-agent reasoning graphs with sub-15ms failover.
          </p>
        </div>

        <DocsSubNav />

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* Core Agent Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-indigo-500/30 bg-indigo-500/5">
            <span className="text-indigo-400 text-[10px] uppercase font-sans font-semibold">Failover Speed</span>
            <div className="text-2xl font-black text-indigo-300">&lt; 15 ms Failover</div>
            <div className="text-[11px] text-indigo-400 font-sans">Zero agent crashes on upstream outages</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-emerald-500/30 bg-emerald-500/5">
            <span className="text-emerald-400 text-[10px] uppercase font-sans font-semibold">Agent Tool Caching</span>
            <div className="text-2xl font-black text-emerald-300">75% Prefix Cache</div>
            <div className="text-[11px] text-emerald-400 font-sans">Massive savings on repetitive agent tools</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-cyan-500/30 bg-cyan-500/5">
            <span className="text-cyan-400 text-[10px] uppercase font-sans font-semibold">Concurrency Ceiling</span>
            <div className="text-2xl font-black text-cyan-300">1,200 RPM</div>
            <div className="text-[11px] text-cyan-400 font-sans">Smooth multi-worker parallel execution</div>
          </div>
        </div>

        {/* Tabbed Agent Framework Workbench */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4 font-mono text-xs">
            {(['crewai', 'langgraph', 'autogen', 'vercel'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl font-bold uppercase transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab === 'crewai' ? '🤖 CrewAI' : tab === 'langgraph' ? '🦜🔗 LangGraph' : tab === 'autogen' ? '⚡ AutoGen' : '▲ Vercel AI SDK'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono text-xs text-zinc-300">
                <span className="text-zinc-500 uppercase font-bold text-[10px]">Install:</span>
                <code className="px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 text-emerald-400">
                  {recipes[activeTab].pkg}
                </code>
              </div>

              <button
                onClick={() => handleCopy(recipes[activeTab].code)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all text-xs cursor-pointer font-sans self-start sm:self-auto"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? 'Copied Recipe!' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="relative rounded-2xl bg-black/80 border border-white/10 p-5 font-mono text-xs overflow-hidden">
              <pre className="text-amber-300 overflow-x-auto leading-relaxed">
                {recipes[activeTab].code}
              </pre>
            </div>
          </div>
        </div>

        {/* Why GALXAI for Agents? */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Why Autonomous Agents Need Specialized Gateway Routing
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs text-zinc-300">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="text-white font-bold text-sm">1. Avoiding 429 Rate Limit Death Spirals</div>
              <p className="text-zinc-400 leading-relaxed">
                When 10 sub-agents spawn in parallel, standard API accounts instantly hit 429 rate limit ceilings. GALXAI&apos;s continuous token calculus smoothly distributes concurrency with zero artificial minute-boundary throttling.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="text-white font-bold text-sm">2. Sub-15ms Dynamic Route Switching</div>
              <p className="text-zinc-400 leading-relaxed">
                If an upstream provider experiences transient packet loss during a multi-step agent workflow, GALXAI dynamically switches channels in under 15ms so your agent never crashes mid-turn.
              </p>
            </div>
          </div>
        </div>

        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />

        <DocsFeedback docTitle="AI Agents &amp; Autonomous Swarms Hub" />
      </main>

      {/* Floating Conversion Dock, Live Activity Toast & Exit Intent Modal */}
      <FloatingConversionDock />
      <LiveActivityToast />
      <ExitIntentModal />
    </div>
  );
}
