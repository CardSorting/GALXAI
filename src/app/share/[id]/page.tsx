'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Share2,
  ArrowLeft,
  Copy,
  Check,
  Download,
  Sparkles,
  Bot,
  User,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { ChatMessage } from '@/components/chat/ChatMessageItem';

export default function SharedConversationPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionTitle, setSessionTitle] = useState('Shared Conversation');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    try {
      const stored = localStorage.getItem(`galx_messages_${sessionId}`);
      if (stored) {
        setMessages(JSON.parse(stored));
      }

      const sessionsStored = localStorage.getItem('galx_chat_sessions_v1');
      if (sessionsStored) {
        const sessions = JSON.parse(sessionsStored);
        const match = sessions.find((s: any) => s.id === sessionId);
        if (match) setSessionTitle(match.title);
      }
    } catch {}

    setLoading(false);
  }, [sessionId]);

  const handleCopyLink = async () => {
    const success = await safeCopyToClipboard(window.location.href);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleForkChat = () => {
    router.push(`/?session=${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-white font-sans selection:bg-indigo-500 selection:text-black">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#07090e]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/share"
            className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">All Shares</span>
          </Link>
          <div>
            <h1 className="text-sm sm:text-base font-black text-white truncate max-w-sm sm:max-w-md">
              {sessionTitle}
            </h1>
            <p className="text-[10px] text-zinc-400 font-mono">Shared Conversation • Read Only Transcript</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="font-mono text-[11px]">{copied ? 'Copied' : 'Copy Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleForkChat}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 text-white font-black text-xs shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
          >
            <span>Continue in GALX</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Conversation Transcript */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {loading ? (
          <div className="text-center py-16 text-xs text-zinc-400">Loading conversation...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-xs text-zinc-400">
            No messages recorded for this shared session.
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`p-5 rounded-3xl border ${
                    isUser
                      ? 'bg-[#0f1424] border-cyan-500/20 ml-auto max-w-2xl'
                      : 'bg-[#0c101c] border-white/10 max-w-3xl'
                  } space-y-2`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {isUser ? (
                      <>
                        <User className="w-4 h-4 text-cyan-400" />
                        <span className="text-cyan-200">User</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-pink-400 fill-pink-400" />
                        <span className="text-pink-300">GALX AI</span>
                      </>
                    )}
                    <span className="text-[10px] font-mono text-zinc-500 font-normal">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="text-xs sm:text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans">
                    {msg.content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
