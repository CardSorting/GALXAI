'use client';

import React, { useState } from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { DocsFeedback } from '@/components/dashboard/DocsFeedback';
import {
  Code2,
  Copy,
  Check,
  Database,
} from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

export function EmbeddingsClient() {
  const [activeTab, setActiveTab] = useState<'python' | 'ts' | 'pgvector' | 'langchain'>('python');
  const [copiedKey, setCopiedKey] = useState(false);

  const recipes = {
    python: {
      title: 'Python + NumPy Cosine Similarity',
      code: `from openai import OpenAI
import numpy as np

client = OpenAI(
    base_url="https://galx.ai/v1",
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
query_res = client.embeddings.create(model="text-embedding-3-small", input="What is GALXAI?")
query_vec = np.array(query_res.data[0].embedding)

for i, doc_vec in enumerate(embeddings):
    similarity = np.dot(query_vec, doc_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(doc_vec))
    print(f"Doc {i+1} Similarity: {similarity:.4f} -> {documents[i]}")`,
    },
    ts: {
      title: 'TypeScript / Node Vector Generation',
      code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY || "galx_live_your_gateway_key",
});

const response = await client.embeddings.create({
  model: "text-embedding-3-small",
  input: ["Vector search indexing", "Observed inference latency"],
  dimensions: 1536,
});

console.log("Vector count:", response.data.length);
console.log("Vector dimensions:", response.data[0].embedding.length);`,
    },
    pgvector: {
      title: 'PostgreSQL pgvector HNSW Indexing & Search',
      code: `-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create documents table with 1536-dim vector column
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(1536)
);

-- 3. Create HNSW Cosine Similarity index for sub-millisecond search
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Perform Top-K nearest neighbors semantic search
SELECT id, content, 1 - (embedding <=> $1::vector) AS similarity
FROM documents
ORDER BY embedding <=> $1::vector
LIMIT 5;`,
    },
    langchain: {
      title: 'LangChain OpenAIEmbeddings Integration',
      code: `from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",
    openai_api_base="https://galx.ai/v1",
    openai_api_key="galx_live_your_gateway_key"
)

texts = [
    "GALXAI exposes model-specific cache usage and rates.",
    "Stateless and durable inference have explicit retention modes."
]

vectorstore = FAISS.from_texts(texts, embedding=embeddings)
results = vectorstore.similarity_search("How much does caching save?", k=1)
print(results[0].page_content)`,
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
            { label: 'API & Cookbooks', href: '/docs/api-reference' },
            { label: 'Vector Embeddings & Semantic Search' },
          ]}
        />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <Database className="w-3.5 h-3.5" />
              <span>HIGH-THROUGHPUT BATCHING (2,048 VECTORS/REQ)</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Vector Embeddings &amp; Semantic Search Guide</h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-3xl font-sans">
            High-throughput vector embeddings generation for RAG pipelines, PostgreSQL pgvector indexing, and semantic similarity search with 1,536 and 3,072 dimensions.
          </p>
        </div>

        <DocsSubNav />

        {/* Founding Cohort Rate Lock Ribbon */}

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
            <div className="text-[11px] text-zinc-400 font-sans">Check the live model catalog for current rates</div>
          </div>
        </div>

        {/* Tabbed Recipes Workbench */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4 font-mono text-xs">
            {(['python', 'ts', 'pgvector', 'langchain'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl font-bold uppercase transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab === 'python' ? '🐍 Python + NumPy' : tab === 'ts' ? '▲ TypeScript / Node' : tab === 'pgvector' ? '🐘 PostgreSQL pgvector' : '🦜🔗 LangChain'}
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

        {/* Consumer-Grade Trust Seals */}

        <DocsFeedback docTitle="Vector Embeddings &amp; Semantic Search Guide" />
      </main>

      {/* Floating Conversion Dock, Live Activity Toast & Exit Intent Modal */}
    </div>
  );
}
