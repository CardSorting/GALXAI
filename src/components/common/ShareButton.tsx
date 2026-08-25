'use client';

import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { ShareModal } from './ShareModal';

interface ShareButtonProps {
  title?: string;
  description?: string;
  url?: string;
  variant?: 'icon' | 'pill' | 'button' | 'ghost';
  label?: string;
  className?: string;
}

export function ShareButton({
  title = 'GALXAI — Universal AI Model Router & Universal Gateway',
  description = 'One unified API for OpenAI Codex and frontier models with sub-15ms routing and 25%–40% wholesale token savings.',
  url,
  variant = 'pill',
  label = 'Share',
  className = '',
}: ShareButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

    // If mobile with Web Share API
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: targetUrl,
        });
        return;
      } catch (err: any) {
        // User aborted or unhandled error, open fallback modal
        if (err.name !== 'AbortError') {
          setModalOpen(true);
        }
        return;
      }
    }

    setModalOpen(true);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'icon':
        return 'p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-all cursor-pointer';
      case 'pill':
        return 'px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer';
      case 'button':
        return 'px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer';
      case 'ghost':
        return 'px-2 py-1 text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer';
      default:
        return 'px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer';
    }
  };

  return (
    <>
      <button
        onClick={handleShare}
        className={`${getVariantStyles()} ${className}`}
        title="Share this page"
        aria-label="Share this page"
      >
        <Share2 className="w-3.5 h-3.5 text-cyan-400" />
        {variant !== 'icon' && <span>{label}</span>}
      </button>

      <ShareModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={title}
        description={description}
        url={url}
      />
    </>
  );
}
