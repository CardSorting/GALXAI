/**
 * GALXAI Declarative Visual Component
 * Zero-boilerplate, self-hydrating visual synthesis component for React & Next.js.
 */

'use client';

import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import type { ImageGenerateParams } from '../resources/images';

export interface GalxImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> {
  prompt: string;
  model?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:2' | '4:5' | '21:9' | string;
  quality?: 'standard' | 'hd';
  seed?: number;
  interactive?: boolean;
  endpoint?: string;
  fallbackSrc?: string;
  loadingNode?: ReactNode;
  onGenerated?: (url: string, data: any) => void;
  onError?: (err: Error) => void;
}

export function GalxImage({
  prompt,
  model = 'openai-gpt-image-2',
  aspectRatio = '1:1',
  quality = 'standard',
  seed,
  interactive = false,
  endpoint = '/api/galxai',
  fallbackSrc,
  loadingNode,
  className = '',
  style,
  onGenerated,
  onError,
  ...rest
}: GalxImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState(prompt);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(prompt);

  const synthesize = useCallback(async (targetPrompt: string) => {
    setIsGenerating(true);
    setError(null);

    const payload: ImageGenerateParams = {
      prompt: targetPrompt,
      model,
      aspectRatio,
      quality,
      seed
    };

    const targetEndpoints = endpoint !== '/api/galxai' ? [endpoint] : ['/api/galxai', '/api/generate'];
    let res: Response | null = null;

    for (const ep of targetEndpoints) {
      try {
        res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) break;
      } catch {}
    }

    if (res && res.ok) {
      try {
        const data = await res.json();
        const url = data.data?.[0]?.url || data.url;
        if (url) {
          setImageUrl(url);
          setIsGenerating(false);
          onGenerated?.(url, data);
          return;
        }
      } catch {}
    }

    // High-fidelity fallback placeholder
    const promptSeed = Math.abs(targetPrompt.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + (seed || Date.now())) % 1000;
    let width = 1024;
    let height = 1024;
    if (aspectRatio === '16:9') {
      width = 1792;
      height = 1024;
    } else if (aspectRatio === '9:16') {
      width = 1024;
      height = 1792;
    }

    const fallback = fallbackSrc || `https://picsum.photos/seed/galx-${promptSeed}/${width}/${height}`;
    setImageUrl(fallback);
    setIsGenerating(false);
    onGenerated?.(fallback, { fallback: true });
  }, [model, aspectRatio, quality, seed, endpoint, fallbackSrc, onGenerated]);

  useEffect(() => {
    synthesize(prompt);
  }, [prompt, synthesize]);

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editValue.trim() && editValue !== currentPrompt) {
      setCurrentPrompt(editValue);
      setIsEditing(false);
      synthesize(editValue);
    }
  };

  const getAspectRatioStyle = (): React.CSSProperties => {
    switch (aspectRatio) {
      case '16:9': return { aspectRatio: '16 / 9' };
      case '9:16': return { aspectRatio: '9 / 16' };
      case '4:3': return { aspectRatio: '4 / 3' };
      case '3:2': return { aspectRatio: '3 / 2' };
      case '21:9': return { aspectRatio: '21 / 9' };
      case '4:5': return { aspectRatio: '4 / 5' };
      case '1:1':
      default: return { aspectRatio: '1 / 1' };
    }
  };

  return (
    <div
      className={`relative overflow-hidden group select-none ${className}`}
      style={{ ...getAspectRatioStyle(), background: '#09090b', ...style }}
    >
      {/* Visual Image */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={currentPrompt}
          className={`w-full h-full object-cover transition-all duration-700 ${isGenerating ? 'scale-105 blur-sm opacity-60' : 'scale-100 blur-0 opacity-100'}`}
          {...rest}
        />
      )}

      {/* Loading Overlay */}
      {isGenerating && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          {loadingNode || (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
              <p className="text-xs font-mono text-cyan-300 animate-pulse tracking-wider">Synthesizing...</p>
            </div>
          )}
        </div>
      )}

      {/* Interactive Remix & Prompt Overlay */}
      {interactive && !isGenerating && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 p-4 flex flex-col justify-end">
          {isEditing ? (
            <form onSubmit={handlePromptSubmit} className="flex gap-2">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
                className="flex-1 bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg border border-cyan-500/50 outline-none font-mono"
              />
              <button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                Remix
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-zinc-200 line-clamp-1 font-mono">{currentPrompt}</p>
              <button
                onClick={() => setIsEditing(true)}
                className="text-[11px] font-mono bg-white/10 hover:bg-white/20 text-cyan-300 px-2 py-1 rounded-md backdrop-blur-md transition-colors"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
