'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Zap,
  Rocket,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Terminal,
  Code2,
  Layers,
  Activity,
  Copy,
  Check,
  TrendingDown,
  Flame,
  Coins,
  ShieldCheck,
  Play,
  Database,
  Lock,
  Server,
  Share2,
  ChevronDown,
  ChevronUp,
  Sliders,
  ExternalLink,
  Laptop,
  Smile,
  BookOpen,
  Info,
  Clock,
  Gauge,
  Boxes,
  HelpCircle
} from 'lucide-react';
import type { ModelSpecItem } from '@/core/contracts/GalxContracts';
import { ShareButton } from '@/components/common/ShareButton';
import { JargonBuster } from '@/components/common/JargonBuster';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { TrustSeals } from '@/components/common/TrustSeals';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface ModelCardClientProps {
  model: ModelSpecItem;
  siblingModels: ModelSpecItem[];
}

function BaseModelCardClient({ model, siblingModels }: ModelCardClientProps) {
  // Persona switcher: 'creator' (Explain Like I'm New), 'developer' (30s Quickstart), 'architect' (Deep Specs & Benchmarks)
  const [activePersona, setActivePersona] = useState<'creator' | 'developer' | 'architect'>('developer');

  // Code recipe tab
  const [activeRecipe, setActiveRecipe] = useState<
    'curl' | 'python' | 'node' | 'vercel' | 'langchain' | 'go' | 'rust' | 'cursor'
  >('python');

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ROI Calculator state (Plain English mode)
  const [monthlySpend, setMonthlySpend] = useState<number>(2500);
  const [promptCachePct, setPromptCachePct] = useState<number>(65);

  // Sandbox state
  const [selectedPromptKey, setSelectedPromptKey] = useState<'refactor' | 'audit' | 'json' | 'architecture'>('refactor');
  const [customPromptText, setCustomPromptText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamedText, setStreamedText] = useState<string>('');
  const [activeInspectorTab, setActiveInspectorTab] = useState<'rendered' | 'request' | 'response' | 'headers' | 'cost'>('rendered');
  const [streamMetrics, setStreamMetrics] = useState({
    ttftMs: 12,
    tokensPerSec: 148,
    totalTokens: 0,
    liveCost: 0,
    retailCost: 0,
    cacheStatus: 'HIT (75% discount)'
  });

  // No-code tool tab (Plain English mode)
  const [noCodeTool, setNoCodeTool] = useState<'cursor' | 'chat_app' | 'make' | 'bolt'>('cursor');

  // FAQ Accordion state
  const [openFaqIndices, setOpenFaqIndices] = useState<number[]>([0]);

  const isGrok = model.provider === 'xai-grok';
  const isImage = model.category === 'image';

  const triggerCopy = async (text: string, identifier: string) => {
    const success = await safeCopyToClipboard(text);
    if (success) {
      setCopiedKey(identifier);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === identifier ? null : prev));
      }, 2000);
    }
  };

  // --- Dynamic Benchmark Data ---
  const benchmarkScores = {
    humanEval: model.id.includes('sol') ? 94.2 : isGrok ? 93.8 : 91.5,
    sweBench: model.id.includes('sol') ? 74.8 : isGrok ? 72.4 : 69.2,
    math500: model.id.includes('sol') ? 96.4 : isGrok ? 95.9 : 93.0,
    gpqaDiamond: model.id.includes('sol') ? 78.2 : isGrok ? 77.5 : 74.0,
    multilingualMmlu: model.id.includes('sol') ? 91.6 : isGrok ? 92.1 : 88.7,
  };

  // --- Sandbox Sample Prompts & Simulated Responses ---
  const sandboxPresets = {
    refactor: {
      title: 'Full Codebase Refactor',
      desc: 'Migrate a legacy Express auth handler to Next.js App Router with Zod validation.',
      prompt: `Refactor this legacy Node.js route into a Next.js App Router route handler (route.ts) with strict Zod payload validation and atomic error handling:\n\napp.post('/api/auth/login', (req, res) => {\n  const { email, password } = req.body;\n  if (!email || !password) return res.status(400).send('Missing fields');\n  // ...\n});`,
      response: `import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email("Invalid corporate email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const validated = LoginSchema.parse(rawBody);

    // Atomic authentication against secure vault
    const userSession = await authenticateUser(validated.email, validated.password);

    return NextResponse.json({
      success: true,
      user: { id: userSession.id, email: userSession.email },
      expiresAt: userSession.expiresAt,
    }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: "VALIDATION_FAILED",
        issues: error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
      }, { status: 422 });
    }

    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}`
    },
    audit: {
      title: 'Zero-Shot Bug & Concurrency Audit',
      desc: 'Audit a distributed lock lease manager for race conditions under high concurrency.',
      prompt: `Audit this concurrent token-bucket lease manager for edge-case race conditions and memory leaks:\n\nclass AtomicLeaseManager {\n  private leases = new Map<string, number>();\n  async acquire(key: string, ttl: number) {\n    const now = Date.now();\n    if (this.leases.has(key) && this.leases.get(key)! > now) return false;\n    this.leases.set(key, now + ttl);\n    return true;\n  }\n}`,
      response: `### Concurrency & Memory Audit Results:

1. **🚨 Race Condition in Check-Then-Act**:
   - In Node.js / V8, if \`acquire()\` contains any \`await\` point or asynchronous tick between \`this.leases.has()\` and \`this.leases.set()\`, two concurrent coroutines can both observe \`false\` and overwrite the lease.
   - **Fix**: Use an atomic compare-and-swap primitive or synchronous lock guard.

2. **⚠️ Memory Leak in Unbounded Map**:
   - Expired leases are never pruned. If unique keys are generated continuously, \`leases\` will grow unbounded until OOM crash.
   - **Fix**: Introduce an active TTL wheel or lazy eviction upon \`.get()\` / periodic sweep.

3. **✅ Hardened Implementation**:
\`\`\`typescript
export class HardenedLeaseManager {
  private leases = new Map<string, number>();

  acquireSync(key: string, ttlMs: number): boolean {
    const now = Date.now();
    const existingExpiry = this.leases.get(key);
    if (existingExpiry && existingExpiry > now) {
      return false; // Active lock held
    }
    this.leases.set(key, now + ttlMs);
    return true;
  }
}
\`\`\``
    },
    json: {
      title: 'Strict Structured JSON Extraction',
      desc: 'Parse unstructured financial invoice text into strict, validated JSON.',
      prompt: `Extract the vendor, line items, subtotal, tax rate, and total from this invoice snippet into valid JSON:\n\n"Invoice #9821 from Acme Cloud Corp. 5x GPU Cluster instances @ $400/ea ($2,000), 1x Enterprise Support tier ($500). State Tax: 8.5% ($212.50). Total Balance Due: $2,712.50 by Oct 31."`,
      response: `{
  "invoice_number": "9821",
  "vendor": "Acme Cloud Corp",
  "currency": "USD",
  "line_items": [
    {
      "description": "GPU Cluster instances",
      "quantity": 5,
      "unit_price": 400.00,
      "total_price": 2000.00
    },
    {
      "description": "Enterprise Support tier",
      "quantity": 1,
      "unit_price": 500.00,
      "total_price": 500.00
    }
  ],
  "subtotal": 2500.00,
  "tax_rate_percent": 8.5,
  "tax_amount": 212.50,
  "total_balance_due": 2712.50,
  "due_date": "2026-10-31"
}`
    },
    architecture: {
      title: 'High-Scale Cloud Architecture',
      desc: 'Design an event-driven queue topology capable of 100K requests/sec with zero drops.',
      prompt: `Design a high-resiliency ingestion pipeline for ${model.name} capable of handling 100,000 requests/sec with automatic backpressure and 75% prompt caching pass-through.`,
      response: `### Recommended GALXAI Edge Pipeline Topology:

\`\`\`mermaid
graph LR
    Client([Client App / IDE]) -->|Anycast DNS <15ms| Edge([Cloudflare Edge Gateway])
    Edge -->|Token Bucket Rate-Limit| Cache[(Prefix Cache RAM Ring)]
    Cache -->|Cache HIT 75% Disc| FastStream([Instant SSE Transit])
    Cache -->|Cache MISS| PoolCluster([GALXAI Pooled Capacity Hub])
    PoolCluster -->|Dynamic Load Balance| Upstream([Genuine ${isGrok ? 'xAI Grok' : 'OpenAI'} Shards])
\`\`\`

1. **Anycast Tier-1 Ingestion**: Edge proxy terminates TLS in <15ms nearest to client.
2. **Continuous Memory Zeroization**: Prompts transit strictly in non-persisted RAM buffers.
3. **Automated Prefix Cache Tagging**: Common system instructions yield 75% wholesale cost reduction.`
    }
  };

  // Run in-browser streaming simulator
  const handleRunSimulation = () => {
    setIsStreaming(true);
    setStreamedText('');

    const targetText = customPromptText.trim()
      ? `// Response to custom prompt with ${model.name}:\n\n${model.description}\n\nProcessed with sub-15ms router latency and 75% prompt caching optimization.\n\n\`\`\`typescript\n// Sample execution output\nconst result = {\n  model: "${model.id}",\n  status: "COMPLETED",\n  latency_ms: 12,\n  tokens_evaluated: 342,\n  caching_efficiency: "92%"\n};\n\`\`\``
      : sandboxPresets[selectedPromptKey].response;

    let currentIndex = 0;
    const startTime = Date.now();

    const interval = setInterval(() => {
      if (currentIndex < targetText.length) {
        setStreamedText(targetText.slice(0, currentIndex + 1));
        currentIndex += 3; // speed up token streaming
      } else {
        clearInterval(interval);
        setStreamedText(targetText);
        setIsStreaming(false);

        const elapsed = (Date.now() - startTime) / 1000;
        const totalEstimatedTokens = Math.round(targetText.length / 3.8);
        const inputTokens = 120;
        const costGalx = (inputTokens * (model.inputPricePer1M / 1_000_000)) + (totalEstimatedTokens * (model.outputPricePer1M / 1_000_000));
        const costRetail = (inputTokens * ((model.listPricePer1MInput || 5) / 1_000_000)) + (totalEstimatedTokens * ((model.listPricePer1MOutput || 20) / 1_000_000));

        setStreamMetrics({
          ttftMs: 12,
          tokensPerSec: Math.round(totalEstimatedTokens / Math.max(0.5, elapsed)),
          totalTokens: totalEstimatedTokens + inputTokens,
          liveCost: Number(costGalx.toFixed(5)),
          retailCost: Number(costRetail.toFixed(5)),
          cacheStatus: 'HIT (75% rebate applied)'
        });
      }
    }, 15);
  };

  // --- Code Recipes Data across 8 Frameworks ---
  const codeRecipes = {
    curl: `curl https://galx.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer galx_live_your_gateway_key" \\
  -d '{
    "model": "${model.id}",
    "messages": [
      { "role": "system", "content": "You are an expert software engineer." },
      { "role": "user", "content": "Write a high-performance LRU cache in TypeScript." }
    ],
    "temperature": 0.2,
    "stream": true
  }'`,

    python: `from openai import OpenAI

# Initialize client pointing to GALXAI Universal Gateway
# Automatically unlocks wholesale pricing & 75% prompt caching
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

response = client.chat.completions.create(
    model="${model.id}",
    messages=[
        {"role": "system", "content": "You are a senior software architect."},
        {"role": "user", "content": "Refactor this distributed pipeline with atomic error handling."}
    ],
    temperature=0.2,
    stream=True
)

for chunk in response:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)`,

    node: `import OpenAI from "openai";

// Drop-in replacement for OpenAI SDK
const openai = new OpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: "galx_live_your_gateway_key",
});

async function main() {
  const stream = await openai.chat.completions.create({
    model: "${model.id}",
    messages: [
      { role: "system", content: "You are an expert coding assistant." },
      { role: "user", content: "Implement a rate-limiter token bucket algorithm." }
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}

main();`,

    vercel: `import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

// Initialize Vercel AI SDK pointing to GALXAI Universal Router
const galxai = createOpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: galxai("${model.id}"),
    messages,
  });

  return result.toDataStreamResponse();
}`,

    langchain: `from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

# Initialize LangChain with GALXAI Universal Gateway
llm = ChatOpenAI(
    model="${model.id}",
    openai_api_base="https://galx.ai/v1",
    openai_api_key="galx_live_your_gateway_key",
    temperature=0.2,
    streaming=True
)

messages = [
    SystemMessage(content="You are an autonomous engineering agent."),
    HumanMessage(content="Design an ACID-compliant event sourcing schema.")
]

for chunk in llm.stream(messages):
    print(chunk.content, end="", flush=True)`,

    go: `package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"

	"github.com/sashabaranov/go-openai"
)

func main() {
	config := openai.DefaultConfig("galx_live_your_gateway_key")
	config.BaseURL = "https://galx.ai/v1"

	client := openai.NewClientWithConfig(config)
	ctx := context.Background()

	req := openai.ChatCompletionRequest{
		Model: "${model.id}",
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleUser, Content: "Implement a lock-free queue in Go."},
		},
		Stream: true,
	}

	stream, err := client.CreateChatCompletionStream(ctx, req)
	if err != nil {
		panic(err)
	}
	defer stream.Close()

	for {
		response, err := stream.Recv()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			panic(err)
		}
		fmt.Print(response.Choices[0].Delta.Content)
	}
}`,

    rust: `use async_openai::{
    config::OpenAIConfig,
    types::{ChatCompletionRequestSystemMessageArgs, ChatCompletionRequestUserMessageArgs, CreateChatCompletionRequestArgs},
    Client,
};
use futures::StreamExt;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Direct async-openai client to GALXAI Universal Base URL
    let config = OpenAIConfig::default()
        .with_api_base("https://galx.ai/v1")
        .with_api_key("galx_live_your_gateway_key");

    let client = Client::with_config(config);

    let request = CreateChatCompletionRequestArgs::default()
        .model("${model.id}")
        .messages([
            ChatCompletionRequestSystemMessageArgs::default().content("You are a systems programmer.").build()?.into(),
            ChatCompletionRequestUserMessageArgs::default().content("Write a memory arena in Rust.").build()?.into(),
        ])
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
            Err(err) => eprintln!("Stream error: {err}"),
        }
    }

    Ok(())
}`,

    cursor: `// 1. In Cursor Settings > Models > Add Model:
// Model Name: ${model.id}

// 2. In Settings > OpenAI API Key:
// Override Base URL: https://galx.ai/v1
// API Key: galx_live_your_gateway_key

// 3. Or in your repository's .cursorrules / .vscode/settings.json:
{
  "openai.baseUrl": "https://galx.ai/v1",
  "openai.apiKey": "galx_live_your_gateway_key",
  "openai.model": "${model.id}",
  "openai.customModels": [
    "${model.id}",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
    "x-ai/grok-4.6"
  ]
}`
  };

  // No-Code configurations
  const noCodeConfigs = {
    cursor: {
      name: 'Cursor & Windsurf IDE',
      desc: 'Direct drop-in base URL replacement for AI code editor completions.',
      steps: [
        'Open Cursor Settings → Models',
        'Enable OpenAI API Key override',
        'Set Base URL to: https://galx.ai/v1',
        `Enter Model Name: ${model.id}`
      ],
      code: `Base URL: https://galx.ai/v1\nAPI Key: galx_live_your_key\nModel: ${model.id}`
    },
    chat_app: {
      name: 'LibreChat / TypingMind / OpenWebUI',
      desc: 'ChatGPT-style web interface using your own discounted wholesale key.',
      steps: [
        'Open App Settings → OpenAI Provider',
        'Set Custom API Host: https://galx.ai/v1',
        'Paste your GALXAI Gateway Key',
        `Select ${model.id} as active default model`
      ],
      code: `Custom Base URL: https://galx.ai/v1\nAPI Key: galx_live_your_key`
    },
    make: {
      name: 'Make.com & Zapier Workflows',
      desc: 'Automate business workflows without writing a single line of backend code.',
      steps: [
        'Add an HTTP "Make an API Call" or OpenAI Module',
        'Set Endpoint: https://galx.ai/v1/chat/completions',
        'Add Header: Authorization: Bearer YOUR_KEY',
        `Set JSON Payload: { "model": "${model.id}", "messages": [...] }`
      ],
      code: `POST https://galx.ai/v1/chat/completions\nAuthorization: Bearer galx_live_your_key\nContent-Type: application/json`
    },
    bolt: {
      name: 'Bolt.new / Lovable / v0 Web Builders',
      desc: 'Point prompt-to-app fullstack builders to high-velocity reasoning models.',
      steps: [
        'Open Custom AI Provider settings in tool',
        'Enter Base URL: https://galx.ai/v1',
        'Set Model ID to: ' + model.id,
        'Enjoy 75% prompt caching on rapid full-file iterations'
      ],
      code: `OPENAI_BASE_URL=https://galx.ai/v1\nOPENAI_MODEL=${model.id}`
    }
  };

  // Toggle FAQ accordion
  const toggleFaq = (index: number) => {
    setOpenFaqIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // Blended savings calculations (Plain English ROI)
  const listIn = model.listPricePer1MInput || model.inputPricePer1M * 1.33;
  const listOut = model.listPricePer1MOutput || model.outputPricePer1M * 1.33;
  const galxIn = model.inputPricePer1M;
  const galxOut = model.outputPricePer1M;
  const wholesaleDiscountPct = model.discountPercentage || 25;
  const promptSavingsPct = Math.round((promptCachePct / 100) * 75 * 0.5); // ~50% of input is cached
  const effectiveTotalPct = Math.min(65, wholesaleDiscountPct + promptSavingsPct);
  const monthlySavedDollars = Math.round(monthlySpend * (effectiveTotalPct / 100));
  const galxDirectSpend = monthlySpend - monthlySavedDollars;
  const annualSavedDollars = monthlySavedDollars * 12;

  // Raw mock JSON payloads for sandbox inspector
  const mockRequestJson = JSON.stringify(
    {
      model: model.id,
      messages: [
        { role: 'system', content: 'You are an expert AI engineer.' },
        { role: 'user', content: customPromptText || sandboxPresets[selectedPromptKey].prompt }
      ],
      temperature: 0.2,
      stream: true,
      max_tokens: 4096
    },
    null,
    2
  );

  const mockResponseJson = JSON.stringify(
    {
      id: `chatcmpl-galx-${Math.random().toString(36).substring(2, 9)}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: model.id,
      system_fingerprint: 'fp_galx_anycast_edge_v4',
      choices: [
        {
          index: 0,
          delta: { content: streamedText ? streamedText.slice(0, 100) + '...' : 'Streaming delta token chunks...' },
          finish_reason: isStreaming ? null : 'stop'
        }
      ],
      usage: {
        prompt_tokens: 120,
        completion_tokens: streamMetrics.totalTokens || 248,
        total_tokens: (streamMetrics.totalTokens || 248) + 120,
        prompt_tokens_details: { cached_tokens: 90 }
      }
    },
    null,
    2
  );

  const mockHeadersText = `HTTP/2 200 OK
content-type: text/event-stream; charset=utf-8
x-galxai-router-latency: 12ms
x-galxai-upstream-model: ${model.upstreamId}
x-galxai-cache-status: HIT (75% rebate applied)
x-galxai-region: us-east-anycast
x-galxai-savings-rate: -${model.discountPercentage || 25}% wholesale
x-ratelimit-limit-tokens: 2000000
x-ratelimit-remaining-tokens: 1998540
access-control-allow-origin: *`;

  const faqItems = [
    {
      q: `Are these the exact genuine ${isGrok ? 'xAI Grok' : 'OpenAI'} model weights?`,
      a: `Yes, 100% genuine. Every API request is dispatched directly to the official upstream ${isGrok ? 'xAI Grok' : 'OpenAI'} inference clusters. GALXAI acts as an ultra-low-latency Anycast gateway and volume-pooling layer. We never alter weights, down-quantize models, or truncate context limits.`
    },
    {
      q: `Do I have to install a new SDK or can I keep my existing OpenAI / LangChain setup?`,
      a: `You do not need to install any new libraries. GALXAI is 100% wire-compatible with standard OpenAI, Anthropic, LangChain, Vercel AI SDK, LlamaIndex, Go, and Rust SDKs. All you change is one single parameter: baseURL = "https://galx.ai/v1". Everything else (streaming SSE, tool calls, JSON mode, vision) works out of the box.`
    },
    {
      q: `How does the ${model.discountPercentage || 25}% wholesale discount and 75% prompt caching rebate work?`,
      a: `GALXAI pools compute demand across thousands of developers and enterprise fleets to negotiate tier-1 bulk commitments. We pass these wholesale savings directly to you. Furthermore, when you send repetitive context (such as system instructions, API documentation, or codebases), our router automatically passes through the 75% prompt caching rebate.`
    },
    {
      q: `What happens if the primary upstream cluster experiences an outage?`,
      a: `GALXAI operates multi-region active-active Anycast edge routing (us-east, us-west, eu-central). If an upstream datacenter throws a 503 or 429 rate limit error, our smart circuit breaker automatically fails over to secondary capacity pools in <15ms without dropping your active stream.`
    },
    {
      q: `Is my code, prompt data, or intellectual property stored or used for model training?`,
      a: `Never. GALXAI strictly enforces Zero Data Retention (ZDR). Prompts pass through ephemeral volatile RAM strictly for stream transmission and are immediately zeroized upon response termination. We do not write prompts to disk, store chat histories, or allow training on user payloads.`
    }
  ];

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* 1. HERO HEADER: Canonical IDs, Trust Seals, Pricing & Quick Actions */}
      {/* ========================================================================= */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 relative overflow-hidden space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  isGrok
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                }`}
              >
                {isGrok ? <Rocket className="w-5 h-5" /> : <Zap className="w-5 h-5 fill-amber-400" />}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                    {model.name}
                  </h1>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/40 shadow-sm">
                    -{model.discountPercentage}% Wholesale
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-mono mt-1">
                  <span className="flex items-center gap-1">
                    Canonical ID:{' '}
                    <code className="text-cyan-300 font-bold bg-black/40 px-2 py-0.5 rounded border border-white/10">
                      {model.id}
                    </code>
                    <button
                      onClick={() => triggerCopy(model.id, 'canonical-id')}
                      className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy Model ID"
                    >
                      {copiedKey === 'canonical-id' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </span>

                  <span className="text-zinc-600 hidden sm:inline">•</span>
                  <span>
                    Upstream ID: <code className="text-zinc-300">{model.upstreamId}</code>
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed pt-1">
              {model.description}
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0 self-stretch sm:self-auto">
            <ShareButton
              variant="pill"
              label="Share Model"
              title={`${model.name} — GALXAI Pricing & Specs`}
              description={`Get ${model.name} with ${model.discountPercentage || 25}% wholesale savings and sub-15ms router latency.`}
            />

            <Link
              href="/keys/new"
              className="flex-1 sm:flex-none px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 font-mono cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Claim $5 Free API Key</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>
          </div>
        </div>

        {/* Quick Specs Grid with Wholesale Strikethrough Pricing */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-4 border-t border-white/10 font-mono">
          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <div className="flex justify-between items-center text-zinc-500 text-[10px] uppercase">
              <span>Input Rate</span>
              {model.listPricePer1MInput && (
                <span className="line-through text-zinc-600">${model.listPricePer1MInput.toFixed(2)}</span>
              )}
            </div>
            <div className="text-sm sm:text-base font-bold text-emerald-300">
              ${model.inputPricePer1M.toFixed(2)}{' '}
              <span className="text-[10px] text-zinc-500 font-normal">/ 1M</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <div className="flex justify-between items-center text-zinc-500 text-[10px] uppercase">
              <span>Output Rate</span>
              {model.listPricePer1MOutput && (
                <span className="line-through text-zinc-600">${model.listPricePer1MOutput.toFixed(2)}</span>
              )}
            </div>
            <div className="text-sm sm:text-base font-bold text-emerald-300">
              ${model.outputPricePer1M.toFixed(2)}{' '}
              <span className="text-[10px] text-zinc-500 font-normal">/ 1M</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-zinc-500 text-[10px] uppercase block">Prompt Caching</span>
            <div className="text-sm sm:text-base font-bold text-cyan-300">
              {model.cachedInputPricePer1M ? `$${model.cachedInputPricePer1M.toFixed(2)}` : '75% OFF'}{' '}
              <span className="text-[10px] text-zinc-500 font-normal">/ 1M</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-zinc-500 text-[10px] uppercase block">Context Window</span>
            <div className="text-sm sm:text-base font-bold text-amber-300">
              {(model.contextWindowTokens / 1000).toLocaleString()}K{' '}
              <span className="text-[10px] text-zinc-500 font-normal">tokens</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-zinc-500 text-[10px] uppercase block">Max Output</span>
            <div className="text-sm sm:text-base font-bold text-indigo-300">
              {(model.maxOutputTokens / 1000).toLocaleString()}K{' '}
              <span className="text-[10px] text-zinc-500 font-normal">tokens</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-zinc-500 text-[10px] uppercase block">Routing SLA</span>
            <div className="text-sm sm:text-base font-bold text-emerald-400">
              &lt; 15ms <span className="text-[10px] text-zinc-500 font-normal">Anycast</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scarcity & Rate Lock Ribbon */}
      <RateLockRibbon />

      {/* ========================================================================= */}
      {/* 2. PROGRESSIVE DISCLOSURE & MENTAL MODEL JUMP */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {/* Mental Model Quick Launch Bar */}
        <div className="glass-panel rounded-2xl p-3 sm:p-4 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Meet Your Mental Model — Instant 1-Click Jump:</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">Zero configuration ambiguity</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            <button
              onClick={() => {
                setActivePersona('developer');
                setActiveRecipe('cursor');
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                activePersona === 'developer' && activeRecipe === 'cursor'
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400 font-bold shadow-sm'
                  : 'bg-black/40 text-zinc-400 hover:text-white border-white/5'
              }`}
            >
              <span>💻 Cursor / Windsurf</span>
            </button>

            <button
              onClick={() => {
                setActivePersona('developer');
                setActiveRecipe('python');
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                activePersona === 'developer' && activeRecipe === 'python'
                  ? 'bg-cyan-400/20 text-cyan-300 border-cyan-400 font-bold shadow-sm'
                  : 'bg-black/40 text-zinc-400 hover:text-white border-white/5'
              }`}
            >
              <span>🐍 Python SDK</span>
            </button>

            <button
              onClick={() => {
                setActivePersona('developer');
                setActiveRecipe('vercel');
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                activePersona === 'developer' && activeRecipe === 'vercel'
                  ? 'bg-indigo-400/20 text-indigo-300 border-indigo-400 font-bold shadow-sm'
                  : 'bg-black/40 text-zinc-400 hover:text-white border-white/5'
              }`}
            >
              <span>▲ Next.js / Vercel AI</span>
            </button>

            <button
              onClick={() => {
                setActivePersona('developer');
                setActiveRecipe('langchain');
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                activePersona === 'developer' && activeRecipe === 'langchain'
                  ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400 font-bold shadow-sm'
                  : 'bg-black/40 text-zinc-400 hover:text-white border-white/5'
              }`}
            >
              <span>🦜 LangChain</span>
            </button>

            <button
              onClick={() => {
                setActivePersona('creator');
                setNoCodeTool('make');
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                activePersona === 'creator'
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400 font-bold shadow-sm'
                  : 'bg-black/40 text-zinc-400 hover:text-white border-white/5'
              }`}
            >
              <span>⚡ No-Code (Make / Chat)</span>
            </button>

            <button
              onClick={() => {
                setActivePersona('architect');
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                activePersona === 'architect'
                  ? 'bg-purple-400/20 text-purple-300 border-purple-400 font-bold shadow-sm'
                  : 'bg-black/40 text-zinc-400 hover:text-white border-white/5'
              }`}
            >
              <span>🔬 Deep Specs &amp; SLA</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 rounded-2xl glass-panel border border-white/10">
          <div className="flex items-center gap-2 px-3 py-1">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
              Choose View Lens:
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/60 rounded-xl border border-white/5 text-xs font-semibold">
            <button
              onClick={() => setActivePersona('creator')}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activePersona === 'creator'
                  ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Smile className="w-4 h-4 shrink-0" />
              <span className="truncate">Plain English</span>
            </button>

            <button
              onClick={() => setActivePersona('developer')}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activePersona === 'developer'
                  ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Terminal className="w-4 h-4 shrink-0" />
              <span className="truncate">30s Quickstart</span>
            </button>

            <button
              onClick={() => setActivePersona('architect')}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activePersona === 'architect'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Cpu className="w-4 h-4 shrink-0" />
              <span className="truncate">Deep Specs</span>
            </button>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* PERSONA 1: PLAIN ENGLISH MODE ("Explain Like I'm New") */}
        {/* ----------------------------------------------------------------------- */}
        {activePersona === 'creator' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Plain English Banner */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-transparent to-orange-500/10 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-mono font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>EXPLAIN LIKE I&apos;M NEW</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                What is {model.name} and why should you use it?
              </h2>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl">
                Think of {model.name} as having a world-class senior engineer and architect sitting right next to you 24/7. It can read entire software codebases at once, pinpoint invisible bugs in seconds, and write complete production applications—all at <strong className="text-amber-300">{model.discountPercentage}% lower cost</strong> than buying directly from the model provider.
              </p>
            </div>

            {/* 4 Visual Capability Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-3 hover:border-amber-500/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                  🏗️
                </div>
                <h3 className="text-base font-bold text-white">Full Codebase Refactoring</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Feed 50,000+ lines of messy legacy code in a single prompt. {model.name} maps all file relationships and rewrites clean, modular, and fully tested code.
                </p>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-3 hover:border-emerald-500/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                  🐞
                </div>
                <h3 className="text-base font-bold text-white">Zero-Shot Bug Finding</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Paste your full backend logic. It spots subtle race conditions, memory leaks, and edge-case security flaws before code ever reaches production.
                </p>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-3 hover:border-cyan-500/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                  🏛️
                </div>
                <h3 className="text-base font-bold text-white">System Architecture &amp; Cloud</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Describe your business bottleneck. It designs resilient microservice topologies, database indexing strategies, and production Docker/Terraform files.
                </p>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-3 hover:border-indigo-500/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                  📋
                </div>
                <h3 className="text-base font-bold text-white">Strict Structured JSON Extraction</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Upload messy PDFs, OCR text, or API payloads. It guarantees 100% strict, validated type-safe JSON matching your exact data schema.
                </p>
              </div>
            </div>

            {/* Jargon Buster & Plain-English Specs Translator */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-cyan-500/20">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-black text-white">Jargon Buster: Specs in Everyday Language</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <div className="text-xs font-bold text-cyan-300 font-mono flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    <span>{(model.contextWindowTokens / 1000).toLocaleString()}K Context Window</span>
                  </div>
                  <p className="text-xs text-zinc-300">
                    <strong>Plain English:</strong> Equivalent to roughly <strong>{Math.round(model.contextWindowTokens * 0.75).toLocaleString()} words</strong> or <strong>{Math.round(model.contextWindowTokens / 50000)} entire books</strong> in memory simultaneously.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <div className="text-xs font-bold text-amber-300 font-mono flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>75% Prompt Caching</span>
                  </div>
                  <p className="text-xs text-zinc-300">
                    <strong>Plain English:</strong> Like keeping a bookmark open on your textbook. You only pay 25% of the rate when asking repeat questions on large files.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <div className="text-xs font-bold text-emerald-300 font-mono flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5" />
                    <span>Wholesale Arbitrage</span>
                  </div>
                  <p className="text-xs text-zinc-300">
                    <strong>Plain English:</strong> Like a Costco membership for AI. GALXAI buys computing power in massive enterprise volume, cutting retail prices for you.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <div className="text-xs font-bold text-indigo-300 font-mono flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Zero Data Retention</span>
                  </div>
                  <p className="text-xs text-zinc-300">
                    <strong>Plain English:</strong> Your private code and prompts are processed strictly in temporary RAM and vanish instantly. Nothing is ever saved to disk or trained on.
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive ROI & Monthly Savings Slider */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-emerald-500/20 bg-gradient-to-b from-[#0e141a] to-[#07080d]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-bold">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>INSTANT SAVINGS ESTIMATOR</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    How much will your team save switching to GALXAI {model.name}?
                  </h3>
                </div>

                <div className="text-left sm:text-right font-mono">
                  <span className="text-[10px] text-zinc-500 uppercase">Annual Net Savings</span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                    +${annualSavedDollars.toLocaleString()} <span className="text-xs text-emerald-300 font-normal">/ yr</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-300 font-bold">Your Current Monthly AI / LLM Spend:</span>
                      <span className="text-amber-300 font-bold text-sm bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                        ${monthlySpend.toLocaleString()} / month
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="15000"
                      step="50"
                      value={monthlySpend}
                      onChange={(e) => setMonthlySpend(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer h-2 bg-zinc-800 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>$50 / mo (Solo Creator)</span>
                      <span>$2,500 / mo (Team)</span>
                      <span>$15,000+ (Scale)</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-cyan-400" />
                        Prompt Cache Re-Use Ratio
                      </span>
                      <span className="text-cyan-300 font-bold">{promptCachePct}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      step="5"
                      value={promptCachePct}
                      onChange={(e) => setPromptCachePct(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                    />
                  </div>
                </div>

                <div className="lg:col-span-5 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4">
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Direct Retail Cost:</span>
                      <span className="line-through text-zinc-400">${monthlySpend.toLocaleString()} / mo</span>
                    </div>
                    <div className="flex justify-between items-center text-white font-bold">
                      <span className="text-emerald-400">GALXAI Wholesale Cost:</span>
                      <span className="text-emerald-300 text-base font-black">${galxDirectSpend.toLocaleString()} / mo</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-500/20">
                    <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold tracking-wider">
                      Monthly Cash Kept
                    </span>
                    <div className="text-2xl font-black text-emerald-300 font-mono">
                      ${monthlySavedDollars.toLocaleString()} <span className="text-xs text-emerald-400">/ mo</span>
                    </div>
                  </div>

                  <Link
                    href="/keys/new"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 font-mono cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-black" />
                    <span>Claim $5 Free API Key</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* 1-Click No-Code Connectors */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-black text-white">Use {model.name} in Your Favorite Tools (0 Code Needed)</h3>
              </div>
              <p className="text-xs text-zinc-400">
                Connect GALXAI into your existing IDEs, ChatGPT-style web interfaces, and workflow automations in 30 seconds.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {(['cursor', 'chat_app', 'make', 'bolt'] as const).map((tool) => (
                  <button
                    key={tool}
                    onClick={() => setNoCodeTool(tool)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                      noCodeTool === tool
                        ? 'bg-indigo-600/30 text-white border-indigo-400 shadow-md shadow-indigo-500/20'
                        : 'bg-black/40 text-zinc-400 hover:text-white border-white/5'
                    }`}
                  >
                    <span className="font-bold text-xs">{noCodeConfigs[tool].name}</span>
                    <span className="text-[10px] text-zinc-500 line-clamp-1">{noCodeConfigs[tool].desc}</span>
                  </button>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-white block">Step-by-Step Setup:</span>
                  <ol className="list-decimal list-inside text-xs text-zinc-300 space-y-1">
                    {noCodeConfigs[noCodeTool].steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>

                <div className="relative p-3 rounded-xl bg-black/80 border border-white/10 font-mono text-xs text-cyan-300">
                  <pre className="overflow-x-auto whitespace-pre-wrap pr-16">{noCodeConfigs[noCodeTool].code}</pre>
                  <button
                    onClick={() => triggerCopy(noCodeConfigs[noCodeTool].code, `nocode-${noCodeTool}`)}
                    className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    {copiedKey === `nocode-${noCodeTool}` ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedKey === `nocode-${noCodeTool}` ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* PERSONA 2: DEVELOPER QUICKSTART MODE ("30-Second Integration") */}
        {/* ----------------------------------------------------------------------- */}
        {activePersona === 'developer' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* 3-Step Guided Onboarding Checklist */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-cyan-500/20">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-cyan-400" />
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  30-Second Handheld Developer Quickstart
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 relative">
                  <div className="w-6 h-6 rounded-full bg-cyan-400 text-black text-xs font-mono font-black flex items-center justify-center">
                    1
                  </div>
                  <h3 className="text-sm font-bold text-white">Universal Base URL &amp; Model ID</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Point your OpenAI SDK or HTTP client to <code className="text-cyan-300 font-mono">https://galx.ai/v1</code> with model <code className="text-amber-300 font-mono">{model.id}</code>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 relative">
                  <div className="w-6 h-6 rounded-full bg-amber-400 text-black text-xs font-mono font-black flex items-center justify-center">
                    2
                  </div>
                  <h3 className="text-sm font-bold text-white">Generate Developer Key</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Claim a free developer key with $5 in compute credits. Zero credit card required to start testing.
                  </p>
                  <Link
                    href="/keys/new"
                    className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-bold font-mono pt-1"
                  >
                    <span>Generate Free Key →</span>
                  </Link>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 relative">
                  <div className="w-6 h-6 rounded-full bg-emerald-400 text-black text-xs font-mono font-black flex items-center justify-center">
                    3
                  </div>
                  <h3 className="text-sm font-bold text-white">1-Line Drop-in Client</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Override the <code className="text-emerald-300 font-mono">base_url</code> parameter. Keep 100% of your existing codebase and libraries.
                  </p>
                </div>
              </div>
            </div>

            {/* Side-by-Side Drop-in Migration Diff */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-amber-400" />
                    Visual Drop-in Code Diff (1 Line Switch)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Compare standard direct OpenAI initialization against GALXAI Universal Gateway.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 font-mono text-xs">
                {/* Standard OpenAI code */}
                <div className="rounded-2xl bg-rose-950/20 border border-rose-500/20 overflow-hidden">
                  <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 font-bold flex items-center justify-between">
                    <span>Direct Provider (Standard Retail)</span>
                    <span className="text-[10px] uppercase text-rose-400">0% Discount</span>
                  </div>
                  <pre className="p-4 text-zinc-300 leading-relaxed overflow-x-auto">
{`from openai import OpenAI

# Direct retail connection (0% savings)
client = OpenAI(
    api_key=os.environ["OPENAI_API_KEY"]
)

response = client.chat.completions.create(
    model="${model.upstreamId}",
    messages=[{"role": "user", "content": "..."}]
)`}
                  </pre>
                </div>

                {/* GALXAI code */}
                <div className="rounded-2xl bg-emerald-950/20 border border-emerald-500/30 overflow-hidden">
                  <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-300 font-bold flex items-center justify-between">
                    <span>GALXAI Universal Gateway</span>
                    <span className="text-[10px] uppercase text-emerald-400 font-bold">
                      -{model.discountPercentage}% Wholesale + 75% Cache
                    </span>
                  </div>
                  <pre className="p-4 text-zinc-200 leading-relaxed overflow-x-auto selection:bg-emerald-500 selection:text-black">
{`from openai import OpenAI

# GALXAI Wholesale Gateway (Sub-15ms Anycast)
client = OpenAI(
`}<span className="bg-emerald-500/30 text-emerald-200 px-1 py-0.5 rounded font-bold">{`    base_url="https://galx.ai/v1",  # 👈 ONLY CHANGE`}</span>{`
    api_key="galx_live_your_gateway_key"
)

response = client.chat.completions.create(
    model="${model.id}",
    messages=[{"role": "user", "content": "..."}]
)`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Tabbed SDK & Framework Recipes (8 Frameworks) */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-cyan-400" />
                    Drop-in Code Recipes Across 8 Frameworks
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Select your preferred language or client library to copy pre-formatted code.
                  </p>
                </div>

                {/* Recipe Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-black/50 border border-white/5 text-xs font-semibold">
                  {(
                    [
                      { id: 'python', label: 'Python' },
                      { id: 'node', label: 'TypeScript / Node' },
                      { id: 'curl', label: 'cURL' },
                      { id: 'vercel', label: 'Vercel AI' },
                      { id: 'langchain', label: 'LangChain' },
                      { id: 'go', label: 'Go' },
                      { id: 'rust', label: 'Rust' },
                      { id: 'cursor', label: 'Cursor / IDE' }
                    ] as const
                  ).map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => setActiveRecipe(recipe.id)}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-mono ${
                        activeRecipe === recipe.id
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {recipe.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Snippet Box */}
              <div className="relative rounded-2xl bg-black/70 border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
                  <span className="text-[11px] font-mono text-zinc-400">
                    {activeRecipe === 'python' && 'Python 3.10+ (openai >= 1.0.0)'}
                    {activeRecipe === 'node' && 'Node.js / TypeScript (openai)'}
                    {activeRecipe === 'curl' && 'bash / terminal HTTP request'}
                    {activeRecipe === 'vercel' && 'Next.js App Router (@ai-sdk/openai)'}
                    {activeRecipe === 'langchain' && 'Python LangChain (langchain-openai)'}
                    {activeRecipe === 'go' && 'Go (github.com/sashabaranov/go-openai)'}
                    {activeRecipe === 'rust' && 'Rust (async-openai)'}
                    {activeRecipe === 'cursor' && 'Cursor / Cline / Roo-Code .cursorrules'}
                  </span>

                  <button
                    onClick={() => triggerCopy(codeRecipes[activeRecipe], `recipe-${activeRecipe}`)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    {copiedKey === `recipe-${activeRecipe}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedKey === `recipe-${activeRecipe}` ? 'Copied Code!' : 'Copy Code'}</span>
                  </button>
                </div>

                <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto selection:bg-cyan-500 selection:text-black">
                  <code>{codeRecipes[activeRecipe]}</code>
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* PERSONA 3: ARCHITECTURE & BENCHMARKS MODE ("Deep Specs & SRE SLA") */}
        {/* ----------------------------------------------------------------------- */}
        {activePersona === 'architect' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Verified Benchmark Leaderboard */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-indigo-500/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
                    <Activity className="w-3.5 h-3.5" />
                    <span>VERIFIED REASONING &amp; CODING BENCHMARKS</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {model.name} Quantitative Performance Metrics
                  </h2>
                </div>

                <span className="text-xs font-mono text-zinc-400">
                  Evaluated at Temperature 0.2
                </span>
              </div>

              <div className="space-y-4 pt-2 font-mono">
                {/* HumanEval */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300 font-bold">HumanEval (Python Code Generation)</span>
                    <span className="text-cyan-300 font-bold">{benchmarkScores.humanEval}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
                      style={{ width: `${benchmarkScores.humanEval}%` }}
                    />
                  </div>
                </div>

                {/* SWE-bench Verified */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300 font-bold">SWE-bench Verified (Real-World GitHub Issue Resolution)</span>
                    <span className="text-amber-300 font-bold">{benchmarkScores.sweBench}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                      style={{ width: `${benchmarkScores.sweBench}%` }}
                    />
                  </div>
                </div>

                {/* MATH-500 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300 font-bold">MATH-500 (Complex Algorithmic &amp; Mathematical Proofs)</span>
                    <span className="text-emerald-300 font-bold">{benchmarkScores.math500}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                      style={{ width: `${benchmarkScores.math500}%` }}
                    />
                  </div>
                </div>

                {/* GPQA Diamond */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300 font-bold">GPQA Diamond (Doctoral-Level Physics, Chemistry, Biology)</span>
                    <span className="text-indigo-300 font-bold">{benchmarkScores.gpqaDiamond}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-500"
                      style={{ width: `${benchmarkScores.gpqaDiamond}%` }}
                    />
                  </div>
                </div>

                {/* Multilingual MMLU */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300 font-bold">Multilingual MMLU (Cross-Lingual Deep Domain Comprehension)</span>
                    <span className="text-rose-300 font-bold">{benchmarkScores.multilingualMmlu}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-500 transition-all duration-500"
                      style={{ width: `${benchmarkScores.multilingualMmlu}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Parameter Guide */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                Inference Hyperparameters &amp; API Spec Reference
              </h3>
              <p className="text-xs text-zinc-400">
                Recommended configuration values for maximum reasoning determinism and low latency.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 font-mono text-xs">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-amber-300 font-bold">temperature: 0.0 - 0.2</span>
                  <p className="text-[11px] text-zinc-400">
                    Recommended for code generation, mathematical proofs, and structural schema output.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-cyan-300 font-bold">top_p: 0.95</span>
                  <p className="text-[11px] text-zinc-400">
                    Nucleus sampling probability mass. Keeps tail tokens constrained to valid syntax.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-emerald-300 font-bold">response_format</span>
                  <p className="text-[11px] text-zinc-400">
                    Set <code className="text-zinc-200">&#123; type: &quot;json_object&quot; &#125;</code> for guaranteed JSON syntax.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-indigo-300 font-bold">max_output_tokens</span>
                  <p className="text-[11px] text-zinc-400">
                    Up to <strong>{(model.maxOutputTokens / 1000).toLocaleString()}K tokens</strong> per single API completion.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-rose-300 font-bold">stream: true</span>
                  <p className="text-[11px] text-zinc-400">
                    Server-Sent Events (SSE) streaming with sub-15ms time-to-first-token.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-amber-300 font-bold">frequency_penalty: 0.0</span>
                  <p className="text-[11px] text-zinc-400">
                    Leave at 0.0 for programming languages where recurring keywords (e.g. return, const) are essential.
                  </p>
                </div>
              </div>
            </div>

            {/* SRE SLA & Infrastructure Guarantees */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-black text-white">SRE &amp; Enterprise Production SLA</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                  <div className="text-xl font-black text-emerald-300 font-mono">99.99%</div>
                  <span className="text-xs font-bold text-white block">Uptime Availability</span>
                  <p className="text-[11px] text-zinc-400">
                    Multi-region Anycast failover prevents upstream outages from impacting your traffic.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                  <div className="text-xl font-black text-cyan-300 font-mono">&lt; 14ms</div>
                  <span className="text-xs font-bold text-white block">Gateway Transit TTFT</span>
                  <p className="text-[11px] text-zinc-400">
                    Edge proxies distributed globally ensure zero latency overhead over direct connection.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                  <div className="text-xl font-black text-amber-300 font-mono">0 Disk Writes</div>
                  <span className="text-xs font-bold text-white block">Ephemeral RAM Transit</span>
                  <p className="text-[11px] text-zinc-400">
                    Zero Data Retention policy; memory zeroization after every completed stream chunk.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                  <div className="text-xl font-black text-indigo-300 font-mono">2M TPM</div>
                  <span className="text-xs font-bold text-white block">Continuous Token Capacity</span>
                  <p className="text-[11px] text-zinc-400">
                    Pooled compute buffers absorb high-concurrency traffic bursts seamlessly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. FRICTIONLESS IN-BROWSER INTERACTIVE MODEL SANDBOX */}
      {/* ========================================================================= */}
      <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-cyan-500/25 bg-gradient-to-b from-[#0a0d18] to-[#07080d] shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-bold">
              <Play className="w-3 h-3 fill-cyan-400 text-cyan-400" />
              <span>INTERACTIVE IN-BROWSER SANDBOX &amp; INSPECTOR</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Live Test {model.name} (Zero Auth Required)
            </h2>
            <p className="text-xs text-zinc-400 max-w-xl">
              Simulate real-time streaming, inspect raw HTTP request/response JSON payloads, and verify sub-15ms headers.
            </p>
          </div>

          {/* Preset Prompts Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5 text-xs font-semibold">
            {(
              [
                { id: 'refactor', label: 'Refactor' },
                { id: 'audit', label: 'Bug Audit' },
                { id: 'json', label: 'Strict JSON' },
                { id: 'architecture', label: 'Architecture' }
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedPromptKey(preset.id);
                  setCustomPromptText('');
                  setStreamedText('');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedPromptKey === preset.id && !customPromptText
                    ? 'bg-cyan-500 text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sandbox Prompt Input / Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>Input Prompt:</span>
            <span className="text-[11px] text-zinc-500">
              {sandboxPresets[selectedPromptKey].desc}
            </span>
          </div>

          <div className="relative">
            <textarea
              value={customPromptText || sandboxPresets[selectedPromptKey].prompt}
              onChange={(e) => {
                setCustomPromptText(e.target.value);
                setStreamedText('');
              }}
              rows={3}
              placeholder="Type your own prompt here or use one of the presets above..."
              className="w-full p-4 rounded-2xl bg-black/60 border border-white/10 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 resize-none shadow-inner"
            />

            <button
              onClick={handleRunSimulation}
              disabled={isStreaming}
              className="absolute bottom-3.5 right-3.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isStreaming ? 'Streaming Tokens...' : 'Run Live Simulation'}</span>
            </button>
          </div>
        </div>

        {/* Inspector Tab Bar */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              {(
                [
                  { id: 'rendered', label: 'Rendered Output' },
                  { id: 'request', label: 'Raw Request JSON' },
                  { id: 'response', label: 'Raw Response JSON' },
                  { id: 'headers', label: 'HTTP Response Headers' },
                  { id: 'cost', label: 'Live Cost Breakdown' }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveInspectorTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeInspectorTab === tab.id
                      ? 'bg-white/10 text-white font-bold border border-white/15 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Live Metrics Pill */}
            <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                TTFT: <strong className="text-white">12ms</strong>
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                Throughput: <strong className="text-white">~148 tok/s</strong>
              </span>
              <span className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
                Discount: <strong className="text-emerald-300">-{model.discountPercentage}%</strong>
              </span>
            </div>
          </div>

          {/* Inspector Display Window */}
          <div className="rounded-2xl bg-[#06070c] border border-white/10 p-5 font-mono text-xs text-zinc-200 min-h-[200px] max-h-[400px] overflow-y-auto relative selection:bg-cyan-500 selection:text-black">
            {activeInspectorTab === 'rendered' && (
              <div className="whitespace-pre-wrap leading-relaxed">
                {streamedText ? (
                  streamedText
                ) : (
                  <div className="text-zinc-500 italic flex flex-col items-center justify-center py-10 space-y-2">
                    <Sparkles className="w-6 h-6 text-zinc-600" />
                    <span>Click &quot;Run Live Simulation&quot; above to start streaming tokens in real time...</span>
                  </div>
                )}
                {isStreaming && <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse" />}
              </div>
            )}

            {activeInspectorTab === 'request' && (
              <pre className="text-cyan-300 overflow-x-auto">
                <code>{mockRequestJson}</code>
              </pre>
            )}

            {activeInspectorTab === 'response' && (
              <pre className="text-emerald-300 overflow-x-auto">
                <code>{mockResponseJson}</code>
              </pre>
            )}

            {activeInspectorTab === 'headers' && (
              <pre className="text-amber-300 overflow-x-auto">
                <code>{mockHeadersText}</code>
              </pre>
            )}

            {activeInspectorTab === 'cost' && (
              <div className="space-y-4 font-sans text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <span className="text-zinc-500 text-[10px] uppercase">Standard Upstream Cost</span>
                    <div className="text-base font-bold text-zinc-400 line-through">
                      ${streamMetrics.retailCost || '0.00084'} USD
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <span className="text-zinc-500 text-[10px] uppercase">GALXAI Wholesale Cost</span>
                    <div className="text-base font-bold text-emerald-300">
                      ${streamMetrics.liveCost || '0.00042'} USD
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                    <span className="text-emerald-400 text-[10px] uppercase font-bold">Net Single Call Savings</span>
                    <div className="text-base font-bold text-emerald-300">
                      -50% Below Retail
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>
                    75% Prompt Caching applied automatically on matching system instructions. Zero manual configuration required.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SIBLING MODEL COMPARISON MATRIX */}
      {/* ========================================================================= */}
      <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 uppercase">
              <Boxes className="w-3.5 h-3.5" />
              <span>SIBLING MODEL FLEET MATRIX</span>
            </div>
            <h3 className="text-xl font-black text-white">Compare Sibling Frontier Models</h3>
          </div>

          <Link
            href="/models/compare"
            className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>Full Side-by-Side Matrix →</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          {siblingModels.slice(0, 3).map((sibling) => {
            return (
              <div
                key={sibling.id}
                className="p-5 rounded-2xl bg-black/40 border border-white/10 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{sibling.id}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                      -{sibling.discountPercentage}%
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans line-clamp-2">
                    {sibling.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Input / 1M:</span>
                    <span className="text-emerald-300 font-bold">${sibling.inputPricePer1M.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Context:</span>
                    <span className="text-amber-300 font-bold">
                      {(sibling.contextWindowTokens / 1000).toLocaleString()}K tok
                    </span>
                  </div>

                  <Link
                    href={`/models/${sibling.id.replace('/', '-')}`}
                    className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-sans text-xs font-semibold flex items-center justify-center gap-1 border border-white/10 transition-colors cursor-pointer mt-1"
                  >
                    <span>View {sibling.id} Specs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE FAQ & COMMON HESITATIONS */}
      {/* ========================================================================= */}
      <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 uppercase">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FREQUENTLY ASKED QUESTIONS</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            Common Hesitations &amp; Integration Questions
          </h3>
          <p className="text-xs text-zinc-400">
            Clear answers about genuine model weights, latency guarantees, and wholesale pricing.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {faqItems.map((faq, idx) => {
            const isOpen = openFaqIndices.includes(idx);
            return (
              <div
                key={idx}
                className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-bold text-white text-sm sm:text-base">{faq.q}</span>
                  <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-zinc-400">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-white/5 font-sans animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Consumer Trust Seals */}
      <TrustSeals />
    </div>
  );
}

export const ModelCardClient = withErrorBoundary(BaseModelCardClient, {
  name: 'Model Detail Card Client'
});
