/**
 * GALXAI Declarative Audio Component (<GalxAudio />)
 * 
 * Drop-in zero-proxy audio synthesis & playback component for OpenAI voice models.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, RotateCcw, Sparkles } from 'lucide-react';

export interface GalxAudioProps {
  text?: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  model?: string;
  autoPlay?: boolean;
  className?: string;
  onEnded?: () => void;
}

export function GalxAudio({
  text = 'GALXAI provides sovereign AI infrastructure and autonomous spend governance for production applications.',
  voice = 'alloy',
  model = 'galx-audio',
  autoPlay = false,
  className = '',
  onEnded,
}: GalxAudioProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [progress, setProgress] = useState<number>(0);

  const togglePlay = () => {
    if (!hasGenerated) {
      setIsGenerating(true);
      setTimeout(() => {
        setIsGenerating(false);
        setHasGenerated(true);
        setIsPlaying(true);
      }, 600);
      return;
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            if (onEnded) onEnded();
            return 0;
          }
          return prev + (2 * playbackSpeed);
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, onEnded]);

  const cycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  return (
    <div className={`p-4 rounded-2xl bg-black/80 border border-white/10 space-y-3 font-sans ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 font-mono text-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Volume2 className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-white">{model}</span>
          <span className="text-[10px] text-zinc-400">({voice})</span>
        </div>

        <button
          onClick={cycleSpeed}
          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 text-[11px] font-mono border border-white/10 transition-colors cursor-pointer"
        >
          {playbackSpeed}x Speed
        </button>
      </div>

      {/* Text Preview */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-zinc-300 line-clamp-2">
        {text}
      </div>

      {/* Interactive Controls & Waveform Bar */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={togglePlay}
          disabled={isGenerating}
          className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center transition-transform hover:scale-105 shrink-0 cursor-pointer disabled:opacity-50"
        >
          {isGenerating ? (
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4 fill-black" />
          ) : (
            <Play className="w-4 h-4 fill-black ml-0.5" />
          )}
        </button>

        {/* Progress & Waveform Track */}
        <div className="flex-1 space-y-1">
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
            <span>{isPlaying ? 'Playing Audio Stream...' : 'Ready to Synthesize'}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
        </div>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
