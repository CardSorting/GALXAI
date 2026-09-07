'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Wrench,
  Plus,
  Trash2,
  Copy,
  Check,
  Zap,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface ToolParam {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array_string' | 'enum';
  description: string;
  required: boolean;
  enumValues?: string;
}

export function FunctionCallingBuilderToolClient() {
  const [functionName, setFunctionName] = useState<string>('fetch_weather_forecast');
  const [functionDescription, setFunctionDescription] = useState<string>(
    'Retrieve real-time weather and temperature metrics for a specific geographic city.'
  );
  const [params, setParams] = useState<ToolParam[]>([
    {
      id: 'p1',
      name: 'location',
      type: 'string',
      description: 'City and state, e.g. San Francisco, CA or London, UK',
      required: true,
    },
    {
      id: 'p2',
      name: 'unit',
      type: 'enum',
      description: 'Temperature scale unit',
      required: true,
      enumValues: 'celsius, fahrenheit',
    },
    {
      id: 'p3',
      name: 'include_hourly',
      type: 'boolean',
      description: 'Whether to include 24-hour detailed breakdown',
      required: false,
    },
  ]);

  const [activeTab, setActiveTab] = useState<'tools_json' | 'python_sdk' | 'typescript_sdk'>('tools_json');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const addParam = () => {
    const newParam: ToolParam = {
      id: `p_${Date.now()}`,
      name: `param_${params.length + 1}`,
      type: 'string',
      description: 'Parameter description for the model',
      required: true,
    };
    setParams([...params, newParam]);
  };

  const removeParam = (id: string) => {
    if (params.length <= 1) return;
    setParams(params.filter((p) => p.id !== id));
  };

  const updateParam = (id: string, updates: Partial<ToolParam>) => {
    setParams(params.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  // Dynamic Generator Outputs
  const generatedToolsJson = useMemo(() => {
    const properties: { [key: string]: any } = {};
    const required: string[] = [];

    params.forEach((p) => {
      if (p.required) required.push(p.name);

      if (p.type === 'string') {
        properties[p.name] = { type: 'string', description: p.description };
      } else if (p.type === 'number') {
        properties[p.name] = { type: 'number', description: p.description };
      } else if (p.type === 'boolean') {
        properties[p.name] = { type: 'boolean', description: p.description };
      } else if (p.type === 'array_string') {
        properties[p.name] = {
          type: 'array',
          items: { type: 'string' },
          description: p.description,
        };
      } else if (p.type === 'enum') {
        properties[p.name] = {
          type: 'string',
          enum: (p.enumValues || '').split(',').map((v) => v.trim()).filter(Boolean),
          description: p.description,
        };
      }
    });

    const toolObj = [
      {
        type: 'function',
        function: {
          name: functionName,
          description: functionDescription,
          parameters: {
            type: 'object',
            properties,
            required,
          },
        },
      },
    ];

    return JSON.stringify(toolObj, null, 2);
  }, [functionName, functionDescription, params]);

  const generatedPythonSdk = useMemo(() => {
    return `import json
from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Tool Schema Definition
tools = ${generatedToolsJson}

# 1. Initial Prompt Invocation with Tool Definition
response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "What is the weather in Tokyo right now in Celsius?"}],
    tools=tools,
    tool_choice="auto"
)

response_message = response.choices[0].message
tool_calls = response_message.tool_calls

if tool_calls:
    for tool_call in tool_calls:
        func_name = tool_call.function.name
        func_args = json.loads(tool_call.function.arguments)
        print(f"Executing {func_name} with args: {func_args}")
        # Dispatched tool execution happens here...`;
  }, [generatedToolsJson]);

  const generatedTypeScriptSdk = useMemo(() => {
    return `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = ${generatedToolsJson};

async function runAgent() {
  const response = await client.chat.completions.create({
    model: "gpt-5.6-sol",
    messages: [{ role: "user", content: "What is the weather in Tokyo right now in Celsius?" }],
    tools,
    tool_choice: "auto",
  });

  const toolCalls = response.choices[0].message.tool_calls;
  if (toolCalls && toolCalls.length > 0) {
    for (const toolCall of toolCalls) {
      console.log("Calling tool:", toolCall.function.name);
      console.log("Arguments:", JSON.parse(toolCall.function.arguments));
    }
  }
}

runAgent();`;
  }, [generatedToolsJson]);

  const currentCode = useMemo(() => {
    if (activeTab === 'tools_json') return generatedToolsJson;
    if (activeTab === 'python_sdk') return generatedPythonSdk;
    return generatedTypeScriptSdk;
  }, [activeTab, generatedToolsJson, generatedPythonSdk, generatedTypeScriptSdk]);

  const handleCopyCode = async () => {
    const ok = await safeCopyToClipboard(currentCode);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const toolFaqs = [
    {
      q: 'Does GALXAI support Parallel Function Calling?',
      a: 'Yes. All frontier models on GALXAI support parallel tool execution, enabling agents to call multiple functions simultaneously in a single roundtrip.',
    },
    {
      q: 'Can I force the model to invoke a specific function?',
      a: 'Yes. Set tool_choice: {"type": "function", "function": {"name": "your_function_name"}} or tool_choice: "required".',
    },
    {
      q: 'Are tool definitions wire-compatible with standard OpenAI libraries?',
      a: 'Yes. All schemas conform strictly to the OpenAI JSON Schema tool format with 100% wire fidelity.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs
          items={[
            { label: 'Tools', href: '/calculator' },
            { label: 'Function Calling & Tool Definition Studio' },
          ]}
        />

        {/* Hero Section with AEO Inverted Pyramid Lead */}
        <section id="tool-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-cyan-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <Wrench className="w-3.5 h-3.5" />
              <span>AGENT TOOL DEFINITION &amp; FUNCTION CALLING STUDIO</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Tool"
              title="GALXAI Function Calling & Tool Definition Studio"
              description="Visually design OpenAI-compatible tool definitions and generate complete Python and TypeScript agent execution loops."
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Function Calling &amp; Tool Definition Studio
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            Visually design strongly-typed tool definitions for autonomous coding agents, customer bots, and SQL pipelines with 1-click Python &amp; TypeScript code generation.
          </p>
        </section>

        {/* Interactive Dual Panel: Visual Designer vs Code Output */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Panel */}
          <section id="tool-designer" className="lg:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 space-y-5 border border-white/10">
            <div className="space-y-1 border-b border-white/10 pb-3">
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">Step 1: Configure Tool</span>
              <h2 className="text-lg font-bold text-white font-mono">Function Name &amp; Args</h2>
            </div>

            {/* Function Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400 uppercase block">Function Name</label>
              <input
                type="text"
                value={functionName}
                onChange={(e) => setFunctionName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                className="w-full p-2.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-xs focus:outline-none"
              />
            </div>

            {/* Function Description */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400 uppercase block">Function Description</label>
              <textarea
                value={functionDescription}
                onChange={(e) => setFunctionDescription(e.target.value)}
                rows={2}
                className="w-full p-2.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-xs focus:outline-none"
              />
            </div>

            {/* Parameters List */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {params.map((param) => (
                <div key={param.id} className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={param.name}
                      onChange={(e) => updateParam(param.id, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                      className="p-1.5 rounded-lg bg-black/70 border border-white/10 text-white font-bold text-xs flex-1 focus:outline-none"
                      placeholder="param_name"
                    />
                    <select
                      value={param.type}
                      onChange={(e) => updateParam(param.id, { type: e.target.value as any })}
                      className="p-1.5 rounded-lg bg-black/70 border border-white/10 text-cyan-300 text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="array_string">Array[String]</option>
                      <option value="enum">Enum</option>
                    </select>

                    <button
                      onClick={() => removeParam(param.id)}
                      disabled={params.length <= 1}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={param.description}
                    onChange={(e) => updateParam(param.id, { description: e.target.value })}
                    className="w-full p-1.5 rounded-lg bg-black/40 border border-white/5 text-zinc-300 text-[11px] focus:outline-none"
                    placeholder="Parameter explanation for the LLM..."
                  />

                  {param.type === 'enum' && (
                    <input
                      type="text"
                      value={param.enumValues || ''}
                      onChange={(e) => updateParam(param.id, { enumValues: e.target.value })}
                      className="w-full p-1.5 rounded-lg bg-black/40 border border-amber-500/30 text-amber-300 text-[11px] focus:outline-none"
                      placeholder="Comma-separated enum values"
                    />
                  )}

                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={param.required}
                        onChange={(e) => updateParam(param.id, { required: e.target.checked })}
                        className="accent-cyan-400 rounded cursor-pointer"
                      />
                      <span>Required Parameter</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addParam}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-mono text-xs font-bold flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Tool Parameter</span>
            </button>
          </section>

          {/* Generated Code Output */}
          <section id="tool-output" className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-cyan-500/30 bg-[#0b0e17] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                {/* Format Switcher Tabs */}
                <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
                  {[
                    { id: 'tools_json', label: 'OpenAI Tools JSON' },
                    { id: 'python_sdk', label: 'Python Dispatch' },
                    { id: 'typescript_sdk', label: 'TypeScript Loop' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>

              {/* Code Box */}
              <pre className="p-4 rounded-2xl bg-black/90 border border-white/10 font-mono text-xs text-zinc-300 overflow-x-auto min-h-[300px] leading-relaxed">
                {currentCode}
              </pre>
            </div>

            <Link
              href="/keys/new"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer mt-4"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Deploy Tool Calling with $5 Free Compute →</span>
            </Link>
          </section>
        </div>

        {/* AEO Frequently Asked Questions */}
        <section id="tool-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Frequently Asked Questions (Function Calling &amp; Tool Schemas)</span>
            </h2>
            <p className="text-xs text-zinc-400">Parallel execution, parameter coercion, and agent orchestration.</p>
          </div>

          <div className="space-y-3 pt-2">
            {toolFaqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="font-bold text-white text-sm font-sans">{faq.q}</span>
                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-zinc-400">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-zinc-300 leading-relaxed border-t border-white/5 font-sans">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />
      </main>

      {/* Floating Conversion Dock */}
      <FloatingConversionDock />
    </div>
  );
}
