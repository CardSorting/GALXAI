'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  MessageSquare,
  Github,
  ArrowRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export function DocsFeedback({ docTitle }: { docTitle: string }) {
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="pt-8 border-t border-white/10 space-y-6 font-mono text-xs">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10">
        <div className="space-y-1 text-center md:text-left">
          <h3 className="text-sm font-bold text-white font-sans">Was this guide helpful?</h3>
          <p className="text-zinc-400 text-xs font-sans">Help us improve the GALXAI developer experience and reference recipes.</p>
        </div>

        {isSubmitted ? (
          <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Thank you for your feedback!</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setFeedback('yes'); setIsSubmitted(true); }}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white hover:text-emerald-400 hover:border-emerald-500/40 transition-all flex items-center gap-1.5 cursor-pointer border border-white/10 font-bold"
            >
              <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Yes, helpful</span>
            </button>

            <button
              onClick={() => setFeedback('no')}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white hover:text-rose-400 hover:border-rose-500/40 transition-all flex items-center gap-1.5 cursor-pointer border border-white/10 font-bold"
            >
              <ThumbsDown className="w-3.5 h-3.5 text-rose-400" />
              <span>Could be better</span>
            </button>
          </div>
        )}
      </div>

      {feedback === 'no' && !isSubmitted && (
        <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3">
          <label className="text-zinc-400 text-[11px] font-sans">How can we improve this documentation?</label>
          <textarea
            required
            rows={2}
            placeholder="Missing code example, unclear parameter, or broken link..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-3 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-all cursor-pointer"
            >
              Submit Feedback
            </button>
          </div>
        </form>
      )}

      {/* DevRel Community Links */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-black/30 border border-white/5 text-zinc-400 text-[11px]">
        <div className="flex items-center gap-4">
          <Link
            href="https://github.com/CardSorting/GALXAI"
            target="_blank"
            className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Repository</span>
            <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
          </Link>

          <span>•</span>

          <Link
            href="/docs/api-reference"
            className="flex items-center gap-1.5 text-cyan-300 hover:underline"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Explore API Reference</span>
          </Link>
        </div>

        <Link
          href="/keys"
          className="text-amber-300 font-bold hover:underline flex items-center gap-1"
        >
          <span>Mint API Key →</span>
        </Link>
      </div>
    </div>
  );
}
