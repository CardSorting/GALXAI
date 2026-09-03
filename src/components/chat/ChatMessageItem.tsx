'use client';

import React, { useState } from 'react';
import {
  Zap,
  User,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Brain,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Coins,
  Edit2,
  Clock,
  Activity,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Flame,
  Code2,
  Bot,
  Sliders,
  Eye,
  Minimize2
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { CustomPersona } from './PersonaContracts';

const ICON_MAP: Record<string, React.ElementType> = {
  ShieldCheck,
  Zap,
  Coins,
  Flame,
  Brain,
  Sparkles,
  Code2,
  Bot,
};

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  textContent?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  alternativeContents?: string[];
  activeIndex?: number;
  createdAt: number;
  modelId?: string;
  thinkingContent?: string;
  personaId?: string;
  attachments?: AttachedFile[];
  metrics?: {
    ttftMs?: number;
    throughputTokSec?: number;
    tokens?: number;
    cacheSavings?: string;
    compacted?: boolean;
    compactedTurns?: number;
  };
}

interface ChatMessageItemProps {
  message: ChatMessage;
  isStreaming?: boolean;
  activePersona?: CustomPersona | null;
  onRegenerate?: () => void;
  onEditPrompt?: (content: string) => void;
  onSwipeAlternative?: (messageId: string, direction: 'prev' | 'next') => void;
  onRatingChange?: (messageId: string, rating: 'up' | 'down') => void;
}

export function ChatMessageItem({
  message,
  isStreaming,
  activePersona,
  onRegenerate,
  onEditPrompt,
  onSwipeAlternative,
  onRatingChange,
}: ChatMessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [thinkingExpanded, setThinkingExpanded] = useState(true);

  // Alternative responses for Character.AI style swiper
  const alternatives = message.alternativeContents || [message.content];
  const activeIdx = message.activeIndex || 0;
  const currentDisplayContent = alternatives[activeIdx] || message.content;

  const handleCopy = async () => {
    const success = await safeCopyToClipboard(currentDisplayContent);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="w-full py-4 group flex justify-end">
        <div className="max-w-2xl w-full flex items-start justify-end gap-3">
          <div className="flex flex-col items-end space-y-1.5 min-w-0">
            {/* User Message Bubble */}
            <div className="px-4 py-3 rounded-3xl bg-[#1e2333] border border-white/10 text-white text-[14px] leading-relaxed select-text shadow-lg space-y-2">
              {/* Render Attachments if any */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-1">
                  {message.attachments.map((file) => (
                    <div key={file.id} className="relative group/att">
                      {file.dataUrl ? (
                        <div className="relative rounded-xl overflow-hidden border border-white/20 max-w-[200px] max-h-[160px] bg-black/40">
                          <img
                            src={file.dataUrl}
                            alt={file.name}
                            className="object-cover w-full h-full rounded-xl"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-zinc-300 font-mono">
                          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="truncate max-w-[140px]">{file.name}</span>
                          <span className="text-[10px] text-zinc-500">
                            {(file.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {message.content && (
                <p className="whitespace-pre-wrap font-sans">{message.content}</p>
              )}
            </div>

            {/* Hover Actions */}
            <div className="hidden group-hover:flex items-center gap-2 text-[11px] text-zinc-400 font-mono pr-2">
              {onEditPrompt && (
                <button
                  type="button"
                  onClick={() => onEditPrompt(message.content)}
                  className="hover:text-cyan-400 flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleCopy}
                className="hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="w-7 h-7 rounded-xl bg-zinc-800 border border-white/15 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5 shadow-md">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  // Assistant / Anime Character Message
  const PersonaIcon = activePersona ? ICON_MAP[activePersona.avatarIcon] || Sparkles : Zap;
  const avatarGradient = activePersona?.avatarGradient || 'from-cyan-500 via-indigo-600 to-indigo-700';

  return (
    <div className="w-full py-4 group flex justify-start">
      <div className="max-w-3xl w-full flex items-start gap-3.5">
        {/* Avatar Badge */}
        <div className="relative shrink-0 mt-0.5">
          <div className={`w-8 h-8 rounded-2xl bg-gradient-to-tr ${avatarGradient} flex items-center justify-center text-white shadow-md border border-white/20 ${
            isStreaming ? 'animate-pulse' : ''
          }`}>
            <PersonaIcon className="w-4 h-4 fill-white" />
          </div>
        </div>

        {/* Assistant Content Container */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Header Tag / Character info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
              <span className="font-bold text-white font-sans text-xs">
                {activePersona ? activePersona.name : 'GALX AI'}
              </span>
              {activePersona && (
                <span className="text-pink-400 font-semibold">{activePersona.handle}</span>
              )}
              <span>•</span>
              <span className="text-cyan-400">{message.modelId || activePersona?.baseModelId || 'gpt-5.6-sol'}</span>
            </div>

            {/* Character.AI Swiper Controls */}
            {alternatives.length > 1 && !isStreaming && onSwipeAlternative && (
              <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                <button
                  disabled={activeIdx === 0}
                  onClick={() => onSwipeAlternative(message.id, 'prev')}
                  className="hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-1 text-zinc-300 font-bold">
                  {activeIdx + 1}/{alternatives.length}
                </span>
                <button
                  disabled={activeIdx === alternatives.length - 1}
                  onClick={() => onSwipeAlternative(message.id, 'next')}
                  className="hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Collapsible Thinking / Reasoning Section */}
          {message.thinkingContent && (
            <div className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setThinkingExpanded(!thinkingExpanded)}
                className="w-full px-3.5 py-2 flex items-center justify-between bg-white/[0.02] text-zinc-400 hover:text-zinc-200 transition-colors font-mono cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-bold text-zinc-300">Deep Reasoning Trace</span>
                  <span className="text-[10px] text-zinc-500">(1.4s compute)</span>
                </div>
                {thinkingExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                )}
              </button>
              {thinkingExpanded && (
                <div className="p-3.5 text-zinc-400 font-mono text-[12px] leading-relaxed border-t border-white/5 bg-black/60 whitespace-pre-wrap">
                  {message.thinkingContent}
                </div>
              )}
            </div>
          )}

          {/* Formatted Markdown Content */}
          <MarkdownRenderer content={currentDisplayContent} isStreaming={isStreaming} />

          {/* Telemetry Metrics Bar */}
          {message.metrics && !isStreaming && (
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-zinc-400 pt-1">
              {message.metrics.ttftMs && (
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-cyan-400" />
                  <span>{message.metrics.ttftMs}ms TTFT</span>
                </span>
              )}
              {message.metrics.throughputTokSec && (
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 flex items-center gap-1">
                  <Activity className="w-2.5 h-2.5 text-emerald-400" />
                  <span>{message.metrics.throughputTokSec} tok/s</span>
                </span>
              )}
              {message.metrics.tokens && (
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                  {message.metrics.tokens} tokens
                </span>
              )}
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-1">
                <Coins className="w-2.5 h-2.5 text-amber-400" />
                <span>{message.metrics.cacheSavings || '75% Continuous Cache'}</span>
              </span>
              {message.metrics.compacted !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    message.metrics.compacted
                      ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-300'
                      : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                  }`}
                  title={
                    message.metrics.compacted
                      ? `Context Compaction Active: ${message.metrics.compactedTurns ?? 'prior'} intermediate turns compressed.`
                      : 'Raw Prompt Mode: Untransformed prompt delivered verbatim.'
                  }
                >
                  <Minimize2 className="w-2.5 h-2.5" />
                  <span>
                    {message.metrics.compacted
                      ? `Compacted${message.metrics.compactedTurns ? ` (-${message.metrics.compactedTurns} turns)` : ''}`
                      : 'Raw Prompt'}
                  </span>
                </span>
              )}
            </div>
          )}

          {/* Bottom Message Actions */}
          {!isStreaming && (
            <div className="flex items-center gap-1 pt-1 text-zinc-400">
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                title="Copy response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Generate alternative response (Character.AI Swipe)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => {
                  const nextRating = rating === 'up' ? null : 'up';
                  setRating(nextRating);
                  if (nextRating && onRatingChange) onRatingChange(message.id, nextRating);
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  rating === 'up' ? 'text-emerald-400 bg-emerald-500/10' : 'hover:bg-white/10 hover:text-white'
                }`}
                title="Good response"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  const nextRating = rating === 'down' ? null : 'down';
                  setRating(nextRating);
                  if (nextRating && onRatingChange) onRatingChange(message.id, nextRating);
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  rating === 'down' ? 'text-red-400 bg-red-500/10' : 'hover:bg-white/10 hover:text-white'
                }`}
                title="Bad response"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
