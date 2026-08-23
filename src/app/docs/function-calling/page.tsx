'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { DocsFeedback } from '@/components/dashboard/DocsFeedback';
import {
  Wrench,
  Code2,
  Copy,
  Check,
  CheckCircle2,
  Zap,
  Terminal,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Bot,
  Layers,
  Sparkles
} from 'lucide-react';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';

export default function FunctionCallingDocsPage() {
  const [activeTab, setActiveTab] = useState<'python' | 'ts' | 'vercel' | 'langchain'>('python');
  const [copiedKey, setCopiedKey] = useState(false);

  const recipes = {
    python: {
      title: 'Python (Native Multi-Turn Parallel Tool Loop)',
      code: `from openai import OpenAI
import json

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# 1. Define Tools Schema (Cached with 75% rebate)
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_stock_price",
            "description": "Fetch real-time stock price for a ticker symbol.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": { "type": "string", "description": "e.g. AAPL, NVDA" }
                },
                "required": ["ticker"]
            }
        }
    }
]

messages = [{"role": "user", "content": "What are current prices for NVDA and AAPL?"}]

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=messages,
    tools=tools,
    tool_choice="auto"
)

tool_calls = response.choices[0].message.tool_calls

if tool_calls:
    messages.append(response.choices[0].message)
    for tool_call in tool_calls:
        args = json.loads(tool_call.function.arguments)
        price = 142.50 if "NVDA" in args.get("ticker", "") else 225.00
        messages.append({
            "tool_call_id": tool_call.id,
            "role": "tool",
            "name": tool_call.function.name,
            "content": json.dumps({"ticker": args["ticker"], "price": price})
        })

    final = client.chat.completions.create(
        model="gpt-5.6-sol",
        messages=messages
    )
    print("Final Agent Response:\\n", final.choices[0].message.content)`
    },
    ts: {
      title: 'TypeScript / Node.js Parallel Tool Execution',
      code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY || "galx_live_your_gateway_key",
});

const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "fetch_customer_order",
      description: "Look up order history by customer ID",
      parameters: {
        type: "object",
        properties: { customerId: { type: "string" } },
        required: ["customerId"],
      },
    },
  },
];

const messages: OpenAI.ChatCompletionMessageParam[] = [
  { role: "user", content: "Check order status for customer #9921." }
];

const runner = await client.beta.chat.completions.runTools({
  model: "gpt-5.6-sol",
  messages,
  tools: [
    {
      type: "function",
      function: {
        name: "fetch_customer_order",
        function: async ({ customerId }: { customerId: string }) => {
          return { status: "shipped", tracking: "1Z9999999999999999" };
        },
        parse: JSON.parse,
        parameters: {
          type: "object",
          properties: { customerId: { type: "string" } },
          required: ["customerId"],
        },
      },
    },
  ],
});

const finalMessage = await runner.finalContent();
console.log(finalMessage);`
    },
    vercel: {
      title: 'Next.js & Vercel AI SDK (maxSteps Multi-Turn Agent)',
      code: `import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { z } from "zod";

const galxai = openai({
  baseURL: "https://api.galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const { text, steps } = await generateText({
    model: galxai("gpt-5.6-sol"),
    maxSteps: 5,
    tools: {
      weather: tool({
        description: "Get weather for a location",
        parameters: z.object({ city: z.string() }),
        execute: async ({ city }) => ({ temp: 72, condition: "Sunny", city }),
      }),
    },
    prompt,
  });

  return Response.json({ text, toolCallsCount: steps.length });
}`
    },
    langchain: {
      title: 'LangChain (bind_tools Agent)',
      code: `from langchain_openai import ChatOpenAI
from langchain_core.tools import tool

@tool
def multiply(a: int, b: int) -> int:
    """Multiply two integers together."""
    return a * b

llm = ChatOpenAI(
    model="gpt-5.6-sol",
    openai_api_base="https://api.galx.ai/v1",
    openai_api_key="galx_live_your_gateway_key"
)

llm_with_tools = llm.bind_tools([multiply])
response = llm_with_tools.invoke("What is 482 multiplied by 193?")
print(response.tool_calls)`
    }
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
            { label: 'API & Cookbooks', href: '/docs/api-reference' },
            { label: 'Function Calling & Tools' }
          ]}
        />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              <Wrench className="w-3.5 h-3.5" />
              <span>PARALLEL TOOL CALLING READY</span>
            </div>
            <Link
              href="/keys/new"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase font-mono tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Claim Key ($5 Credit)</span>
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Function Calling &amp; Agentic Tools Guide</h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-3xl font-sans">
            Connect external databases, REST APIs, and custom code execution sandboxes with parallel tool calling, 75% tool schema prompt caching, and zero latency overhead.
          </p>
        </div>

        <DocsSubNav />

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-emerald-500/30 bg-emerald-500/5">
            <span className="text-emerald-400 text-[10px] uppercase font-sans font-semibold">Tool Execution Speed</span>
            <div className="text-2xl font-black text-emerald-300">Parallel Calls</div>
            <div className="text-[11px] text-emerald-400 font-sans">Multi-tool batching in 1 generation turn</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-cyan-500/30 bg-cyan-500/5">
            <span className="text-cyan-400 text-[10px] uppercase font-sans font-semibold">Protocol Adherence</span>
            <div className="text-2xl font-black text-cyan-300">OpenAI Standard</div>
            <div className="text-[11px] text-cyan-400 font-sans">Zero schema translation needed</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-white/10">
            <span className="text-zinc-500 text-[10px] uppercase font-sans">Prompt Caching</span>
            <div className="text-2xl font-black text-white">75% Tool Discount</div>
            <div className="text-[11px] text-zinc-400 font-sans">Static tool schemas cached automatically</div>
          </div>
        </div>

        {/* Multi-Language Tool Recipes */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4 font-mono text-xs">
            {(['python', 'ts', 'vercel', 'langchain'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl font-bold uppercase transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab === 'python' ? '🐍 Python' : tab === 'ts' ? '▲ TypeScript / Node' : tab === 'vercel' ? '⚡ Vercel AI SDK' : '🦜🔗 LangChain'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span>{recipes[activeTab].title}</span>
              </h2>

              <button
                onClick={() => handleCopy(recipes[activeTab].code)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all text-xs cursor-pointer font-sans"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? 'Copied Recipe!' : 'Copy Recipe'}</span>
              </button>
            </div>

            <div className="relative rounded-2xl bg-black/80 border border-white/10 p-5 font-mono text-xs overflow-hidden">
              <pre className="text-amber-300 overflow-x-auto leading-relaxed">
                {recipes[activeTab].code}
              </pre>
            </div>
          </div>
        </div>

        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />

        <DocsFeedback docTitle="Function Calling & Agentic Tools Guide" />
      </main>

      {/* Floating Conversion Dock, Live Activity Toast & Exit Intent Modal */}
      <FloatingConversionDock />
      <LiveActivityToast />
      <ExitIntentModal />
    </div>
  );
}
