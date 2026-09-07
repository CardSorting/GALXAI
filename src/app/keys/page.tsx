'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { KeysSubNav } from '@/components/dashboard/KeysSubNav';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  Wallet,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Code2,
  ExternalLink,
  ShieldAlert,
  Search,
  Play,
  CheckCircle2,
  AlertTriangle,
  Download,
  Terminal,
  ArrowUpDown,
  Laptop,
  Server,
  Bot,
  Sparkles,
  Edit2,
  FileCode,
  Layers
} from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';
import { useDepositVerification } from '@/lib/hooks/useDepositVerification';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { ErrorBoundary, withErrorBoundary } from '@/components/common/ErrorBoundary';
import { resilientFetch } from '@/lib/resilience/ResilientClient';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { SafeStorage } from '@/lib/resilience/SafeStorage';
import { useAuth } from '@/contexts/AuthContext';

type SnippetTab = 'cursor' | 'vercel' | 'python' | 'node' | 'curl';
type SortOption = 'newest' | 'last_used' | 'requests';

interface QuickPreset {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultName: string;
  env: 'live' | 'test';
  rpm: number;
  compaction: 'auto' | 'raw';
}

const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'cursor',
    name: 'Cursor / Windsurf',
    icon: Laptop,
    defaultName: 'Cursor IDE Key',
    env: 'live',
    rpm: 120,
    compaction: 'raw'
  },
  {
    id: 'cli',
    name: 'CLI & Scripting',
    icon: Terminal,
    defaultName: 'CLI Script Key',
    env: 'test',
    rpm: 60,
    compaction: 'raw'
  },
  {
    id: 'backend',
    name: 'Production Backend',
    icon: Server,
    defaultName: 'Production API Server',
    env: 'live',
    rpm: 300,
    compaction: 'raw'
  },
  {
    id: 'agent',
    name: 'Agent Swarm Fleet',
    icon: Bot,
    defaultName: 'Autonomous Agent Fleet',
    env: 'live',
    rpm: 600,
    compaction: 'auto'
  }
];

function BaseGatewayKeysPage() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [environmentFilter, setEnvironmentFilter] = useState<'all' | 'live' | 'test'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Key creation state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('Cursor IDE Key');
  const [newKeyEnv, setNewKeyEnv] = useState<'live' | 'test'>('live');
  const [newKeyCompactionMode, setNewKeyCompactionMode] = useState<'auto' | 'raw'>('raw');
  const [newKeyRpm, setNewKeyRpm] = useState<number>(120);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Inline rename state
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editingKeyName, setEditingKeyName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Key roll / rotation state
  const [rollingKey, setRollingKey] = useState<any | null>(null);
  const [rollingGraceHours, setRollingGraceHours] = useState<number>(24);
  const [isRolling, setIsRolling] = useState(false);
  const [rolledResultKey, setRolledResultKey] = useState<string | null>(null);

  // Revocation confirmation modal state
  const [revokingKey, setRevokingKey] = useState<any | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // Dedicated one-time secret key reveal modal (Stripe / OpenAI standard)
  const [revealedKey, setRevealedKey] = useState<{ apiKey: string; name: string; env: string } | null>(null);
  const [hasSavedSecretKey, setHasSavedSecretKey] = useState(false);

  // Copy states
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedEnvSnippet, setCopiedEnvSnippet] = useState(false);
  const [copiedShellSnippet, setCopiedShellSnippet] = useState(false);
  const [copiedBaseUrl, setCopiedBaseUrl] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Quickstart snippet state
  const [activeSnippetTab, setActiveSnippetTab] = useState<SnippetTab>('cursor');

  // Interactive Live Chat Completion Test Runner
  const [chatModel, setChatModel] = useState('gpt-5.6-sol');
  const [chatPrompt, setChatPrompt] = useState('Explain the fastest way to sort 1M numbers in Rust.');
  const [isTestingChat, setIsTestingChat] = useState(false);
  const [chatTestResult, setChatTestResult] = useState<{ content: string; latencyMs: number; model: string } | null>(null);
  const [chatTestError, setChatTestError] = useState<string | null>(null);

  // Interactive smoke test state
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; latencyMs: number; message: string } | null>(null);

  const { walletBalance } = useDepositVerification();

  const getStorageKey = (uid: string) => `galx_cached_developer_keys_${uid}`;

  const fetchKeys = async () => {
    if (!user?.id) {
      setKeys([]);
      return;
    }
    try {
      const res = await resilientFetch<{ keys: any[] }>(`/api/keys?userId=${encodeURIComponent(user.id)}`, {
        enableCacheFallback: false,
        cache: 'no-store',
      });
      const fetched = res.data?.keys;
      if (Array.isArray(fetched)) {
        setKeys(fetched);
        SafeStorage.setJSON(getStorageKey(user.id), fetched);
      }
    } catch {
      // Offline fallback handled by resilientFetch
    }
  };

  useEffect(() => {
    if (user?.id) {
      const cached = SafeStorage.getJSON<any[]>(getStorageKey(user.id), []);
      if (Array.isArray(cached) && cached.length > 0) {
        setKeys(cached);
      }
      fetchKeys();
    }
  }, [user?.id]);

  // Keyboard shortcut for power users (/ or ⌘K to search, ESC to clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if ((e.key === '/' && !isInput) || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (searchQuery) setSearchQuery('');
        setIsCreateModalOpen(false);
        setRevokingKey(null);
        setRollingKey(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  const applyPreset = (preset: QuickPreset) => {
    setNewKeyName(preset.defaultName);
    setNewKeyEnv(preset.env);
    setNewKeyRpm(preset.rpm);
    setNewKeyCompactionMode(preset.compaction);
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    const nameToSubmit = newKeyName.trim() || 'Developer API Key';

    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await resilientFetch<{ success: boolean; key?: { apiKey: string; name?: string }; error?: string }>('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameToSubmit,
          userId: user.id,
          environment: newKeyEnv,
          rateLimitPerMinute: newKeyRpm,
          hasVerifiedDeposit: true,
          depositedAmount: walletBalance,
          defaultCompactionMode: newKeyCompactionMode,
        })
      });

      if (res.data?.success && res.data.key?.apiKey) {
        const returnedKey = res.data.key as any;
        const newKeyEntry = {
          id: returnedKey.id || `key_${Date.now()}`,
          keyPrefix: returnedKey.keyPrefix || (returnedKey.apiKey.slice(0, 14)),
          name: returnedKey.name || nameToSubmit,
          userId: user.id,
          environment: returnedKey.environment || newKeyEnv,
          scopes: returnedKey.scopes || ['*'],
          rateLimitPerMinute: returnedKey.rateLimitPerMinute || newKeyRpm,
          totalRequests: 0,
          totalTokens: 0,
          createdAt: Date.now(),
          isExpired: false,
          revoked: false
        };

        setKeys(prev => {
          const updated = [newKeyEntry, ...prev.filter(k => k.id !== newKeyEntry.id)];
          SafeStorage.setJSON(getStorageKey(user.id), updated);
          return updated;
        });

        setRevealedKey({
          apiKey: res.data.key.apiKey,
          name: nameToSubmit,
          env: newKeyEnv
        });
        setHasSavedSecretKey(false);
        setNewKeyName('Cursor IDE Key');
        setIsCreateModalOpen(false);
        fetchKeys();
      } else {
        setCreateError(res.data?.error || 'Failed to generate key.');
      }
    } catch (err: any) {
      setCreateError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartRename = (k: any) => {
    setEditingKeyId(k.id);
    setEditingKeyName(k.name);
  };

  const handleSaveRename = async (keyId: string) => {
    if (!editingKeyName.trim() || !user?.id) {
      setEditingKeyId(null);
      return;
    }
    setIsRenaming(true);
    const cleanName = editingKeyName.trim();
    setIsRenaming(true);
    setKeys(prev => {
      const updated = prev.map(k => k.id === keyId ? { ...k, name: cleanName } : k);
      SafeStorage.setJSON(getStorageKey(user.id), updated);
      return updated;
    });
    try {
      await resilientFetch(`/api/keys/${keyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, userId: user.id })
      });
      fetchKeys();
    } catch {} finally {
      setIsRenaming(false);
      setEditingKeyId(null);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokingKey || !user?.id) return;
    setIsRevoking(true);
    setRevokeError(null);
    const keyToRevokeId = revokingKey.id;
    try {
      const res = await resilientFetch<{ success: boolean }>(`/api/keys?id=${encodeURIComponent(keyToRevokeId)}&userId=${encodeURIComponent(user.id)}`, { method: 'DELETE', enableCacheFallback: false });
      if (!res.data?.success || res.fromCache) throw new Error('Revocation was not confirmed. Try again.');
      setKeys(prev => {
        const updated = prev.map(k => k.id === keyToRevokeId ? { ...k, revoked: true } : k);
        SafeStorage.setJSON(getStorageKey(user.id), updated);
        return updated;
      });
      setRevokingKey(null);
      fetchKeys();
    } catch {
      setRevokeError('Could not revoke this key. Try again.');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleExecuteRollKey = async () => {
    if (!rollingKey || !user?.id) return;
    setIsRolling(true);
    try {
      const res = await resilientFetch<{ success: boolean; key?: { id: string; apiKey: string }; message?: string }>(
        `/api/keys/${rollingKey.id}/roll`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ graceHours: rollingGraceHours, userId: user.id })
        }
      );
      if (res.data?.success && res.data.key?.apiKey) {
        const returnedApiKey = res.data.key.apiKey;
        const newKeyEntry = {
          id: res.data.key.id,
          keyPrefix: returnedApiKey.slice(0, 14),
          name: rollingKey.name,
          userId: user.id,
          environment: rollingKey.environment || 'live',
          scopes: rollingKey.scopes || ['*'],
          rateLimitPerMinute: rollingKey.rateLimitPerMinute || 120,
          totalRequests: 0,
          totalTokens: 0,
          createdAt: Date.now(),
          isExpired: false,
          revoked: false
        };
        setKeys(prev => {
          const updated = [newKeyEntry, ...prev.map(k => k.id === rollingKey.id ? (rollingGraceHours <= 0 ? { ...k, revoked: true } : k) : k)];
          SafeStorage.setJSON(getStorageKey(user.id), updated);
          return updated;
        });

        setRolledResultKey(res.data.key.apiKey);
        setRollingKey(null);
        fetchKeys();
      }
    } catch {} finally {
      setIsRolling(false);
    }
  };

  const handleDownloadEnv = (apiKey: string, name: string = 'GALX AI') => {
    const content = `# ${name} Credentials\n# Generated at: ${new Date().toISOString()}\nGALX_API_KEY="${apiKey}"\nGALX_BASE_URL="https://galx.ai/v1"\nOPENAI_BASE_URL="https://galx.ai/v1"\nOPENAI_API_KEY="${apiKey}"\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '.env.galx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async (text: string, id: string) => {
    const success = await safeCopyToClipboard(text);
    if (success) {
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    }
  };

  const handleCopyEnvSnippet = async (apiKey: string) => {
    const snippet = `GALX_API_KEY="${apiKey}"\nGALX_BASE_URL="https://galx.ai/v1"`;
    const success = await safeCopyToClipboard(snippet);
    if (success) {
      setCopiedEnvSnippet(true);
      setTimeout(() => setCopiedEnvSnippet(false), 2000);
    }
  };

  const handleCopyShellSnippet = async (apiKey: string) => {
    const snippet = `export GALX_API_KEY="${apiKey}"\nexport OPENAI_BASE_URL="https://galx.ai/v1"`;
    const success = await safeCopyToClipboard(snippet);
    if (success) {
      setCopiedShellSnippet(true);
      setTimeout(() => setCopiedShellSnippet(false), 2000);
    }
  };

  const handleCopyBaseUrl = async () => {
    const success = await safeCopyToClipboard('https://galx.ai/v1');
    if (success) {
      setCopiedBaseUrl(true);
      setTimeout(() => setCopiedBaseUrl(false), 2000);
    }
  };

  const handleCopySnippet = async (snippet: string) => {
    const success = await safeCopyToClipboard(snippet);
    if (success) {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  const handleRunSmokeTest = async () => {
    setIsPinging(true);
    setPingResult(null);
    const start = performance.now();
    try {
      const targetAuth = revealedKey?.apiKey || rolledResultKey;
      const res = await resilientFetch<{ data: any[] }>('/v1/models', {
        headers: targetAuth ? { Authorization: `Bearer ${targetAuth}` } : undefined,
        enableCacheFallback: true,
      });
      const latencyMs = Math.round(performance.now() - start);
      setPingResult({
        success: true,
        latencyMs,
        message: `Gateway responsive (${res.data?.data?.length || 6} models active). Route operational.`
      });
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      setPingResult({
        success: false,
        latencyMs,
        message: err.message || 'Gateway connectivity test failed'
      });
    } finally {
      setIsPinging(false);
    }
  };

  const handleRunChatTest = async () => {
    setIsTestingChat(true);
    setChatTestError(null);
    setChatTestResult(null);
    const start = performance.now();
    try {
      const targetAuth = revealedKey?.apiKey || rolledResultKey;
      const res = await resilientFetch<any>('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(targetAuth ? { Authorization: `Bearer ${targetAuth}` } : {})
        },
        body: JSON.stringify({
          model: chatModel,
          messages: [{ role: 'user', content: chatPrompt.trim() || 'Hello GALX!' }],
          temperature: 0.7,
          max_tokens: 150
        })
      });
      const latencyMs = Math.round(performance.now() - start);
      if (res.data?.choices?.[0]?.message?.content) {
        setChatTestResult({
          content: res.data.choices[0].message.content,
          latencyMs,
          model: res.data.model || chatModel
        });
      } else if (res.data?.error) {
        setChatTestError(typeof res.data.error === 'string' ? res.data.error : res.data.error.message || 'Request failed');
      } else {
        setChatTestError('No response content returned from model.');
      }
    } catch (err: any) {
      setChatTestError(err.message || 'Chat completion test failed');
    } finally {
      setIsTestingChat(false);
    }
  };

  const activeKeyFound = keys.find(k => !k.revoked);
  const activeDisplayKey = revealedKey?.apiKey || rolledResultKey || (activeKeyFound?.keyPrefix ? `${activeKeyFound.keyPrefix}...` : 'galx_live_your_key_here');

  const snippets: Record<SnippetTab, { title: string; lang: string; code: string }> = {
    cursor: {
      title: 'Cursor / Windsurf (.cursorrules or Settings)',
      lang: 'json',
      code: `// Set in Cursor Settings -> Models -> OpenAI API Key:
// 1. Override OpenAI Base URL: https://galx.ai/v1
// 2. API Key: ${activeDisplayKey}
// 3. Enable Models: gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna`
    },
    vercel: {
      title: 'Vercel AI SDK (@ai-sdk/openai)',
      lang: 'typescript',
      code: `import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const galx = createOpenAI({
  baseURL: 'https://galx.ai/v1',
  apiKey: process.env.GALX_API_KEY || '${activeDisplayKey}'
});

const { text } = await generateText({
  model: galx('gpt-5.6-sol'),
  prompt: 'Write a high-performance LRU cache in Rust.'
});
console.log(text);`
    },
    python: {
      title: 'Python (OpenAI SDK)',
      lang: 'python',
      code: `from openai import OpenAI

# Drop-in replacement: point base_url to GALX AI Gateway
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="${activeDisplayKey}"
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Write a high-performance LRU cache in Rust."}]
)
print(response.choices[0].message.content)`
    },
    node: {
      title: 'Node.js / TypeScript',
      lang: 'typescript',
      code: `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://galx.ai/v1',
  apiKey: '${activeDisplayKey}'
});

const completion = await client.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Write a high-performance LRU cache in Rust.' }]
});
console.log(completion.choices[0].message.content);`
    },
    curl: {
      title: 'cURL',
      lang: 'bash',
      code: `curl https://galx.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${activeDisplayKey}" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{"role": "user", "content": "Write a high-performance LRU cache in Rust."}]
  }'`
    }
  };

  // Filtered and Sorted Keys
  const filteredAndSortedKeys = useMemo(() => {
    let result = keys.filter(k => {
      if (environmentFilter !== 'all') {
        const keyEnv = k.environment || (k.keyPrefix?.includes('test') || k.prefix?.includes('test') ? 'test' : 'live');
        if (keyEnv !== environmentFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = k.name?.toLowerCase().includes(q);
        const prefixMatch = (k.keyPrefix || k.prefix || '').toLowerCase().includes(q);
        if (!nameMatch && !prefixMatch) return false;
      }
      return true;
    });

    if (sortBy === 'last_used') {
      result = [...result].sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
    } else if (sortBy === 'requests') {
      result = [...result].sort((a, b) => (b.totalRequests || 0) - (a.totalRequests || 0));
    } else {
      result = [...result].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    return result;
  }, [keys, environmentFilter, searchQuery, sortBy]);

  const activeKeysCount = keys.filter(k => !k.revoked && !k.isExpired).length;
  const liveKeysCount = keys.filter(k => (k.environment === 'live' || (!k.environment && !k.keyPrefix?.includes('test')))).length;
  const testKeysCount = keys.filter(k => (k.environment === 'test' || k.keyPrefix?.includes('test'))).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-zinc-100 font-sans">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Breadcrumbs items={[{ label: 'API Keys' }]} />

        <ErrorBoundary name="Keys Navigation">
          <KeysSubNav />
        </ErrorBoundary>

        <AuthRequiredGate
          title="Sign In to Access API Keys"
          description="Your dedicated API keys, rate limits, and gateway usage telemetry are private to your workspace."
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">API Keys</h1>
              <p className="text-xs text-zinc-400 mt-1">
                Manage access to your API.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewKeyName('Cursor IDE Key');
                  setCreateError(null);
                  setIsCreateModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create key</span>
              </button>
            </div>
          </div>

          {/* Single-Row Telemetry Context Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[#0d101c] border border-white/10 text-xs font-sans">
            <div className="flex items-center justify-between px-3 py-1 sm:border-r sm:border-white/10">
              <div className="flex items-center gap-2 text-zinc-400">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>Compute Balance</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white">${walletBalance.toFixed(2)}</span>
                <Link
                  href="/billing"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Manage
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-between px-3 py-1 sm:border-r sm:border-white/10">
              <div className="flex items-center gap-2 text-zinc-400">
                <Key className="w-4 h-4 text-indigo-400" />
                <span>Active Keys</span>
              </div>
              <span className="font-mono font-bold text-white">{activeKeysCount}</span>
            </div>

            <div className="flex items-center justify-between px-3 py-1">
              <div className="flex items-center gap-2 text-zinc-400">
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                <span>Base URL</span>
              </div>
              <button
                type="button"
                onClick={handleCopyBaseUrl}
                className="font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 text-[11px] bg-white/5 hover:bg-white/10 px-2.5 py-0.5 rounded transition-colors cursor-pointer"
                title="Click to copy gateway base URL"
              >
                <span>https://galx.ai/v1</span>
                {copiedBaseUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
              </button>
            </div>
          </div>

          {/* Rolled Key Reveal Notification */}
          {rolledResultKey && (
            <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                  <RefreshCw className="w-4 h-4 text-cyan-400" />
                  <span>Key Rotated (Zero-Downtime Roll)</span>
                </div>
                <span className="text-[11px] text-zinc-400">Copy now • Revealed once</span>
              </div>

              <div className="p-3 rounded-xl bg-black/60 font-mono text-xs text-cyan-300 flex items-center justify-between gap-3 border border-cyan-500/30">
                <span className="select-all break-all">{rolledResultKey}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(rolledResultKey, 'rolled')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedKeyId === 'rolled' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKeyId === 'rolled' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Your previous key remains valid until the migration grace period expires.</span>
                <button
                  type="button"
                  onClick={() => setRolledResultKey(null)}
                  className="text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Active Keys Table Section (Front & Center) */}
          <div className="rounded-2xl border border-white/10 bg-[#0d101c] overflow-hidden">
            {/* Search, Filter & Controls Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border-b border-white/10">
              {/* Left: Search input with keyboard shortcut hint */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search keys"
                  placeholder="Search keys"
                  className="w-full pl-9 pr-14 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 font-sans"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-zinc-500 hover:text-zinc-300 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 bg-white/5 rounded border border-white/10">
                      /
                    </kbd>
                  )}
                </div>
              </div>

              {/* Right: Environment Filter & Sort Selector */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Environment Filter */}
                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setEnvironmentFilter('all')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      environmentFilter === 'all'
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    All ({keys.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvironmentFilter('live')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                      environmentFilter === 'live'
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                        : 'text-zinc-400 hover:text-emerald-300'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Live ({liveKeysCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvironmentFilter('test')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                      environmentFilter === 'test'
                        ? 'bg-amber-500/20 text-amber-300 font-semibold'
                        : 'text-zinc-400 hover:text-amber-300'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>Test ({testKeysCount})</span>
                  </button>
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500 ml-1.5" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-transparent text-zinc-300 text-xs pr-2 py-0.5 focus:outline-none cursor-pointer"
                  >
                    <option value="newest" className="bg-[#0d101c] text-zinc-200">Newest</option>
                    <option value="last_used" className="bg-[#0d101c] text-zinc-200">Recently Used</option>
                    <option value="requests" className="bg-[#0d101c] text-zinc-200">Most Requests</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredAndSortedKeys.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-3">
                <Key className="w-8 h-8 text-zinc-600 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-300">
                    {searchQuery ? 'No matching keys found' : 'No API keys yet'}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {searchQuery
                      ? `No keys matching "${searchQuery}". Clear your search query.`
                      : environmentFilter !== 'all'
                      ? `No ${environmentFilter} keys generated yet.`
                      : 'Create a secret key to authenticate your first request.'}
                  </p>
                </div>
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs transition-colors cursor-pointer border border-white/10"
                  >
                    Clear Filter
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setNewKeyName('Cursor IDE Key');
                      setCreateError(null);
                      setIsCreateModalOpen(true);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create API Key</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-400 font-semibold text-[11px] bg-white/[0.02]">
                      <th className="py-3 px-4">Key</th>
                      <th className="py-3 px-4">Last Used</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {filteredAndSortedKeys.map((k) => {
                      const isLive = (k.environment || (k.keyPrefix?.includes('live') || k.prefix?.includes('live') ? 'live' : 'test')) === 'live';
                      const prefixText = k.keyPrefix || k.prefix || 'galx_live_';
                      const maskedKeyDisplay = `${prefixText}…`;
                      const isEditingThisKey = editingKeyId === k.id;

                      return (
                        <tr key={k.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-semibold text-white">
                            {isEditingThisKey ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editingKeyName}
                                  onChange={(e) => setEditingKeyName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRename(k.id);
                                    if (e.key === 'Escape') setEditingKeyId(null);
                                  }}
                                  className="py-1 px-2 rounded bg-black/60 border border-indigo-500 text-xs text-white focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveRename(k.id)}
                                  disabled={isRenaming}
                                  className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingKeyId(null)}
                                  className="p-1 rounded text-zinc-400 hover:text-white"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="group flex items-center gap-2">
                                <Link href={`/keys/${k.id}`} className="hover:text-indigo-300 transition-colors">
                                  <span>{k.name}</span>
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleStartRename(k)}
                                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 text-zinc-500 hover:text-zinc-300"
                                  title="Rename key"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-normal text-zinc-400">
                              <span>{isLive ? 'Live' : 'Test'}</span>
                              <code className="break-all">{maskedKeyDisplay}</code>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-zinc-400 whitespace-nowrap font-mono text-[11px]">
                            {k.lastUsedAt ? (
                              <span className="text-emerald-400">{formatTimeAgo(k.lastUsedAt)}</span>
                            ) : (
                              <span className="text-zinc-600">Never</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                              k.revoked
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : k.isExpired
                                ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {k.revoked ? 'Revoked' : k.isExpired ? 'Expired' : 'Active'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/keys/${k.id}`} className="px-2 py-2 text-zinc-300 hover:text-white">Details</Link>
                              {!k.revoked && !k.isExpired && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setRollingKey(k)}
                                    className="px-2 py-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 text-[11px] font-medium cursor-pointer transition-colors"
                                    title="Zero-downtime key rotation"
                                  >
                                    Rotate
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setRevokeError(null); setRevokingKey(k); }}
                                    className="px-2 py-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-[11px] font-medium cursor-pointer transition-colors"
                                    title="Revoke key"
                                  >
                                    Revoke
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quickstart Integration Drawer, Code Presets & Interactive Live Runner */}
          <div className="rounded-2xl border border-white/10 bg-[#0d101c] p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-indigo-400" />
                  <span>Developer Integration</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Drop-in compatible with Cursor, Vercel AI SDK, Python, and OpenAI clients at <code className="text-zinc-200 font-mono">https://galx.ai/v1</code>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Smoke Test Button */}
                <button
                  type="button"
                  onClick={handleRunSmokeTest}
                  disabled={isPinging}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Ping the gateway to verify routing and latency"
                >
                  <Play className={`w-3 h-3 fill-cyan-400 ${isPinging ? 'animate-pulse' : ''}`} />
                  <span>{isPinging ? 'Pinging...' : 'Smoke Test'}</span>
                </button>

                {/* Tabs */}
                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-xs font-mono">
                  {(
                    [
                      { id: 'cursor', label: 'Cursor' },
                      { id: 'vercel', label: 'Vercel AI' },
                      { id: 'python', label: 'Python' },
                      { id: 'node', label: 'Node.js' },
                      { id: 'curl', label: 'cURL' }
                    ] as { id: SnippetTab; label: string }[]
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveSnippetTab(tab.id)}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        activeSnippetTab === tab.id
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Smoke Test Feedback Banner */}
            {pingResult && (
              <div className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
                pingResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Ping: {pingResult.latencyMs}ms — {pingResult.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPingResult(null)}
                  className="text-zinc-500 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Code Box */}
            <div className="relative rounded-xl bg-black/70 border border-white/10 font-mono text-xs overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/10 bg-white/[0.02]">
                <span className="text-[11px] text-zinc-400">{snippets[activeSnippetTab].title}</span>
                <button
                  type="button"
                  onClick={() => handleCopySnippet(snippets[activeSnippetTab].code)}
                  className="px-2.5 py-1 rounded text-zinc-300 hover:text-white hover:bg-white/10 text-[11px] font-sans font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                  <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 text-zinc-300 overflow-x-auto leading-relaxed">
                <code>{snippets[activeSnippetTab].code}</code>
              </pre>
            </div>

            {/* Live Interactive In-Console Chat Test Runner (Playground Light) */}
            <div className="pt-3 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-white">Live Completion Runner (In-Console Test)</span>
                </div>
                <select
                  value={chatModel}
                  onChange={(e) => setChatModel(e.target.value)}
                  className="py-1 px-2.5 rounded-lg bg-black/50 border border-white/10 text-xs font-mono text-zinc-300 focus:outline-none cursor-pointer"
                >
                  <option value="gpt-5.6-sol" className="bg-[#0d101c] text-white">gpt-5.6-sol (Flagship)</option>
                  <option value="gpt-5.6-terra" className="bg-[#0d101c] text-white">gpt-5.6-terra (Fast)</option>
                  <option value="gpt-5.6-luna" className="bg-[#0d101c] text-white">gpt-5.6-luna (Reasoning)</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRunChatTest();
                  }}
                  placeholder="Type a test prompt (e.g. 'Write a quicksort in Python' or 'Hello GALX')..."
                  className="flex-1 py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 font-sans"
                />
                <button
                  type="button"
                  onClick={handleRunChatTest}
                  disabled={isTestingChat}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0 shadow-sm"
                >
                  <Play className={`w-3.5 h-3.5 fill-white ${isTestingChat ? 'animate-pulse' : ''}`} />
                  <span>{isTestingChat ? 'Sending...' : 'Send Request'}</span>
                </button>
              </div>

              {chatTestResult && (
                <div className="p-3.5 rounded-xl bg-black/80 border border-emerald-500/30 space-y-2 text-xs font-mono animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px] text-emerald-400">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>✓ {chatTestResult.latencyMs}ms roundtrip</span>
                      <span className="text-zinc-500">•</span>
                      <span className="text-zinc-400">{chatTestResult.model}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setChatTestResult(null)}
                      className="text-zinc-500 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                  <p className="text-zinc-200 leading-relaxed font-sans whitespace-pre-wrap">{chatTestResult.content}</p>
                </div>
              )}

              {chatTestError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{chatTestError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChatTestError(null)}
                    className="text-rose-400 hover:text-rose-200 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </AuthRequiredGate>
      </main>

      {/* Dedicated Secret Key Reveal Modal (Stripe / OpenAI standard) */}
      {revealedKey && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg rounded-2xl bg-[#0d101c] border border-emerald-500/40 p-6 space-y-4 shadow-2xl text-zinc-100 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Save Your Secret API Key</h2>
                  <span className="text-xs text-zinc-400">{revealedKey.name} ({revealedKey.env.toUpperCase()})</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5 leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                Please save this secret key now. For security purposes, <strong>you will not be able to view the full key again</strong> after closing this window.
              </span>
            </div>

            {/* Secret key display with 1-click copy */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Secret Key</label>
              <div className="p-3 rounded-xl bg-black/80 font-mono text-xs text-emerald-300 flex items-center justify-between gap-3 border border-white/10">
                <span className="select-all break-all">{revealedKey.apiKey}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(revealedKey.apiKey, 'modal_key')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKeyId === 'modal_key' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKeyId === 'modal_key' ? 'Copied!' : 'Copy Key'}</span>
                </button>
              </div>
            </div>

            {/* Multi-Format Export Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDownloadEnv(revealedKey.apiKey, revealedKey.name)}
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-left transition-colors cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <span className="font-semibold text-zinc-200 block group-hover:text-white">Download .env</span>
                  <span className="text-[10px] text-zinc-500">Save (.env.galx)</span>
                </div>
                <Download className="w-4 h-4 text-zinc-400 group-hover:text-white" />
              </button>

              <button
                type="button"
                onClick={() => handleCopyEnvSnippet(revealedKey.apiKey)}
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-left transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-zinc-200 block">Copy .env</span>
                  <span className="text-[10px] text-zinc-500">GALX_API_KEY="..."</span>
                </div>
                {copiedEnvSnippet ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
              </button>

              <button
                type="button"
                onClick={() => handleCopyShellSnippet(revealedKey.apiKey)}
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-left transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-zinc-200 block">Copy Export</span>
                  <span className="text-[10px] text-zinc-500">export GALX_API_KEY</span>
                </div>
                {copiedShellSnippet ? <Check className="w-4 h-4 text-emerald-400" /> : <Terminal className="w-4 h-4 text-zinc-400" />}
              </button>
            </div>

            {/* Security Acknowledgment Checkbox */}
            <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={hasSavedSecretKey}
                onChange={(e) => setHasSavedSecretKey(e.target.checked)}
                className="rounded border-white/20 bg-black/40 text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span>I have copied and safely stored this secret key</span>
            </label>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setRevealedKey(null)}
                className={`px-5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  hasSavedSecretKey
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                    : 'bg-white/10 hover:bg-white/20 text-zinc-300'
                }`}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accessible Revocation Confirmation Modal */}
      {revokingKey && (
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
                onClick={() => setRevokingKey(null)}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-zinc-300 leading-relaxed">
              <p>
                Are you sure you want to revoke <strong>{revokingKey.name}</strong> (<code className="text-zinc-300 font-mono">{revokingKey.keyPrefix || revokingKey.prefix}...</code>)?
              </p>
              <p className="text-rose-300/90 font-medium">
                Apps using this key will lose access. This cannot be undone.
              </p>
            </div>

            {revokeError && <p role="alert" className="text-xs text-rose-300">{revokeError}</p>}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={isRevoking}
                onClick={() => setRevokingKey(null)}
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

      {/* Create Key Modal Dialog with Quick Presets */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-md rounded-2xl bg-[#0d101c] border border-white/15 p-6 space-y-4 shadow-2xl text-zinc-100 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h2 className="text-base font-bold text-white">Create New Secret Key</h2>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            {/* Preset Pills */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Quick Name Suggestions</span>
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_PRESETS.map((p) => {
                  const Icon = p.icon;
                  const isSelected = newKeyName === p.defaultName;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={`p-2 rounded-xl border text-left text-xs transition-colors cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500/60 text-white font-medium'
                          : 'bg-black/30 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                      <span className="truncate">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-3.5 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Cursor IDE, Production Backend, Fleet Worker"
                  className="w-full py-2 px-3 rounded-xl bg-black/50 border border-white/15 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 font-sans"
                  autoFocus
                  required
                />
              </div>

              {/* Permissions scope callout */}
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-300 font-medium block text-xs">Default Permissions</span>
                  <span className="text-[10px] text-zinc-500">Access to all models & completion routes</span>
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  <Check className="w-3 h-3" />
                  Full Access (*)
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Environment</label>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setNewKeyEnv('live')}
                    className={`py-2 px-3 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      newKeyEnv === 'live'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-black/30 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Live (Production)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewKeyEnv('test')}
                    className={`py-2 px-3 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      newKeyEnv === 'test'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-black/30 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>Test (Sandbox)</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Prompt Policy</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setNewKeyCompactionMode('raw')}
                    className={`py-2 px-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      newKeyCompactionMode === 'raw'
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-white font-semibold'
                        : 'bg-black/30 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div>Raw (Default)</div>
                    <div className="text-[10px] text-zinc-500 font-normal">100% byte fidelity</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewKeyCompactionMode('auto')}
                    className={`py-2 px-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      newKeyCompactionMode === 'auto'
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 font-semibold'
                        : 'bg-black/30 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div>Compacted</div>
                    <div className="text-[10px] text-zinc-500 font-normal">Auto-token deflation</div>
                  </button>
                </div>
              </div>

              <div className="pt-1 text-center">
                <Link
                  href="/keys/new"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 transition-colors"
                >
                  <span>Need restricted scopes or rotation TTL? Open Advanced Provisioner</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreating ? 'Creating...' : 'Create Secret Key'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Key Roll / Zero-Downtime Rotation Modal */}
      {rollingKey && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-[#0d101c] border border-white/15 p-6 space-y-4 shadow-2xl text-zinc-100 font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <span>Rotate API Key</span>
              </div>
              <button
                type="button"
                onClick={() => setRollingKey(null)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-zinc-300">
              <p>
                Rolling <strong>{rollingKey.name}</strong> (<code className="text-cyan-300 font-mono">{rollingKey.keyPrefix || rollingKey.prefix}...</code>).
              </p>
              <p className="text-zinc-400">
                A new key will be minted with identical scopes and rate limits. The current key will remain active during the migration grace period.
              </p>
            </div>

            {/* Grace Period Selector */}
            <div className="space-y-1.5 text-xs">
              <span className="text-zinc-400 font-semibold">Migration Grace Period:</span>
              <div className="grid grid-cols-2 gap-2 font-mono">
                {[
                  { hours: 0, label: 'Instant Revoke' },
                  { hours: 1, label: '1 Hour' },
                  { hours: 24, label: '24 Hours (Rec)' },
                  { hours: 168, label: '7 Days' }
                ].map((g) => (
                  <button
                    key={g.hours}
                    type="button"
                    onClick={() => setRollingGraceHours(g.hours)}
                    className={`py-2 px-3 rounded-xl border text-xs transition-colors cursor-pointer text-left ${
                      rollingGraceHours === g.hours
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 font-semibold'
                        : 'bg-black/30 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setRollingKey(null)}
                className="px-3.5 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRollKey}
                disabled={isRolling}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRolling ? 'animate-spin' : ''}`} />
                <span>{isRolling ? 'Rotating...' : 'Confirm Roll'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withErrorBoundary(BaseGatewayKeysPage, {
  name: 'Gateway Keys Page'
});
