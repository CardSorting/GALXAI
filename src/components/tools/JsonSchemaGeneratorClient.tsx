'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Binary,
  Plus,
  Trash2,
  Copy,
  Check,
  Zap,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileCode,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface SchemaField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array_string' | 'enum';
  description: string;
  required: boolean;
  enumValues?: string;
}

export function JsonSchemaGeneratorClient() {
  const [schemaName, setSchemaName] = useState<string>('CustomerOrderExtraction');
  const [fields, setFields] = useState<SchemaField[]>([
    {
      id: 'f1',
      name: 'customer_name',
      type: 'string',
      description: 'Full name of the purchasing customer',
      required: true,
    },
    {
      id: 'f2',
      name: 'order_total_usd',
      type: 'number',
      description: 'Total order value in US Dollars',
      required: true,
    },
    {
      id: 'f3',
      name: 'order_status',
      type: 'enum',
      description: 'Current order fulfillment status',
      required: true,
      enumValues: 'pending, processing, fulfilled, cancelled',
    },
    {
      id: 'f4',
      name: 'line_item_skus',
      type: 'array_string',
      description: 'List of product SKU identifiers',
      required: false,
    },
  ]);

  const [activeTab, setActiveTab] = useState<'pydantic' | 'zod' | 'json_schema' | 'python_sdk'>('pydantic');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const addField = () => {
    const newField: SchemaField = {
      id: `f_${Date.now()}`,
      name: `field_${fields.length + 1}`,
      type: 'string',
      description: 'Description of this attribute',
      required: true,
    };
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    if (fields.length <= 1) return;
    setFields(fields.filter((f) => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<SchemaField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  // Dynamic Generator Outputs
  const generatedPydantic = useMemo(() => {
    const enumFields = fields.filter((f) => f.type === 'enum' && f.enumValues);
    let code = `from pydantic import BaseModel, Field\nfrom typing import List, Optional\n`;
    if (enumFields.length > 0) {
      code += `from enum import Enum\n\n`;
      enumFields.forEach((ef) => {
        const enumClassName = `${ef.name.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase())}Enum`;
        const values = (ef.enumValues || '').split(',').map((v) => v.trim()).filter(Boolean);
        code += `class ${enumClassName}(str, Enum):\n`;
        values.forEach((v) => {
          const key = v.toUpperCase().replace(/[^A-Z0-9]/g, '_');
          code += `    ${key} = "${v}"\n`;
        });
        code += `\n`;
      });
    }

    code += `class ${schemaName}(BaseModel):\n`;
    fields.forEach((f) => {
      let pyType = 'str';
      if (f.type === 'number') pyType = 'float';
      if (f.type === 'boolean') pyType = 'bool';
      if (f.type === 'array_string') pyType = 'List[str]';
      if (f.type === 'enum') {
        pyType = `${f.name.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase())}Enum`;
      }

      if (!f.required) {
        pyType = `Optional[${pyType}] = None`;
      }

      code += `    ${f.name}: ${pyType} = Field(description="${f.description}")\n`;
    });

    return code.trim();
  }, [schemaName, fields]);

  const generatedZod = useMemo(() => {
    let code = `import { z } from "zod";\n\nexport const ${schemaName}Schema = z.object({\n`;
    fields.forEach((f) => {
      let zType = 'z.string()';
      if (f.type === 'number') zType = 'z.number()';
      if (f.type === 'boolean') zType = 'z.boolean()';
      if (f.type === 'array_string') zType = 'z.array(z.string())';
      if (f.type === 'enum') {
        const values = (f.enumValues || '').split(',').map((v) => `"${v.trim()}"`).join(', ');
        zType = `z.enum([${values}])`;
      }

      zType += `.describe("${f.description}")`;
      if (!f.required) {
        zType += '.optional()';
      }

      code += `  ${f.name}: ${zType},\n`;
    });
    code += `});\n\nexport type ${schemaName} = z.infer<typeof ${schemaName}Schema>;`;
    return code;
  }, [schemaName, fields]);

  const generatedJsonSchema = useMemo(() => {
    const properties: { [key: string]: any } = {};
    const required: string[] = [];

    fields.forEach((f) => {
      if (f.required) required.push(f.name);

      if (f.type === 'string') {
        properties[f.name] = { type: 'string', description: f.description };
      } else if (f.type === 'number') {
        properties[f.name] = { type: 'number', description: f.description };
      } else if (f.type === 'boolean') {
        properties[f.name] = { type: 'boolean', description: f.description };
      } else if (f.type === 'array_string') {
        properties[f.name] = {
          type: 'array',
          items: { type: 'string' },
          description: f.description,
        };
      } else if (f.type === 'enum') {
        properties[f.name] = {
          type: 'string',
          enum: (f.enumValues || '').split(',').map((v) => v.trim()).filter(Boolean),
          description: f.description,
        };
      }
    });

    return JSON.stringify(
      {
        type: 'object',
        name: schemaName,
        strict: true,
        properties,
        required,
        additionalProperties: false,
      },
      null,
      2
    );
  }, [schemaName, fields]);

  const generatedPythonSdk = useMemo(() => {
    return `from openai import OpenAI
${generatedPydantic}

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# 100% Guaranteed Strict JSON Schema Constrained Decoding
completion = client.beta.chat.completions.parse(
    model="gpt-5.6-sol",
    messages=[
        {"role": "system", "content": "Extract structured records strictly matching schema."},
        {"role": "user", "content": "Raw document or prompt text goes here..."}
    ],
    response_format=${schemaName},
)

record: ${schemaName} = completion.choices[0].message.parsed
print(record)`;
  }, [generatedPydantic, schemaName]);

  const currentCode = useMemo(() => {
    if (activeTab === 'pydantic') return generatedPydantic;
    if (activeTab === 'zod') return generatedZod;
    if (activeTab === 'json_schema') return generatedJsonSchema;
    return generatedPythonSdk;
  }, [activeTab, generatedPydantic, generatedZod, generatedJsonSchema, generatedPythonSdk]);

  const handleCopyCode = async () => {
    const ok = await safeCopyToClipboard(currentCode);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const toolFaqs = [
    {
      q: 'How does GALXAI guarantee 100% valid JSON adherence?',
      a: 'GALXAI enforces strict Context-Free Grammar (CFG) token masks at the sampling layer, mathematically eliminating illegal tokens and guaranteeing 0% parse failures.',
    },
    {
      q: 'Does client.beta.chat.completions.parse work with GALXAI?',
      a: 'Yes. GALXAI provides 100% wire-compatibility with the official OpenAI SDK parse methods in both Python and TypeScript.',
    },
    {
      q: 'Can I use optional fields and nested enums?',
      a: 'Yes. The schema generator creates compliant Pydantic, Zod, and JSON Schema objects conforming to OpenAI strict structured output rules.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs
          items={[
            { label: 'Tools', href: '/calculator' },
            { label: 'JSON Schema to Zod & Pydantic Generator' },
          ]}
        />

        {/* Hero Section with AEO Inverted Pyramid Lead */}
        <section id="tool-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-cyan-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <Binary className="w-3.5 h-3.5" />
              <span>STRUCTURED OUTPUT SCHEMA GENERATOR</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Tool"
              title="GALXAI JSON Schema to Zod & Pydantic Generator"
              description="Build strict JSON Schema, Pydantic v2, and Zod models with 1-click OpenAI structured output integration."
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            JSON Schema to Zod &amp; Pydantic Studio
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            Visually design strongly-typed structured schemas and export ready-to-run Pydantic v2, Zod, and OpenAI strict JSON Schema code with 100% parse guarantees.
          </p>
        </section>

        {/* Interactive Visual Builder vs Generated Output */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Visual Field Builder */}
          <section id="schema-builder" className="lg:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 space-y-5 border border-white/10">
            <div className="space-y-1 border-b border-white/10 pb-3">
              <span className="text-[10px] font-mono uppercase font-bold text-amber-400">Step 1: Define Fields</span>
              <h2 className="text-lg font-bold text-white font-mono">Visual Schema Designer</h2>
            </div>

            {/* Schema Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400 uppercase block">Model / Class Name</label>
              <input
                type="text"
                value={schemaName}
                onChange={(e) => setSchemaName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                className="w-full p-2.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-xs focus:outline-none"
              />
            </div>

            {/* Fields List */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {fields.map((field) => (
                <div key={field.id} className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => updateField(field.id, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                      className="p-1.5 rounded-lg bg-black/70 border border-white/10 text-white font-bold text-xs flex-1 focus:outline-none"
                      placeholder="field_name"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                      className="p-1.5 rounded-lg bg-black/70 border border-white/10 text-cyan-300 text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="array_string">Array[String]</option>
                      <option value="enum">Enum</option>
                    </select>

                    <button
                      onClick={() => removeField(field.id)}
                      disabled={fields.length <= 1}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={field.description}
                    onChange={(e) => updateField(field.id, { description: e.target.value })}
                    className="w-full p-1.5 rounded-lg bg-black/40 border border-white/5 text-zinc-300 text-[11px] focus:outline-none"
                    placeholder="Field description for AI guidance..."
                  />

                  {field.type === 'enum' && (
                    <input
                      type="text"
                      value={field.enumValues || ''}
                      onChange={(e) => updateField(field.id, { enumValues: e.target.value })}
                      className="w-full p-1.5 rounded-lg bg-black/40 border border-amber-500/30 text-amber-300 text-[11px] focus:outline-none"
                      placeholder="Comma-separated enum values (e.g. active, paused)"
                    />
                  )}

                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                        className="accent-cyan-400 rounded cursor-pointer"
                      />
                      <span>Required Field</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addField}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-mono text-xs font-bold flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Schema Field</span>
            </button>
          </section>

          {/* Generated Code Output */}
          <section id="schema-output" className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-cyan-500/30 bg-[#0b0e17] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                {/* Format Switcher Tabs */}
                <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
                  {[
                    { id: 'pydantic', label: 'Pydantic v2' },
                    { id: 'zod', label: 'Zod (TS)' },
                    { id: 'json_schema', label: 'Strict JSON Schema' },
                    { id: 'python_sdk', label: 'Full Python SDK' },
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
              <span>Deploy Schema with $5 Free Compute →</span>
            </Link>
          </section>
        </div>

        {/* AEO Frequently Asked Questions */}
        <section id="tool-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Frequently Asked Questions (Structured Output Schemas)</span>
            </h2>
            <p className="text-xs text-zinc-400">Context-Free Grammar masking, Pydantic integration, and type safety.</p>
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
