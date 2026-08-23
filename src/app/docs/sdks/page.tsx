'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  Code2,
  Layers,
  Zap,
  Terminal,
  Copy,
  Check,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Flame,
  Bot
} from 'lucide-react';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';

export default function SdksDocPage() {
  const [activeTab, setActiveTab] = useState<'cli' | 'galx_sdk' | 'python' | 'ts' | 'vercel' | 'langchain' | 'llamaindex' | 'rust' | 'go' | 'curl'>('cli');
  const [copiedKey, setCopiedKey] = useState(false);

  const sdkTabs = [
    { id: 'cli', label: '⚡ npx CLI (Zero Install)' },
    { id: 'galx_sdk', label: '🌌 @galxai/sdk (Native)' },
    { id: 'python', label: '🐍 Python (openai>=1.0.0)' },
    { id: 'ts', label: '▲ TypeScript / Node' },
    { id: 'vercel', label: '⚡ Vercel AI SDK' },
    { id: 'langchain', label: '🦜🔗 LangChain' },
    { id: 'llamaindex', label: '🦙 LlamaIndex' },
    { id: 'rust', label: '🦀 Rust (async-openai)' },
    { id: 'go', label: '🐹 Go' },
    { id: 'curl', label: '💻 cURL / REST' }
  ] as const;

  const recipes = {
    cli: {
      pkg: 'No package installation required (Node.js 18+)',
      code: `# 1. Execute streaming completion instantly in any terminal:
npx galxai "Explain continuous token caching in 10 words"

# 2. Or start an interactive chat session:
npx galxai chat --model gpt-5.6-sol`
    },
    galx_sdk: {
      pkg: 'npm install @galxai/sdk',
      code: `import { GalxAI } from "@galxai/sdk";

// Initialize native GALXAI client with auto-failover & token tracking
const galx = new GalxAI({
  apiKey: process.env.GALX_API_KEY || "galx_live_your_key",
});

const stream = await galx.chat.completions.create({
  model: "gpt-5.6-sol",
  messages: [{ role: "user", content: "Optimize this PostgreSQL query." }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}`
    },
    python: {
      pkg: 'pip install openai',
      code: `from openai import OpenAI

# 1-Line Drop-in replacement for OpenAI SDK
client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Stream responses with sub-15ms TTFT & 75% prompt caching
response = client.chat.completions.create(
    model="gpt-5.6-sol",  # or "x-ai/grok-4.6"
    messages=[{"role": "user", "content": "Refactor this async pipeline in Python."}],
    stream=True
)

for chunk in response:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)`
    },
    ts: {
      pkg: 'npm install openai',
      code: `import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY || "galx_live_your_gateway_key",
});

const stream = await openai.chat.completions.create({
  model: "gpt-5.6-sol",
  messages: [{ role: "user", content: "Optimize this TypeScript type definition." }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}`
    },
    vercel: {
      pkg: 'npm install ai @ai-sdk/openai',
      code: `import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

// Configure custom baseURL for @ai-sdk/openai
const galxai = openai({
  baseURL: "https://api.galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: galxai("gpt-5.6-sol"),
    messages,
  });

  return result.toDataStreamResponse();
}`
    },
    langchain: {
      pkg: 'pip install langchain-openai',
      code: `from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-5.6-sol",
    openai_api_base="https://api.galx.ai/v1",
    openai_api_key="galx_live_your_gateway_key",
    temperature=0.2
)

response = llm.invoke("Design a fault-tolerant microservice event bus.")
print(response.content)`
    },
    llamaindex: {
      pkg: 'pip install llama-index-llms-openai',
      code: `from llama_index.llms.openai import OpenAI
from llama_index.core import Settings

Settings.llm = OpenAI(
    model="gpt-5.6-sol",
    api_base="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

response = Settings.llm.complete("Explain multi-head latent attention.")
print(response)`
    },
    rust: {
      pkg: 'cargo add async-openai tokio',
      code: `use async_openai::{
    config::OpenAIConfig,
    types::{CreateChatCompletionRequestArgs, ChatCompletionRequestUserMessageArgs},
    Client,
};
use futures::StreamExt;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = OpenAIConfig::new()
        .with_api_base("https://api.galx.ai/v1")
        .with_api_key("galx_live_your_gateway_key");

    let client = Client::with_config(config);

    let request = CreateChatCompletionRequestArgs::default()
        .model("gpt-5.6-sol")
        .messages([ChatCompletionRequestUserMessageArgs::default()
            .content("Write a lock-free ring buffer in Rust.")
            .build()?
            .into()])
        .stream(true)
        .build()?;

    let mut stream = client.chat().create_stream(request).await?;

    while let Some(result) = stream.next().await {
        match result {
            Ok(response) => {
                for choice in response.choices {
                    if let Some(content) = choice.delta.content {
                        print!("{}", content);
                    }
                }
            }
            Err(err) => eprintln!("Error: {err}"),
        }
    }

    Ok(())
}`
    },
    go: {
      pkg: 'go get github.com/sashabaranov/go-openai',
      code: `package main

import (
	"context"
	"fmt"
	"github.com/sashabaranov/go-openai"
)

func main() {
	config := openai.DefaultConfig("galx_live_your_gateway_key")
	config.BaseURL = "https://api.galx.ai/v1"

	client := openai.NewClientWithConfig(config)
	resp, err := client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: "gpt-5.6-sol",
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleUser,
					Content: "Explain Raft consensus protocol in 3 bullets.",
				},
			},
		},
	)

	if err != nil {
		fmt.Printf("Error: %v\\n", err)
		return
	}

	fmt.Println(resp.Choices[0].Message.Content)
}`
    },
    curl: {
      pkg: 'Native cURL / Any HTTP Client',
      code: `curl -X POST https://api.galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer galx_live_your_gateway_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [
      {
        "role": "user",
        "content": "Hello GALXAI Gateway!"
      }
    ],
    "stream": true
  }'`
    }
  };

  const handleCopy = async (text: string) => {
    await safeCopyToClipboard(text);
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
            { label: 'SDK Integration (8 Frameworks)' }
          ]}
        />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <Code2 className="w-3.5 h-3.5" />
              <span>OFFICIAL 8-FRAMEWORK SDK GUIDE</span>
            </div>
            <Link
              href="/keys/new"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase font-mono tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Mint Key ($5 Credit)</span>
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">SDKs &amp; Client Libraries</h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-3xl font-sans">
            GALXAI is 100% compliant with standard OpenAI client protocols. Zero custom dependencies needed—simply set your <code className="text-cyan-300 font-mono">baseURL</code> to <code className="text-amber-300 font-mono">https://api.galx.ai/v1</code>.
          </p>
        </div>

        <DocsSubNav />

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* Tabbed Framework Switcher */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4 font-mono text-xs">
            {sdkTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
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
                <span>{copiedKey ? 'Copied Code!' : 'Copy Code'}</span>
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
      </main>

      {/* Floating Conversion Dock, Live Activity Toast & Exit Intent Modal */}
      <FloatingConversionDock />
      <LiveActivityToast />
      <ExitIntentModal />
    </div>
  );
}
