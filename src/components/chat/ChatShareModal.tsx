'use client';

import React, { useState, useEffect } from 'react';
import { X, Share2, Copy, Check, FileText, Download, Sparkles } from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface ChatShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  messages: Array<{ id: string; role: 'user' | 'assistant' | 'system'; content: string; createdAt: number }>;
}

export function ChatShareModal({ isOpen, onClose, title, messages }: ChatShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  if (!isOpen) return null;

  const conversationMarkdown = `# ${title || 'GALX AI Conversation'}\n\n*Exported from GALX AI — Unified Frontier Model Gateway*\n\n---\n\n` +
    messages.map((m) => {
      const roleName = m.role === 'user' ? '👤 User' : '⚡ GALX AI';
      return `### ${roleName}\n\n${m.content}\n\n`;
    }).join('---\n\n');

  const handleCopyLink = async () => {
    if (typeof window !== 'undefined') {
      const success = await safeCopyToClipboard(window.location.href);
      if (success) {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    }
  };

  const handleCopyMarkdown = async () => {
    const success = await safeCopyToClipboard(conversationMarkdown);
    if (success) {
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    }
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([conversationMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(title || 'galx-chat').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-[#0b0e17] border border-white/15 p-6 shadow-2xl space-y-5 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Share or Export Chat</h2>
              <p className="text-xs text-zinc-400 truncate max-w-xs">{title || 'Current Conversation'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 font-sans">
          {/* Copy Link Option */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white">Share Session URL</p>
              <p className="text-[11px] text-zinc-400">Copy the current interface address</p>
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition-colors cursor-pointer shrink-0"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>

          {/* Copy Markdown Option */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export as Formatted Markdown</span>
              </p>
              <p className="text-[11px] text-zinc-400">Includes all code blocks, telemetry, and prompts</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition-colors cursor-pointer"
              >
                {copiedMarkdown ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMarkdown ? 'Copied' : 'Copy MD'}</span>
              </button>
              <button
                onClick={handleDownloadMarkdown}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Download .md file"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
