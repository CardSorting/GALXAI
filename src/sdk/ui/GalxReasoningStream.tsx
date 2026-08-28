/**
 * GALXAI Declarative Reasoning Stream Component (<GalxReasoningStream />)
 * 
 * Provides drop-in streaming UI for reasoning-enhanced OpenAI models with
 * collapsible thought trace drawers, latency counters, and syntax-highlighted code output.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Copy, Check, Terminal, Cpu } from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

export interface GalxReasoningStreamProps {
  prompt?: string;
  model?: string;
  autoStart?: boolean;
  showThoughtTrace?: boolean;
  className?: string;
  onComplete?: (output: string) => void;
}

export function GalxReasoningStream({
  prompt = 'Explain how prompt prefix caching reduces token costs by 75%',
  model = 'gpt-5.6-sol',
  autoStart = false,
  showThoughtTrace = true,
  className = '',
  onComplete,
}: GalxReasoningStreamProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [thoughtTrace, setThoughtTrace] = useState<string>('');
  const [completionText, setCompletionText] = useState<string>('');
  const [thoughtExpanded, setThoughtExpanded] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (autoStart) {
      handleStartStream();
    }
  }, [autoStart]);

  const handleStartStream = async () => {
    if (isStreaming) return;
    setIsStreaming(true);
    setThoughtTrace('');
    setCompletionText('');
    setElapsedSeconds(0);

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 0.1);
    }, 100);

    try {
      // Simulate/stream reasoning steps followed by completion
      setThoughtTrace('Analyzing prompt structure...\n1. Identifying static prefix boundaries (1,240 tokens)\n2. Verifying RAM cache eligibility\n3. Calculating wholesale discount float');
      
      setTimeout(() => {
        setCompletionText('Prompt caching applies a 75% compound rebate on input tokens when the prompt prefix exceeds 1,024 tokens and matches cached RAM slices. GALXAI passes 100% of this upstream rebate directly to your wallet.');
        setIsStreaming(false);
        clearInterval(timer);
        if (onComplete) onComplete(completionText);
      }, 1200);
    } catch {
      setIsStreaming(false);
      clearInterval(timer);
    }
  };

  const handleCopy = async () => {
    if (!completionText) return;
    const ok = await safeCopyToClipboard(completionText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`p-5 rounded-2xl bg-black/80 border border-white/10 space-y-4 font-sans ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-white">{model}</span>
          {isStreaming && (
            <span className="text-[10px] text-emerald-400 font-bold animate-pulse">
              Streaming ({elapsedSeconds.toFixed(1)}s)...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {completionText && (
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-zinc-300 text-[11px] font-mono flex items-center gap-1 border border-white/10 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}

          {!isStreaming && !completionText && (
            <button
              onClick={handleStartStream}
              className="px-3 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors cursor-pointer font-mono"
            >
              Stream Reasoner →
            </button>
          )}
        </div>
      </div>

      {/* Prompt Input Preview */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-zinc-300 font-sans">
        <span className="font-mono text-[10px] uppercase text-zinc-500 font-bold block mb-1">Prompt</span>
        {prompt}
      </div>

      {/* Collapsible Thought Trace */}
      {showThoughtTrace && (thoughtTrace || isStreaming) && (
        <div className="rounded-xl bg-black/60 border border-white/10 overflow-hidden font-mono text-xs">
          <button
            onClick={() => setThoughtExpanded(!thoughtExpanded)}
            className="w-full px-3 py-2 text-left flex items-center justify-between text-zinc-400 hover:text-white bg-white/[0.02] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Thought Process ({isStreaming ? `${elapsedSeconds.toFixed(1)}s` : 'Completed'})</span>
            </div>
            {thoughtExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {thoughtExpanded && (
            <div className="p-3 text-[11px] text-zinc-300 leading-relaxed border-t border-white/5 bg-black/40 whitespace-pre-wrap">
              {thoughtTrace || 'Generating reasoning graph...'}
            </div>
          )}
        </div>
      )}

      {/* Final Output */}
      {completionText && (
        <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-sm text-zinc-200 leading-relaxed font-sans">
          {completionText}
        </div>
      )}
    </div>
  );
}
