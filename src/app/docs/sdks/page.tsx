import React from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { Code2, Layers, Zap, Terminal } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Python & Node.js SDK Integration | GALXAI Docs',
  description: 'Complete SDK integration guide for OpenAI Python client, openai-node, LangChain, and LlamaIndex.',
};

export default function SdksDocPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'SDK Integration (Python & Node.js)' }
          ]}
        />

        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Code2 className="w-3.5 h-3.5" />
            <span>OFFICIAL SDK INTEGRATION</span>
          </div>
          <h1 className="text-3xl font-black text-white">SDKs & Client Libraries</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            GALXAI is 100% compliant with standard OpenAI client protocols. You do not need to install any custom packages—use your favorite client libraries directly.
          </p>
        </div>

        {/* Python */}
        <section className="glass-panel rounded-3xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-white">Python (openai &gt;= 1.0.0)</h2>
          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-zinc-200 border border-white/10 overflow-x-auto selection:bg-cyan-500 selection:text-black">
            <code>{`from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="galx_live_your_gateway_key"
)

# Call GPT-5.6 Sol or xAI Grok 4.5
stream = client.chat.completions.create(
    model="gpt-5.6-sol", # or "x-ai/grok-4.5"
    messages=[{"role": "user", "content": "Refactor this function."}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)`}</code>
          </pre>
        </section>

        {/* Node.js / TypeScript */}
        <section className="glass-panel rounded-3xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-white">TypeScript & Node.js</h2>
          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-zinc-200 border border-white/10 overflow-x-auto selection:bg-indigo-500 selection:text-white">
            <code>{`import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:3000/v1',
  apiKey: 'galx_live_your_gateway_key'
});

async function run() {
  const stream = await openai.chat.completions.create({
    model: 'x-ai/grok-4.5',
    messages: [{ role: 'user', content: 'Design a distributed rate governor.' }],
    stream: true
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
}

run();`}</code>
          </pre>
        </section>
      </main>
    </div>
  );
}
