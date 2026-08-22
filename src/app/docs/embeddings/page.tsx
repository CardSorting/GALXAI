'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { DocsFeedback } from '@/components/dashboard/DocsFeedback';
import {
  Layers,
  Code2,
  Copy,
  Check,
  CheckCircle2,
  Zap,
  Terminal,
  ArrowRight,
  Database
} from 'lucide-react';

export default function EmbeddingsDocsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const pythonSnippet = `from openai import OpenAI
import numpy as np

client = OpenAI(
    base_url="https://api.galxai.com/v1",
    api_key="galx_live_your_gateway_key"
)

# 1. Generate Batch Embeddings (up to 2,048 strings per request)
documents = [
    "GALXAI is a high-throughput universal AI model gateway.",
    "PostgreSQL pgvector enables fast HNSW cosine distance queries.",
    "LangGraph coordinates cyclic multi-agent autonomous graphs."
]

response = client.embeddings.create(
    model="text-embedding-3-small",
    input=documents
)

embeddings = [data.embedding for data in response.data]
print(f"Generated {len(embeddings)} vectors with dimension {len(embeddings[0])}.")

# 2. Compute Cosine Similarity
query_response = client.embeddings.create(
    model="text-embedding-3-small",
    input="What is GALXAI?"
)
query_vec = np.array(query_response.data[0].embedding)

for i, doc_vec in enumerate(embeddings):
    similarity = np.dot(query_vec, doc_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(doc_vec))
    print(f"Document {i+1} Similarity: {similarity:.4f} -> {documents[i]}")`;

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
            { label: 'Vector Embeddings & Semantic Search' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Vector Embeddings & Semantic Search Guide</h1>
            <p className="text-xs text-zinc-400">
              High-throughput vector embeddings generation for RAG pipelines, pgvector indexing, and semantic similarity search.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              <span>HIGH-THROUGHPUT BATCHING</span>
            </span>
          </div>
        </div>

        <DocsSubNav />

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-cyan-500/30 bg-cyan-500/5">
            <span className="text-cyan-400 text-[10px] uppercase font-sans font-semibold">Batch Input Ceiling</span>
            <div className="text-2xl font-black text-cyan-300">2,048 Inputs</div>
            <div className="text-[11px] text-cyan-400 font-sans">Single HTTP request vectorization</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-emerald-500/30 bg-emerald-500/5">
            <span className="text-emerald-400 text-[10px] uppercase font-sans font-semibold">Dimension Output</span>
            <div className="text-2xl font-black text-emerald-300">1,536 / 3,072-dim</div>
            <div className="text-[11px] text-emerald-400 font-sans">Full precision floating point vectors</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-white/10">
            <span className="text-zinc-500 text-[10px] uppercase font-sans">Cost Efficiency</span>
            <div className="text-2xl font-black text-white">$0.020 / M</div>
            <div className="text-[11px] text-zinc-400 font-sans">25% wholesale discount applied</div>
          </div>
        </div>

        {/* Python Vector Pipeline Snippet */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Code2 className="w-4 h-4 text-amber-400" />
              Python Batch Embeddings & Cosine Similarity Pipeline
            </h2>
            <button
              onClick={() => handleCopy(pythonSnippet, 'python')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5"
            >
              {copiedSection === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'python' ? 'Copied' : 'Copy Snippet'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-cyan-300 border border-white/5 overflow-x-auto">
            <code>{pythonSnippet}</code>
          </pre>
        </div>

        <DocsFeedback docTitle="Vector Embeddings & Semantic Search Guide" />
      </main>
    </div>
  );
}
