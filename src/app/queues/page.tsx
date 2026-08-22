'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Zap,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  Copy,
  Check,
  Download,
  Share2,
  Sparkles,
  Send,
  X,
  Workflow,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus,
  Bot,
  Code2,
  Terminal,
  FileCode2,
  Cpu,
  Flame,
  Wand2
} from 'lucide-react';
import type {
  GalxTask,
  TaskStatus
} from '@/core/contracts/GalxContracts';

export default function RequestsAndResultsCanvas() {
  const [tasks, setTasks] = useState<GalxTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [autoCopyForAgent, setAutoCopyForAgent] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Omnibar Form State
  const [prompt, setPrompt] = useState<string>('');
  const [workloadType, setWorkloadType] = useState<'chat' | 'image' | 'workflow'>('chat');
  const [model, setModel] = useState<string>('gpt-5.6-sol');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultEndRef = useRef<HTMLDivElement>(null);
  const lastCompletedTaskIdRef = useRef<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/queues/default/tasks?limit=100');
      if (res.ok) {
        const data = await res.json();
        const taskList: GalxTask[] = data.tasks || [];
        setTasks(taskList);
        if (!selectedTaskId && taskList.length > 0) {
          setSelectedTaskId(taskList[0].id);
        }

        // Auto-Copy check
        if (autoCopyForAgent && taskList.length > 0) {
          const newest = taskList[0];
          if (newest.status === 'COMPLETED' && newest.id !== lastCompletedTaskIdRef.current) {
            lastCompletedTaskIdRef.current = newest.id;
            const snippet = getAgentContextSnippet(newest);
            navigator.clipboard.writeText(snippet);
            showToast('⚡ Auto-Copied Result for Agent!');
          }
        }
      }
    } catch {
      // Graceful isolation
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Real-time polling
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchTasks();
    }, 1800);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedTaskId, autoCopyForAgent]);

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || tasks[0] || null;

  // Ultra-flat Submit Handler
  const handleQuickSubmit = async (customPrompt?: string, customType?: 'chat' | 'image' | 'workflow') => {
    const textToSend = (customPrompt || prompt).trim();
    const typeToSend = customType || workloadType;
    if (!textToSend || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let targetPayload: any = null;
      let targetQueue = 'default';

      if (typeToSend === 'chat') {
        targetPayload = {
          type: 'INTERNAL_MODEL',
          taskKind: 'chat_completion',
          chatPayload: {
            model,
            messages: [{ role: 'user', content: textToSend }]
          }
        };
        targetQueue = 'default';
      } else if (typeToSend === 'image') {
        targetPayload = {
          type: 'INTERNAL_MODEL',
          taskKind: 'image_generation',
          imagePayload: {
            model: 'openai-gpt-image-2',
            prompt: textToSend
          }
        };
        targetQueue = 'image-gen';
      } else if (typeToSend === 'workflow') {
        targetPayload = {
          type: 'INTERNAL_MODEL',
          taskKind: 'chat_completion',
          chatPayload: {
            model: 'gpt-5.6-sol',
            messages: [{ role: 'user', content: textToSend }]
          }
        };
        targetQueue = 'agent-swarms';
      }

      const body: any = {
        queueId: targetQueue,
        priority: 85,
        target: targetPayload
      };

      if (typeToSend === 'workflow') {
        body.pipelineSteps = [
          {
            name: 'Initial Analysis',
            required: true,
            target: {
              type: 'INTERNAL_MODEL',
              taskKind: 'chat_completion',
              chatPayload: {
                model: 'gpt-5.6-sol',
                messages: [{ role: 'user', content: `Analyze: ${textToSend}` }]
              }
            }
          },
          {
            name: 'Refined Synthesis',
            required: true,
            target: {
              type: 'INTERNAL_MODEL',
              taskKind: 'chat_completion',
              chatPayload: {
                model: 'claude-3-7-sonnet',
                messages: [{ role: 'user', content: 'Synthesize the analysis into a polished response.' }]
              }
            }
          }
        ];
      }

      const res = await fetch(`/api/queues/${targetQueue}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        setPrompt('');
        await fetchTasks();
        if (data.task?.id) {
          setSelectedTaskId(data.task.id);
        }
      }
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (text: string, id: string, label: string = 'Copied') => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`${label}! ✓`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('Downloaded result file!');
  };

  const handleRetry = async (task: GalxTask) => {
    try {
      await fetch(`/api/queues/${task.queueId}/tasks/${task.id}/retry`, { method: 'POST' });
      await fetchTasks();
      showToast('Re-running request in background...');
    } catch {}
  };

  const getPromptText = (task: GalxTask): string => {
    if (task.target.type === 'INTERNAL_MODEL') {
      if (task.target.taskKind === 'chat_completion' && task.target.chatPayload?.messages) {
        const userMsg = task.target.chatPayload.messages.find(m => m.role === 'user');
        if (typeof userMsg?.content === 'string') return userMsg.content;
        if (Array.isArray(userMsg?.content)) {
          const textPart = (userMsg.content as any[]).find(p => p.type === 'text' && p.text);
          if (textPart?.text) return textPart.text;
        }
        return 'AI Chat Request';
      }
      if (task.target.taskKind === 'image_generation' && task.target.imagePayload?.prompt) {
        return task.target.imagePayload.prompt;
      }
    }
    if (task.target.type === 'HTTP_PUSH') {
      return `Webhook: ${task.target.url}`;
    }
    return task.progress?.message || task.id;
  };

  const getResultText = (task: GalxTask): string => {
    if (!task.result?.data) return '';
    if (typeof task.result.data === 'string') return task.result.data;
    if (task.result.data.choices && task.result.data.choices[0]?.message?.content) {
      return task.result.data.choices[0].message.content;
    }
    return JSON.stringify(task.result.data, null, 2);
  };

  // Direct Formatters for 1-Click Agent Chips
  const getAgentContextSnippet = (task: GalxTask): string => {
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
  };

  const getPythonAgentSnippet = (task: GalxTask): string => {
    const p = getPromptText(task);
    return `from galxai import run

# 1-Line Autonomous Execution
result = run("""${p.replace(/"""/g, '\\"\\"\\"')}""")
print(result)`;
  };

  const getTSAgentSnippet = (task: GalxTask): string => {
    const p = getPromptText(task);
    return `import { run } from 'galxai';

const result = await run(${JSON.stringify(p)});
console.log(result);`;
  };

  const getCurlSnippet = (task: GalxTask): string => {
    const p = getPromptText(task);
    return `curl -X POST https://gateway.galx.ai/api/run \\
  -H "Authorization: Bearer $GALX_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": ${JSON.stringify(p)}}'`;
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
    <div className="min-h-screen bg-[#07080d] text-zinc-100 font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col justify-between">
      {/* Subtle Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-cyan-500/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] bg-indigo-500/8 rounded-full blur-[140px]" />
      </div>

      {/* Floating Instant Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 text-white font-bold text-xs shadow-2xl shadow-indigo-500/40 border border-white/20 animate-in fade-in slide-in-from-top-2 duration-150 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar */}
      <header className="relative z-20 border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between backdrop-blur-xl bg-[#07080d]/80">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title={sidebarOpen ? 'Hide History' : 'Show History'}
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </span>
            <span className="font-bold text-sm text-white tracking-tight">Requests & Results</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Auto-Copy Toggle Button (Zero Clicks Needed!) */}
          <button
            onClick={() => {
              const nextVal = !autoCopyForAgent;
              setAutoCopyForAgent(nextVal);
              showToast(nextVal ? '⚡ Auto-Copy for Agent Enabled' : 'Auto-Copy Disabled');
            }}
            className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              autoCopyForAgent
                ? 'bg-purple-600/30 text-purple-200 border-purple-500/50 shadow-lg shadow-purple-500/20'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
            title="Automatically copies output to clipboard as soon as it is generated"
          >
            <Zap className={`w-3.5 h-3.5 ${autoCopyForAgent ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-zinc-400'}`} />
            <span>{autoCopyForAgent ? '⚡ Auto-Copy ON' : 'Auto-Copy Off'}</span>
          </button>

          <button
            onClick={() => {
              setSelectedTaskId(null);
              setPrompt('');
              textareaRef.current?.focus();
            }}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-cyan-400" />
            <span>New</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* Collapsible Left History Rail */}
        {sidebarOpen && (
          <aside className="w-72 sm:w-80 border-r border-white/10 flex flex-col bg-black/20 backdrop-blur-xl shrink-0">
            {/* Search History */}
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search past requests..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  <FileText className="w-5 h-5 mx-auto mb-1.5 opacity-40" />
                  <span>No requests found</span>
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
                      className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-500/15 via-indigo-500/10 to-transparent border-cyan-500/40 text-white shadow-md'
                          : 'bg-white/[0.01] border-transparent hover:bg-white/[0.03] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="flex items-center gap-1">
                          {isWorking ? (
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          ) : t.status === 'COMPLETED' ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          )}
                          <span className="font-mono text-zinc-400">
                            {isWorking ? 'Working...' : t.status === 'COMPLETED' ? 'Ready' : 'Failed'}
                          </span>
                        </span>
                        <span className="text-zinc-500">{getTimeAgo(t.createdAtMs)}</span>
                      </div>
                      <div className="text-xs font-medium text-white line-clamp-2 leading-relaxed">
                        {promptText}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* Central Canvas / Live Result Viewer */}
        <main className="flex-1 flex flex-col justify-between overflow-y-auto p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
          {/* Active Canvas Body */}
          <div className="space-y-6">
            {selectedTask ? (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* User Prompt Bubble */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 text-cyan-300 font-bold text-xs">
                    You
                  </div>
                  <div className="flex-1 p-4 rounded-3xl bg-white/[0.03] border border-white/10 text-sm text-zinc-100 leading-relaxed font-sans shadow-sm">
                    {getPromptText(selectedTask)}
                  </div>
                </div>

                {/* Live Working Indicator */}
                {['QUEUED', 'SCHEDULED', 'RUNNING', 'DISPATCHING', 'WAITING_DEPENDENCIES'].includes(selectedTask.status) && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-300">
                      <Activity className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="flex-1 p-5 rounded-3xl bg-amber-500/5 border border-amber-500/20 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-300">Processing live in background...</span>
                        <span className="font-mono text-zinc-400">{selectedTask.progress?.percentage || 25}%</span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-400 to-cyan-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(20, selectedTask.progress?.percentage || 25)}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-400 italic">
                        {selectedTask.progress?.message || 'Generating response across compute substrate...'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Workflow Step Progression */}
                {selectedTask.pipelineSteps && selectedTask.pipelineSteps.length > 0 && (
                  <div className="ml-11 space-y-2">
                    <div className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                      <Workflow className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Multi-Step Progression</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedTask.pipelineSteps.map((step, idx) => {
                        const stepDone = (selectedTask.activePipelineStepIndex ?? 0) > idx || selectedTask.status === 'COMPLETED';
                        const stepWorking = (selectedTask.activePipelineStepIndex ?? 0) === idx && selectedTask.status === 'RUNNING';

                        return (
                          <div
                            key={step.name}
                            className={`p-3 rounded-2xl border text-xs transition-all ${
                              stepDone
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-zinc-200'
                                : stepWorking
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 animate-pulse'
                                : 'bg-white/5 border-white/5 text-zinc-500'
                            }`}
                          >
                            <div className="flex items-center justify-between font-medium">
                              <span>Step {idx + 1}: {step.name}</span>
                              {stepDone && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Assistant Output Result */}
                {selectedTask.status === 'COMPLETED' && selectedTask.result && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20 text-white">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="p-6 rounded-3xl bg-black/60 border border-white/10 text-sm text-zinc-100 leading-relaxed font-sans whitespace-pre-wrap select-text shadow-2xl">
                        {getResultText(selectedTask)}
                      </div>

                      {/* Direct 1-Click Multi-Format Export Bar (No Modals Needed!) */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] font-mono text-zinc-500 mr-1">1-Click Copy:</span>

                        {/* 1-Click Copy for Agent Context */}
                        <button
                          onClick={() => handleCopy(getAgentContextSnippet(selectedTask), `agent-${selectedTask.id}`, 'Agent Context Copied')}
                          className="px-3 py-1.5 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-all text-purple-200 hover:text-white shadow-sm cursor-pointer"
                        >
                          <Bot className="w-3.5 h-3.5 text-purple-300" />
                          <span>{copiedId === `agent-${selectedTask.id}` ? 'Copied Context! ✓' : '🤖 Agent Context'}</span>
                        </button>

                        {/* 1-Click Python */}
                        <button
                          onClick={() => handleCopy(getPythonAgentSnippet(selectedTask), `py-${selectedTask.id}`, 'Python Script Copied')}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium flex items-center gap-1 transition-all text-zinc-300 hover:text-white cursor-pointer"
                        >
                          <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{copiedId === `py-${selectedTask.id}` ? 'Copied! ✓' : '🐍 Python'}</span>
                        </button>

                        {/* 1-Click TypeScript */}
                        <button
                          onClick={() => handleCopy(getTSAgentSnippet(selectedTask), `ts-${selectedTask.id}`, 'TypeScript Snippet Copied')}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium flex items-center gap-1 transition-all text-zinc-300 hover:text-white cursor-pointer"
                        >
                          <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{copiedId === `ts-${selectedTask.id}` ? 'Copied! ✓' : '⚡ TS'}</span>
                        </button>

                        {/* 1-Click cURL */}
                        <button
                          onClick={() => handleCopy(getCurlSnippet(selectedTask), `curl-${selectedTask.id}`, 'cURL Command Copied')}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium flex items-center gap-1 transition-all text-zinc-300 hover:text-white cursor-pointer"
                        >
                          <Terminal className="w-3.5 h-3.5 text-amber-400" />
                          <span>{copiedId === `curl-${selectedTask.id}` ? 'Copied! ✓' : '🌐 cURL'}</span>
                        </button>

                        {/* 1-Click Plain Text */}
                        <button
                          onClick={() => handleCopy(getResultText(selectedTask), `text-${selectedTask.id}`, 'Text Copied')}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium flex items-center gap-1 transition-all text-zinc-300 hover:text-white cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{copiedId === `text-${selectedTask.id}` ? 'Copied! ✓' : '📄 Text'}</span>
                        </button>

                        {/* Re-run */}
                        <button
                          onClick={() => handleRetry(selectedTask)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium flex items-center gap-1 transition-all text-zinc-300 hover:text-white cursor-pointer ml-auto"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Re-run</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {selectedTask.lastError && (
                  <div className="ml-11 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>Execution Error</span>
                    </div>
                    <p className="font-mono text-[11px]">{selectedTask.lastError.message}</p>
                    <button
                      onClick={() => handleRetry(selectedTask)}
                      className="mt-2 px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-semibold transition-all text-white flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Retry Request
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Hero Empty State */
              <div className="py-16 text-center space-y-6">
                <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-indigo-600 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/25">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h2 className="text-xl font-bold text-white">What would you like to create?</h2>
                  <p className="text-xs sm:text-sm text-zinc-400">
                    Ask any question, generate high-definition images, or trigger multi-step research in the background.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-xl mx-auto pt-2">
                  {[
                    { label: 'Explain Quantum Computing', type: 'chat' },
                    { label: 'Write a Fast SQLite In-Memory Engine', type: 'chat' },
                    { label: 'Compare SaaS GTM Playbooks', type: 'workflow' }
                  ].map(chip => (
                    <button
                      key={chip.label}
                      onClick={() => {
                        setPrompt(chip.label);
                        setWorkloadType(chip.type as any);
                        handleQuickSubmit(chip.label, chip.type as any);
                      }}
                      className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-all text-left space-y-1 cursor-pointer"
                    >
                      <div className="text-cyan-400 font-mono text-[10px]">1-Click Prompt</div>
                      <div className="line-clamp-2">{chip.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={resultEndRef} />
          </div>

          {/* Docked Omnibar Prompt Composer */}
          <div className="sticky bottom-0 pt-3 pb-2 bg-[#07080d]/90 backdrop-blur-xl space-y-2">
            {/* Quick 1-Click Agent Presets */}
            <div className="flex flex-wrap items-center gap-1.5 px-1">
              <span className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1">
                <Wand2 className="w-3 h-3 text-cyan-400" /> Presets:
              </span>
              {[
                { label: '🤖 Agent Architecture', prompt: 'Architect a 3-agent autonomous workflow with supervisor and workers', type: 'workflow' },
                { label: '⚡ Code Refactor', prompt: 'Refactor this TypeScript function for maximum throughput and zero allocations', type: 'chat' },
                { label: '🔍 Privacy Audit', prompt: 'Audit input data for HIPAA Safe Harbor 18 and GDPR PII violations', type: 'chat' },
                { label: '🎨 Cyberpunk Art', prompt: 'A cinematic cyberpunk neon city with flying vehicles in 8k resolution', type: 'image' }
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setPrompt(preset.prompt);
                    setWorkloadType(preset.type as any);
                    handleQuickSubmit(preset.prompt, preset.type as any);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-zinc-200 text-[11px] font-medium transition-all cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="p-3 rounded-3xl bg-gradient-to-br from-white/[0.05] to-black/60 border border-white/15 shadow-2xl space-y-2">
              {/* Type and Model Pills */}
              <div className="flex items-center justify-between px-2 text-xs">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setWorkloadType('chat')}
                    className={`px-2.5 py-0.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      workloadType === 'chat' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Chat & Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkloadType('image')}
                    className={`px-2.5 py-0.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      workloadType === 'image' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkloadType('workflow')}
                    className={`px-2.5 py-0.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      workloadType === 'workflow' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Workflow
                  </button>
                </div>

                {workloadType === 'chat' && (
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded-lg px-2 py-0.5 text-[11px] text-zinc-300 focus:outline-none"
                  >
                    <option value="gpt-5.6-sol">GPT-5.6 Sol</option>
                    <option value="claude-3-7-sonnet">Claude 3.7 Sonnet</option>
                    <option value="gemini-2-5-pro">Gemini 2.5 Pro</option>
                    <option value="deepseek-r1">DeepSeek R1</option>
                  </select>
                )}
              </div>

              {/* Text Input Row */}
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask anything or describe your task (⌘ + Enter to send)..."
                  className="flex-1 bg-transparent border-0 p-2 text-sm text-white placeholder-zinc-500 focus:outline-none resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleQuickSubmit();
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => handleQuickSubmit()}
                  disabled={isSubmitting || !prompt.trim()}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Running...' : 'Send'}</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
