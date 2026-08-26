/**
 * GALXAI Declarative Chat Component
 * Complete streaming chat UI with zero boilerplate.
 */

'use client';

import React from 'react';
import { useChat } from '../react';

export interface GalxChatProps {
  systemPrompt?: string;
  model?: string;
  placeholder?: string;
  className?: string;
  initialMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  endpoint?: string;
}

export function GalxChat({
  systemPrompt,
  model = 'gpt-5.6-sol',
  placeholder = 'Ask a question or enter a command...',
  className = '',
  initialMessages = [],
  endpoint = '/api/galxai/chat'
}: GalxChatProps) {
  const { messages, input, setInput, sendMessage, isStreaming } = useChat({
    defaultModel: model,
    initialMessages,
    endpoint
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isStreaming) {
      sendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full min-h-[400px] bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden font-sans ${className}`}>
      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-3 font-mono font-bold">
              AI
            </div>
            <p className="text-sm font-medium text-zinc-400">GALXAI Assistant Ready</p>
            <p className="text-xs text-zinc-600 mt-1 max-w-xs">Ask questions, analyze data, or synthesize ideas.</p>
          </div>
        ) : (
          messages.map((m, idx) => (
            <div
              key={m.id || idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-cyan-500 text-black font-medium'
                    : 'bg-zinc-900 text-zinc-100 border border-zinc-800'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="p-3 bg-zinc-900/60 border-t border-zinc-800/80 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={isStreaming}
          className="flex-1 bg-zinc-950 text-white text-sm px-4 py-2.5 rounded-xl border border-zinc-800 focus:border-cyan-500/50 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-black font-semibold px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-1.5"
        >
          {isStreaming ? (
            <span className="w-4 h-4 rounded-full border-2 border-black/40 border-t-black animate-spin" />
          ) : (
            'Send'
          )}
        </button>
      </form>
    </div>
  );
}
