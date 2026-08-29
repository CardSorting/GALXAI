'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Share2,
  ArrowLeft,
  Copy,
  Check,
  Download,
  FileText,
  Sparkles,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { ChatSession } from '@/components/chat/ChatSidebar';
import { ChatMessage } from '@/components/chat/ChatMessageItem';

export default function ShareOverviewPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('galx_chat_sessions_v1');
      if (stored) {
        setSessions(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const handleCopyLink = async (sessionId: string) => {
    const url = `${window.location.origin}/share/${sessionId}`;
    const success = await safeCopyToClipboard(url);
    if (success) {
      setCopiedId(sessionId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleExportMarkdown = (session: ChatSession) => {
    let messages: ChatMessage[] = [];
    try {
      const stored = localStorage.getItem(`galx_messages_${session.id}`);
      if (stored) messages = JSON.parse(stored);
    } catch {}

    const text = messages
      .map((m) => `### ${m.role === 'user' ? 'User' : 'GALX AI'}\n\n${m.content}\n`)
      .join('\n---\n\n');

    const header = `# ${session.title}\n*Exported from GALX AI on ${new Date().toLocaleDateString()}*\n\n---\n\n`;
    const blob = new Blob([header + text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${session.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-white font-sans selection:bg-indigo-500 selection:text-black">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#07090e]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Chat</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-white">Share & Export Conversations</h1>
              <p className="text-[10px] text-zinc-400 font-mono">Public Links • Markdown Export • Session JSON</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Share List */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="bg-[#0c101c] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">Your Chat Sessions</h2>
              <p className="text-xs text-zinc-400">Generate public shareable links or download full transcripts</p>
            </div>
            <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/30">
              {sessions.length} Available
            </span>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12 space-y-3 text-zinc-500">
              <MessageSquare className="w-10 h-10 mx-auto stroke-1" />
              <p className="text-xs">No active chat sessions found yet. Start a chat first!</p>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
              >
                <span>Go to Chat</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-indigo-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                >
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate">{session.title}</h3>
                    <p className="text-[10px] font-mono text-zinc-400">
                      ID: {session.id} • {new Date(session.updatedAt || session.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(session.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-xs text-zinc-200 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedId === session.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span className="font-mono text-[11px]">{copiedId === session.id ? 'Copied' : 'Share Link'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportMarkdown(session)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-xs text-zinc-200 hover:text-white transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="font-mono text-[11px]">Markdown</span>
                    </button>

                    <Link
                      href={`/share/${session.id}`}
                      className="p-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-colors"
                      title="View Share Page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
