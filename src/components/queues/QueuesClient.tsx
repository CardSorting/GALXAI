'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { useAuth } from '@/contexts/AuthContext';
import {
  Zap,
  Search,
  CheckCircle2,
  Activity,
  Copy,
  Check,
  RefreshCw,
  FileText,
  Bot,
  Code2,
  Terminal,
  ShieldCheck,
  Key,
  Layers,
  Lock,
} from 'lucide-react';
import type {
  GalxTask,
} from '@/core/contracts/GalxContracts';
import { resilientFetch } from '@/lib/resilience/ResilientClient';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';

function getPromptText(task: GalxTask): string {
  if (task.target.type === 'INTERNAL_MODEL') {
    if (task.target.taskKind === 'chat_completion' && task.target.chatPayload) {
      const messages = task.target.chatPayload.messages || [];
      const userMsg = [...messages].reverse().find(m => m.role === 'user');
      if (typeof userMsg?.content === 'string') return userMsg.content;
      if (Array.isArray(userMsg?.content)) {
        const textPart = (userMsg.content as any[]).find(p => p.type === 'text' && p.text);
        if (textPart?.text) return textPart.text;
      }
      return 'Multi-turn chat payload';
    }
    if (task.target.taskKind === 'image_generation' && task.target.imagePayload) {
      return task.target.imagePayload.prompt || 'Image generation prompt';
    }
  }
  if (task.target.type === 'HTTP_PUSH') {
    return `Webhook: ${task.target.url}`;
  }
  return task.progress?.message || task.id;
}

function getResultText(task: GalxTask): string {
  if (!task.result?.data) return '';
  if (typeof task.result.data === 'string') return task.result.data;
  if (task.result.data.choices && task.result.data.choices[0]?.message?.content) {
    return task.result.data.choices[0].message.content;
  }
  return JSON.stringify(task.result.data, null, 2);
}

function getAgentContextSnippet(task: GalxTask): string {
  const p = getPromptText(task);
  const r = getResultText(task);
  return `### [GALXAI Autonomous Agent Context]
Task ID: ${task.id}
User Prompt: ${p}
Model: ${task.result?.modelUsed || 'gpt-5.6-sol'}
Status: ${task.status}

=== RESULT OUTPUT ===
${r}
====================`;
}

function getPythonAgentSnippet(task: GalxTask): string {
  const p = getPromptText(task);
  return `from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_..."
)

response = client.chat.completions.create(
    model="${task.result?.modelUsed || 'gpt-5.6-sol'}",
    messages=[{"role": "user", "content": ${JSON.stringify(p)}}]
)
print(response.choices[0].message.content)`;
}

function BaseRequestsAndResultsCanvas() {
  const { user, isLoading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<GalxTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [autoCopyForAgent] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'python' | 'ts' | 'curl'>('python');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const lastCompletedTaskIdRef = useRef<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const fetchTasks = React.useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      const headers: Record<string, string> = {};
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      const res = await resilientFetch<{ tasks: GalxTask[] }>('/api/queues/default/tasks?limit=100', {
        headers,
        enableCacheFallback: true,
      });
      const taskList: GalxTask[] = res.data?.tasks || [];
      setTasks(taskList);
      if (!selectedTaskId && taskList.length > 0) {
        setSelectedTaskId(taskList[0].id);
      }

      if (autoCopyForAgent && taskList.length > 0) {
        const newest = taskList[0];
        if (newest.status === 'COMPLETED' && newest.id !== lastCompletedTaskIdRef.current) {
          lastCompletedTaskIdRef.current = newest.id;
          const snippet = getAgentContextSnippet(newest);
          safeCopyToClipboard(snippet).then(copied => {
            if (copied) showToast('⚡ Auto-Copied Result for Agent!');
          });
        }
      }
    } catch {
      // Graceful isolation
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedTaskId, autoCopyForAgent]);

  useEffect(() => {
    if (user) {
      fetchTasks();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchTasks]);

  useEffect(() => {
    if (!autoRefresh || !user) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchTasks();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh, user, fetchTasks]);

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || tasks[0] || null;

  const handleCopy = async (text: string, id: string, label: string = 'Copied') => {
    const success = await safeCopyToClipboard(text);
    if (success) {
      setCopiedId(id);
      showToast(`${label}! ✓`);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getTSAgentSnippet = (task: GalxTask): string => {
    const p = getPromptText(task);
    return `import { OpenAI } from 'openai';

const client = new OpenAI({
  baseURL: 'https://galx.ai/v1',
  apiKey: 'galx_live_...'
});

const response = await client.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: ${JSON.stringify(p)} }]
});

console.log(response.choices[0].message.content);`;
  };

  const getCurlSnippet = (task: GalxTask): string => {
    const p = getPromptText(task);
    return `curl -X POST https://galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer $GALX_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{"role": "user", "content": ${JSON.stringify(p)}}]
  }'`;
  };

  const filteredTasks = tasks.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return getPromptText(t).toLowerCase().includes(q) || getResultText(t).toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
  });

  const getTimeAgo = (timestampMs: number): string => {
    const elapsed = Date.now() - timestampMs;
    if (elapsed < 60000) return 'Just now';
    if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}m ago`;
    if (elapsed < 86400000) return `${Math.floor(elapsed / 3600000)}h ago`;
    return `${Math.floor(elapsed / 86400000)}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 font-sans antialiased selection:bg-white/20 selection:text-white flex flex-col justify-between">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-cyan-500/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] bg-indigo-500/8 rounded-full blur-[140px]" />
      </div>

      <Navigation />

      {/* Floating Instant Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 text-white font-bold text-xs shadow-2xl shadow-indigo-500/40 border border-white/20 animate-in fade-in slide-in-from-top-2 duration-150 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 relative z-10">
        <Breadcrumbs
          items={[
            { label: 'Developer Hub', href: '/docs' },
            { label: 'API & SDK Task Stream' },
          ]}
        />

        {/* Developer Authentication Gate */}
        <AuthRequiredGate
          title="Sign In to View Your Queues & Task Stream"
          description="Task queues, execution streams, and background worker logs are private to your workspace. Connect your developer account or mint a live API key to inspect your real-time telemetry."
        >
          <>
            {/* Top Header Card */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-3 border border-white/10 relative overflow-hidden bg-black/40">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>PROGRAMMATIC API &amp; SDK MONITOR</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Universal Request &amp; Worker Queue Stream
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed font-sans">
                    All requests routed through your API keys or SDK clients are ingested, queued, and audited here in real time with sub-15ms execution metrics.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 self-start md:self-auto font-mono text-xs">
                  <button
                    onClick={() => fetchTasks()}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>

                  <Link
                    href="/keys/new"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 whitespace-nowrap cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 fill-black" />
                    <span>Mint API Key ($5 Free)</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Stream Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
              {/* Left History Rail */}
              <div className="lg:col-span-4 glass-panel rounded-3xl p-4 border border-white/10 flex flex-col bg-black/40 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Live Tasks ({tasks.length})</span>
                  </span>

                  <button
                    onClick={() => {
                      const nextVal = !autoRefresh;
                      setAutoRefresh(nextVal);
                      showToast(nextVal ? 'Live Polling Active' : 'Live Polling Paused');
                    }}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                      autoRefresh
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-zinc-500'
                    }`}
                  >
                    {autoRefresh ? '● Polling 2s' : 'Paused'}
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search requests or payloads..."
                    className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                {/* Task List */}
                <div className="flex-1 overflow-y-auto space-y-2 max-h-[480px] pr-1">
                  {filteredTasks.length === 0 ? (
                    <div className="text-center py-16 text-zinc-500 text-xs font-mono space-y-2">
                      <FileText className="w-6 h-6 mx-auto opacity-30" />
                      <p>No active API requests in this workspace.</p>
                      <p className="text-[10px] text-zinc-600">Send your first completion via the SDK below.</p>
                    </div>
                  ) : (
                    filteredTasks.map((t) => {
                      const isSelected = selectedTask?.id === t.id;
                      const promptText = getPromptText(t);
                      const isWorking = ['QUEUED', 'SCHEDULED', 'RUNNING', 'DISPATCHING'].includes(t.status);

                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTaskId(t.id)}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                            isSelected
                              ? 'bg-gradient-to-r from-cyan-500/15 via-indigo-500/10 to-transparent border-cyan-400/50 text-white shadow-lg'
                              : 'bg-black/40 border-white/5 hover:border-white/15 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="flex items-center gap-1.5">
                              {isWorking ? (
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                              ) : t.status === 'COMPLETED' ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              )}
                              <span className="font-bold text-white">
                                {isWorking ? 'Working...' : t.status === 'COMPLETED' ? 'Ready' : 'Failed'}
                              </span>
                            </span>
                            <span className="text-zinc-500 text-[10px]">{getTimeAgo(t.createdAtMs)}</span>
                          </div>

                          <div className="text-xs font-medium text-zinc-200 line-clamp-2 leading-snug">
                            {promptText}
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1">
                            <span>{t.id.slice(0, 14)}...</span>
                            <span className="text-cyan-400/80">{t.result?.modelUsed || 'gpt-5.6-sol'}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Main Task Inspector */}
              <div className="lg:col-span-8 glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 bg-black/50 space-y-6 flex flex-col justify-between">
                {selectedTask ? (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    {/* Task Header & Status Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-cyan-300">
                            Task ID: {selectedTask.id}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                            selectedTask.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {selectedTask.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-mono">
                          Queue: <strong className="text-zinc-200">{selectedTask.queueId}</strong> • Priority: {selectedTask.priority}
                        </p>
                      </div>

                      {/* 1-Click Code Exporters */}
                      <div className="flex items-center gap-1.5 flex-wrap font-mono text-xs">
                        <button
                          onClick={() => handleCopy(getAgentContextSnippet(selectedTask), `agent-${selectedTask.id}`, 'Agent Context Copied')}
                          className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Bot className="w-3.5 h-3.5 text-purple-300" />
                          <span>{copiedId === `agent-${selectedTask.id}` ? 'Copied!' : '🤖 Copy Context'}</span>
                        </button>

                        <button
                          onClick={() => handleCopy(getResultText(selectedTask), `text-${selectedTask.id}`, 'Output Copied')}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{copiedId === `text-${selectedTask.id}` ? 'Copied!' : 'Raw Text'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Prompt Ingestion Box */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold block">
                        Inbound API Payload Prompt:
                      </span>
                      <div className="p-4 rounded-2xl bg-black/60 border border-white/10 text-sm text-zinc-200 font-sans leading-relaxed">
                        {getPromptText(selectedTask)}
                      </div>
                    </div>

                    {/* Result Output Box */}
                    {selectedTask.status === 'COMPLETED' && selectedTask.result && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase text-emerald-400 font-bold flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" />
                            <span>Completion Output (25%–40% Wholesale Rate Applied):</span>
                          </span>
                        </div>

                        <div className="p-5 rounded-2xl bg-black/80 border border-emerald-500/30 text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto select-text shadow-inner">
                          {getResultText(selectedTask)}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                      <Terminal className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-md mx-auto">
                      <h3 className="text-lg font-bold text-white">Programmatic Execution Stream</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                        Execute completions programmatically using the OpenAI Python SDK, TypeScript client, or standard cURL requests. Your live requests will be streamed and inspected here.
                      </p>
                    </div>
                  </div>
                )}

                {/* Bottom API/SDK Ingestion Code Snippet Drawer */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400 font-bold uppercase flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-cyan-400" />
                      <span>SDK &amp; API Dispatch Snippets</span>
                    </span>

                    <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
                      {(['python', 'ts', 'curl'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveCodeTab(tab)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                            activeCodeTab === tab
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative rounded-2xl bg-black/80 border border-white/10 overflow-hidden font-mono text-xs">
                    <pre className="p-4 text-cyan-300 overflow-x-auto selection:bg-cyan-500 selection:text-black leading-relaxed">
                      <code>
                        {activeCodeTab === 'python' && (selectedTask ? getPythonAgentSnippet(selectedTask) : `from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_..."
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Hello from Python SDK!"}]
)
print(response.choices[0].message.content)`)}
                        {activeCodeTab === 'ts' && (selectedTask ? getTSAgentSnippet(selectedTask) : `import { OpenAI } from 'openai';

const client = new OpenAI({
  baseURL: 'https://galx.ai/v1',
  apiKey: 'galx_live_...'
});

const response = await client.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Hello from TypeScript!' }]
});
console.log(response.choices[0].message.content);`)}
                        {activeCodeTab === 'curl' && (selectedTask ? getCurlSnippet(selectedTask) : `curl -X POST https://galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer $GALX_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{"role": "user", "content": "Hello via cURL!"}]
  }'`)}
                      </code>
                    </pre>

                    <button
                      onClick={() => {
                        const code = activeCodeTab === 'python'
                          ? (selectedTask ? getPythonAgentSnippet(selectedTask) : `from openai import OpenAI\n\nclient = OpenAI(base_url="https://galx.ai/v1", api_key="galx_live_...")\nresponse = client.chat.completions.create(model="gpt-5.6-sol", messages=[{"role": "user", "content": "Hello!"}])\nprint(response.choices[0].message.content)`)
                          : activeCodeTab === 'ts'
                          ? (selectedTask ? getTSAgentSnippet(selectedTask) : `import { OpenAI } from 'openai';\nconst client = new OpenAI({ baseURL: 'https://galx.ai/v1', apiKey: 'galx_live_...' });\nconst response = await client.chat.completions.create({ model: 'gpt-5.6-sol', messages: [{ role: 'user', content: 'Hello!' }] });`)
                          : (selectedTask ? getCurlSnippet(selectedTask) : `curl -X POST https://galx.ai/v1/chat/completions -H "Authorization: Bearer $GALX_API_KEY" -H "Content-Type: application/json" -d '{"model":"gpt-5.6-sol","messages":[{"role":"user","content":"Hello!"}]}'`);
                        handleCopy(code, 'bottom-code-snippet', 'Snippet Copied');
                      }}
                      className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-cyan-400" />
                      <span>Copy Snippet</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        </AuthRequiredGate>
      </main>
    </div>
  );
}

export const QueuesClient = withErrorBoundary(BaseRequestsAndResultsCanvas, {
  name: 'Requests & Results Canvas',
});
