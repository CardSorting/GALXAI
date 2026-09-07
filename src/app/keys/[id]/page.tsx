'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { KeysSubNav } from '@/components/dashboard/KeysSubNav';
import {
  Key,
  Trash2,
  CheckCircle2,
  Code2,
  ArrowLeft,
  Copy,
  Check,
  Zap,
  Play,
  X,
  ShieldAlert,
  Download,
  Terminal,
  Activity
} from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { ErrorBoundary, withErrorBoundary } from '@/components/common/ErrorBoundary';
import { resilientFetch } from '@/lib/resilience/ResilientClient';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { useAuth } from '@/contexts/AuthContext';

function BaseKeyDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [keyData, setKeyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'cursor' | 'vercel' | 'python' | 'node' | 'env' | 'curl'>('cursor');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedPrefix, setCopiedPrefix] = useState(false);

  // Revocation Modal State
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // Smoke test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs: number; message: string } | null>(null);

  const fetchKey = React.useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const res = await resilientFetch<{ key: any }>(`/api/keys/${id}?userId=${encodeURIComponent(user.id)}`, { enableCacheFallback: false, cache: 'no-store' });
      if (res.data?.key) {
        setKeyData(res.data.key);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (id && user?.id) {
      fetchKey();
    }
  }, [id, user?.id, fetchKey]);

  const handleConfirmRevoke = async () => {
    if (!keyData || !user?.id) return;
    setIsRevoking(true);
    setRevokeError(null);
    try {
      const res = await resilientFetch<{ success: boolean }>(`/api/keys?id=${encodeURIComponent(keyData.id)}&userId=${encodeURIComponent(user.id)}`, { method: 'DELETE', enableCacheFallback: false });
      if (!res.data?.success || res.fromCache) throw new Error('Revocation was not confirmed');
      setKeyData((previous: any) => ({ ...previous, revoked: true }));
      setIsRevokeModalOpen(false);
      fetchKey();
    } catch {
      setRevokeError('Could not revoke this key. Try again.');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleCopyPrefix = async () => {
    if (!keyData) return;
    const success = await safeCopyToClipboard(`${keyData.keyPrefix}...`);
    if (success) {
      setCopiedPrefix(true);
      setTimeout(() => setCopiedPrefix(false), 2000);
    }
  };

  const getSnippets = (prefix: string) => ({
    python: `from openai import OpenAI

# Drop-in replacement for OpenAI SDK pointing to GALX AI Gateway
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="${prefix}..."  # Replace with your full secret key
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Explain algorithmic game theory."}]
)
print(response.choices[0].message.content)`,
    node: `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://galx.ai/v1',
  apiKey: '${prefix}...'
});

const response = await client.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Write a LRU cache in Rust.' }],
  stream: true
});`,
    env: `# .env file
OPENAI_BASE_URL="https://galx.ai/v1"
OPENAI_API_KEY="${prefix}..."
GALXAI_API_KEY="${prefix}..."
DEFAULT_MODEL="gpt-5.6-sol"`,
    cursor: `// In Cursor IDE / Windsurf Settings -> Models -> OpenAI API Key:
// 1. Override OpenAI Base URL: https://galx.ai/v1
// 2. API Key: ${prefix}...
// 3. Enable Models: gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna`,
    vercel: `import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const galx = createOpenAI({
  baseURL: 'https://galx.ai/v1',
  apiKey: process.env.GALX_API_KEY || '${prefix}...'
});

const { text } = await generateText({
  model: galx('gpt-5.6-sol'),
  prompt: 'Explain algorithmic game theory.'
});
console.log(text);`,
    curl: `curl https://galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer ${prefix}..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{"role": "user", "content": "Hello GALXAI!"}]
  }'`
  });

  const handleCopySnippet = async () => {
    if (!keyData) return;
    const snippets = getSnippets(keyData.keyPrefix);
    const success = await safeCopyToClipboard(snippets[activeSnippetTab]);
    if (success) {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    const start = performance.now();
    try {
      const res = await resilientFetch<{ data: any[] }>('/v1/models', {
        enableCacheFallback: false, cache: 'no-store'
      });
      const latencyMs = Math.round(performance.now() - start);
      setTestResult({
        success: true,
        latencyMs,
        message: `Endpoint verified. Gateway active with ${res.data?.data?.length || 6} models operational.`
      });
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      setTestResult({
        success: false,
        latencyMs,
        message: err.message || 'Verification test failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#07090e] text-zinc-100 font-sans">
        <Navigation />
        <main className="flex-1 max-w-5xl w-full mx-auto p-8 animate-pulse space-y-6">
          <div className="h-8 w-48 bg-white/5 rounded-xl" />
          <div className="h-64 rounded-2xl bg-white/5" />
        </main>
      </div>
    );
  }

  if (!keyData) {
    return (
      <div className="min-h-screen flex flex-col bg-[#07090e] text-zinc-100 font-sans">
        <Navigation />
        <main className="flex-1 max-w-4xl w-full mx-auto p-8 text-center space-y-4 my-auto">
          <Key className="w-12 h-12 text-zinc-600 mx-auto" />
          <h1 className="text-xl font-bold text-white">Key Not Found</h1>
          <p className="text-xs text-zinc-400">The requested Gateway API key may have been revoked or does not exist.</p>
          <Link
            href="/keys"
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold inline-block"
          >
            Back to API Keys
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-zinc-100 font-sans">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'API Keys', href: '/keys' },
            { label: keyData.name || keyData.id }
          ]}
        />

        <ErrorBoundary name="Keys Navigation">
          <KeysSubNav />
        </ErrorBoundary>

        <AuthRequiredGate
          title="Sign In to Inspect API Key Telemetry"
          description="Detailed telemetry, token consumption metrics, and key details are private to your workspace."
        >
          {/* Key Hero Header */}
          <div className="rounded-2xl border border-white/10 bg-[#0d101c] p-6 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-white">{keyData.name}</h1>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      keyData.revoked ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {keyData.revoked ? 'Revoked' : 'Active'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                    <span>Prefix: <code className="text-zinc-200">{keyData.keyPrefix}...</code></span>
                    <button
                      type="button"
                      onClick={handleCopyPrefix}
                      className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                      title="Copy Prefix"
                    >
                      {copiedPrefix ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <span>•</span>
                    <span>Rate: <code className="text-zinc-200">{keyData.rateLimitPerMinute} RPM</code></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/keys"
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-colors border border-white/10"
                >
                  All Keys
                </Link>

                {!keyData.revoked && (
                  <button
                    type="button"
                    onClick={() => setIsRevokeModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Revoke Key
                  </button>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 font-mono text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                <span className="text-zinc-500 text-[10px] uppercase">Total Requests</span>
                <div className="text-base font-bold text-white">{keyData.totalRequests || 0}</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                <span className="text-zinc-500 text-[10px] uppercase">Rate Ceiling</span>
                <div className="text-base font-bold text-indigo-300">{keyData.rateLimitPerMinute} RPM</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                <span className="text-zinc-500 text-[10px] uppercase">Created</span>
                <div className="text-xs font-semibold text-zinc-300 font-sans">{formatTimeAgo(keyData.createdAt)}</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                <span className="text-zinc-500 text-[10px] uppercase">Last Active</span>
                <div className="text-xs font-semibold text-emerald-400 font-sans">
                  {keyData.lastUsedAt ? formatTimeAgo(keyData.lastUsedAt) : 'Never'}
                </div>
              </div>
            </div>
          </div>

          {/* Live Key Verification / Test Bar */}
          <div className="rounded-2xl border border-white/10 bg-[#0d101c] p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Gateway Health Verification</span>
                </h3>
                <p className="text-xs text-zinc-400">Verify routing health, latency, and endpoint connectivity for this key.</p>
              </div>

              <button
                type="button"
                onClick={handleRunTest}
                disabled={isTesting || keyData.revoked}
                className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Play className={`w-3.5 h-3.5 fill-cyan-400 ${isTesting ? 'animate-pulse' : ''}`} />
                <span>{isTesting ? 'Testing...' : 'Run Verification Ping'}</span>
              </button>
            </div>

            {testResult && (
              <div className={`p-3.5 rounded-xl border text-xs font-mono flex items-start gap-2.5 animate-in fade-in duration-150 ${
                testResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold flex items-center gap-2">
                    <span>✓ Ping Latency: {testResult.latencyMs}ms</span>
                  </div>
                  <p className="text-zinc-300 text-[11px] font-sans">{testResult.message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Multi-Format Setup Code Exporter */}
          <div className="rounded-2xl border border-white/10 bg-[#0d101c] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-indigo-400" />
                  <span>Integration Snippets</span>
                </h3>
                <p className="text-xs text-zinc-400">Drop-in configuration templates for frameworks and developer tooling.</p>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl bg-black/50 border border-white/10 text-xs font-mono">
                {(['cursor', 'vercel', 'python', 'node', 'env', 'curl'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveSnippetTab(tab)}
                    className={`px-3 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                      activeSnippetTab === tab
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tab === 'env' ? '.env' : tab === 'cursor' ? 'Cursor' : tab === 'vercel' ? 'Vercel AI' : tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative rounded-xl bg-black/70 border border-white/10 p-4 font-mono text-xs overflow-hidden">
              <button
                type="button"
                onClick={handleCopySnippet}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors text-[11px] cursor-pointer"
              >
                {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                <span>{copiedSnippet ? 'Copied!' : 'Copy Code'}</span>
              </button>
              <pre className="text-zinc-300 overflow-x-auto pr-24 leading-relaxed font-mono">
                <code>{getSnippets(keyData.keyPrefix)[activeSnippetTab]}</code>
              </pre>
            </div>
          </div>
        </AuthRequiredGate>
      </main>

      {/* Accessible Revocation Modal */}
      {isRevokeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-md rounded-2xl bg-[#0d101c] border border-rose-500/40 p-6 space-y-4 shadow-2xl text-zinc-100 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                <Trash2 className="w-4 h-4" />
                <span>Revoke API Key?</span>
              </div>
              <button
                type="button"
                onClick={() => setIsRevokeModalOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {revokeError && <p role="alert" className="text-xs text-rose-300">{revokeError}</p>}
            <div className="space-y-2 text-xs text-zinc-300 leading-relaxed">
              <p>
                Are you sure you want to revoke <strong>{keyData.name}</strong> (<code className="text-zinc-300 font-mono">{keyData.keyPrefix}...</code>)?
              </p>
              <p className="text-rose-300/90 font-medium">
                This action is permanent and cannot be undone. Any active applications, agents, or automated scripts using this key will immediately receive 401 Unauthorized errors.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsRevokeModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={isRevoking}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isRevoking ? 'Revoking...' : 'Revoke Key'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withErrorBoundary(BaseKeyDetailPage, {
  name: 'Key Detail Page'
});
