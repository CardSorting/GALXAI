'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ArrowDown, Sparkles } from 'lucide-react';
import { ChatMessageItem, ChatMessage } from './ChatMessageItem';
import { ChatEmptyState } from './ChatEmptyState';
import { CustomPersona } from './PersonaContracts';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingMessageId?: string;
  activePersona?: CustomPersona | null;
  onSelectPrompt: (prompt: string, modelId: string) => void;
  onRegenerateLast: () => void;
  onEditPrompt: (content: string) => void;
  onSwipeAlternative?: (messageId: string, direction: 'prev' | 'next') => void;
  onOpenCharacterHub?: () => void;
  onRatingChange?: (messageId: string, rating: 'up' | 'down') => void;
}

export function ChatMessageList({
  messages,
  isStreaming,
  streamingMessageId,
  activePersona,
  onSelectPrompt,
  onRegenerateLast,
  onEditPrompt,
  onSwipeAlternative,
  onOpenCharacterHub,
  onRatingChange,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Auto-scroll to bottom when messages change or while streaming
  useEffect(() => {
    if (!showScrollBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming, showScrollBottom]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isFarFromBottom);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottom(false);
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center overflow-y-auto">
        <ChatEmptyState
          activePersona={activePersona}
          onSelectPrompt={onSelectPrompt}
          onOpenCharacterHub={onOpenCharacterHub}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-2 relative"
    >
      <div className="max-w-3xl mx-auto divide-y divide-white/5">
        {messages.map((message, idx) => (
          <React.Fragment key={message.id || idx}>
            {idx === 1 && messages.length > 8 && (
              <div className="py-2.5 my-1 flex items-center justify-center">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-[11px] font-mono text-cyan-300 shadow-sm">
                  <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <span>Rolling Memory Active: {messages.length - 6} earlier turns preserved in frontier context</span>
                </div>
              </div>
            )}
            <ChatMessageItem
              message={message}
              isStreaming={isStreaming && message.id === streamingMessageId}
              activePersona={activePersona}
              onRegenerate={idx === messages.length - 1 && message.role === 'assistant' ? onRegenerateLast : undefined}
              onEditPrompt={message.role === 'user' ? onEditPrompt : undefined}
              onSwipeAlternative={onSwipeAlternative}
              onRatingChange={onRatingChange}
            />
          </React.Fragment>
        ))}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Floating Jump to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-8 z-30 p-2.5 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-2xl border border-white/20 transition-all cursor-pointer hover:scale-105 animate-in fade-in"
          title="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
