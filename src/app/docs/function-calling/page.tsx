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
  Cpu
} from 'lucide-react';

export default function FunctionCallingDocsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const pythonSnippet = `from openai import OpenAI
import json

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# 1. Define Tools Schema
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_stock_price",
            "description": "Fetch the real-time stock price for a given ticker symbol.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": { "type": "string", "description": "e.g. AAPL, NVDA, TSLA" }
                },
                "required": ["ticker"]
            }
        }
    }
]

# 2. Call Model with Tools
messages = [{"role": "user", "content": "What is the stock price of NVDA and AAPL right now?"}]

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=messages,
    tools=tools,
    tool_choice="auto"
)

response_message = response.choices[0].message
tool_calls = response_message.tool_calls

# 3. Execute Tool & Append Result
if tool_calls:
    messages.append(response_message) # extend conversation history
    for tool_call in tool_calls:
        function_name = tool_call.function.name
        function_args = json.loads(tool_call.function.arguments)
        
        # Mock execution
        price = 142.50 if "NVDA" in function_args.get("ticker", "") else 225.00
        
        messages.append({
            "tool_call_id": tool_call.id,
            "role": "tool",
            "name": function_name,
            "content": json.dumps({"ticker": function_args["ticker"], "price": price})
        })

    # 4. Final Model Completion with Tool Results
    final_response = client.chat.completions.create(
        model="gpt-5.6-sol",
        messages=messages
    )
    print("Final Agent Response:\\n", final_response.choices[0].message.content)`;

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Function Calling & Agentic Tools Guide</h1>
            <p className="text-xs text-zinc-400">
              Connect external databases, APIs, and custom code execution sandboxes with parallel tool calling.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              <span>PARALLEL TOOL CALLING READY</span>
            </span>
          </div>
        </div>

        <DocsSubNav />

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

        {/* Python Parallel Tool Calling Snippet */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Code2 className="w-4 h-4 text-amber-400" />
              End-to-End Multi-Turn Tool Execution Loop (Python)
            </h2>
            <button
              onClick={() => handleCopy(pythonSnippet, 'python')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5"
            >
              {copiedSection === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'python' ? 'Copied Loop' : 'Copy Full Snippet'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-cyan-300 border border-white/5 overflow-x-auto">
            <code>{pythonSnippet}</code>
          </pre>
        </div>

        <DocsFeedback docTitle="Function Calling & Agentic Tools Guide" />
      </main>
    </div>
  );
}
