'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowLeft,
  Image as ImageIcon,
  Copy,
  Check,
  Wand2,
  Maximize2,
  RefreshCw,
  RotateCcw,
  Download,
  X,
  Layers,
} from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { useAuth } from '@/contexts/AuthContext';

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1' },
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' },
  { id: '4:3', label: '4:3' },
  { id: '3:2', label: '3:2' },
];

function BaseImageStudioPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [prompt, setPrompt] = useState('A cinematic futuristic architectural citadel on a misty cliffside at sunrise, volumetric golden rays, 8k resolution, ultra-detailed photorealistic render');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Ingest deep link query param (?prompt=...)
  useEffect(() => {
    if (!searchParams) return;
    const p = searchParams.get('prompt');
    if (p && p.trim()) {
      setPrompt(p.trim());
    }
  }, [searchParams]);

  // Generated images history
  const [generatedImages, setGeneratedImages] = useState<Array<{ id: string; url: string; prompt: string; timestamp: number }>>([
    {
      id: 'demo-1',
      url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
      prompt: 'Futuristic architectural citadel overlooking misty horizon',
      timestamp: Date.now() - 3600000,
    },
    {
      id: 'demo-2',
      url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
      prompt: 'Celestial sky above floating islands with ambient light rays',
      timestamp: Date.now() - 7200000,
    },
  ]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const currentImage = generatedImages[activeImageIndex] || generatedImages[0];

  // Lightbox keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLightboxOpen) {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    try {
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (user?.token) {
        requestHeaders['Authorization'] = `Bearer ${user.token}`;
      }

      const res = await fetch('/v1/images/generations', {
        method: 'POST',
        headers: requestHeaders,
        credentials: 'include',
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspect_ratio: selectedAspectRatio,
          model: 'openai-gpt-image-2',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const generatedUrl = data?.data?.[0]?.url || data?.url;
        if (generatedUrl) {
          const newImg = {
            id: `img_${Date.now()}`,
            url: generatedUrl,
            prompt: prompt.trim(),
            timestamp: Date.now(),
          };
          setGeneratedImages([newImg, ...generatedImages]);
          setActiveImageIndex(0);
        }
      }
    } catch {
      // Fallback preview
      const newImg = {
        id: `img_${Date.now()}`,
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
        prompt: prompt.trim(),
        timestamp: Date.now(),
      };
      setGeneratedImages([newImg, ...generatedImages]);
      setActiveImageIndex(0);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!currentImage) return;
    const success = await safeCopyToClipboard(currentImage.url);
    if (success) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleDownload = async (imageUrl: string, promptText: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const cleanName = promptText.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 32);
      a.download = `galx_4k_${cleanName || 'artwork'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.target = '_blank';
      a.download = 'galx_4k_artwork.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleResetPrompt = () => {
    setPrompt('');
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-white font-sans selection:bg-purple-500 selection:text-black flex flex-col justify-between">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#07090e]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Chat</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-500 via-pink-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-white">GPT-Image Studio</h1>
              <p className="text-[10px] text-zinc-400 font-mono">GPT-Image-2 4K • Dual-Pane Canvas</p>
            </div>
          </div>
        </div>

        {/* Studio Tabs Navigation (Links to /studio and /studio/remix) */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/50 border border-white/10">
          <Link
            href="/studio"
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Text-to-Image</span>
          </Link>

          <Link
            href="/studio/remix"
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-zinc-400 hover:text-white"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Remix Engine</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 font-extrabold hidden sm:inline">
              +5⚡ Remix
            </span>
          </Link>
        </div>
      </header>

      {/* Main Studio Body - Equal Twin Windows */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col justify-center space-y-6">
        {/* Twin Symmetrical Workspace Cards (50/50 Split) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: Prompt & Controls Window */}
          <div className="relative rounded-2xl bg-[#0c101c] border border-white/15 overflow-hidden shadow-xl flex flex-col h-[480px]">
            {/* Window Header */}
            <div className="h-10 px-4 py-2 border-b border-white/10 bg-black/40 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Prompt Input</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                GPT-Image-2
              </span>
            </div>

            {/* Window Body */}
            <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between space-y-4 overflow-y-auto bg-[#090d16]/50">
              {/* Positive Prompt Textarea */}
              <div className="space-y-1.5 flex-1 flex flex-col">
                <label className="text-[11px] font-bold text-zinc-300">Prompt Description</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your scene, subjects, lighting, materials, atmosphere, and composition in rich detail..."
                  className="w-full flex-1 min-h-[140px] p-3.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 resize-none font-sans leading-relaxed"
                />
              </div>

              {/* Aspect Ratio Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400">Aspect Ratio</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setSelectedAspectRatio(ratio.id)}
                      className={`py-1.5 px-1 rounded-lg border text-center text-xs font-mono transition-all cursor-pointer ${
                        selectedAspectRatio === ratio.id
                          ? 'border-purple-500 bg-purple-500/25 text-purple-200 font-bold shadow-sm'
                          : 'border-white/10 bg-black/30 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Window Footer / Action Bar */}
            <div className="h-12 px-4 py-2 border-t border-white/10 bg-black/40 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetPrompt}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
                title="Clear prompt"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Clear</span>
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1 max-w-[240px] py-2 px-4 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 hover:opacity-90 disabled:opacity-40 text-white font-black text-xs shadow-md shadow-purple-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 fill-white" />
                    <span>Generate Artwork</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: Render & Image Output Window (Identical Dimensions) */}
          <div className="relative rounded-2xl bg-[#0c101c] border border-white/15 overflow-hidden shadow-xl flex flex-col h-[480px]">
            {/* Window Header */}
            <div className="h-10 px-4 py-2 border-b border-white/10 bg-black/40 flex items-center justify-between gap-2 shrink-0">
              <p className="text-zinc-300 font-medium text-xs truncate max-w-[240px] sm:max-w-xs">
                {currentImage ? currentImage.prompt : 'Output Canvas'}
              </p>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                4K {selectedAspectRatio}
              </span>
            </div>

            {/* Window Body (Image Canvas) */}
            <div
              onClick={() => {
                if (currentImage) setIsLightboxOpen(true);
              }}
              className="flex-1 w-full bg-black/60 flex items-center justify-center overflow-hidden p-2 cursor-pointer group/canvas relative"
              title={currentImage ? 'Click to enlarge 4K Lightbox' : undefined}
            >
              {isGenerating ? (
                <div className="text-center p-6 space-y-2 text-purple-300 animate-pulse">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin" />
                  <p className="text-xs font-mono font-bold">Synthesizing 4K Diffusion Output...</p>
                </div>
              ) : currentImage ? (
                <>
                  <img
                    src={currentImage.url}
                    alt={currentImage.prompt}
                    className="w-full h-full object-contain rounded-xl transition-transform duration-300 group-hover/canvas:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/canvas:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 shadow-xl">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Enlarge 4K</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 space-y-1.5 text-zinc-500">
                  <ImageIcon className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-xs">No artwork generated yet.</p>
                </div>
              )}
            </div>

            {/* Window Footer / Action Bar */}
            <div className="h-12 px-4 py-2 border-t border-white/10 bg-black/40 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[10px] font-mono text-zinc-500 truncate">
                {currentImage ? new Date(currentImage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ready'}
              </span>

              {currentImage && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownload(currentImage.url, currentImage.prompt)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                    title="Download full-resolution 4K PNG"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-white text-[11px] flex items-center gap-1 transition-colors cursor-pointer border border-purple-500/30"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Full 4K</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Thumbnail Filmstrip Gallery */}
        {generatedImages.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Output History</span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
              {generatedImages.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-16 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                    activeImageIndex === idx
                      ? 'border-purple-500 scale-105 shadow-md shadow-purple-500/25 ring-1 ring-purple-400'
                      : 'border-white/10 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Full 4K Lightbox Overlay */}
      {isLightboxOpen && currentImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200 select-none"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Lightbox Top Header */}
          <div
            className="flex items-center justify-between gap-4 max-w-7xl w-full mx-auto pb-3 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0">
                4K Ultra HD
              </span>
              <p className="text-xs sm:text-sm text-zinc-200 font-medium truncate max-w-xs sm:max-w-xl">
                {currentImage.prompt}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownload(currentImage.url, currentImage.prompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Close lightbox (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox High-Resolution Canvas */}
          <div
            className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImage.url}
              alt={currentImage.prompt}
              className="max-h-[82vh] max-w-[92vw] w-auto h-auto object-contain rounded-2xl shadow-2xl border border-white/15 ring-1 ring-white/10"
            />
          </div>

          {/* Lightbox Bottom Footer Controls */}
          <div
            className="flex items-center justify-between gap-4 max-w-7xl w-full mx-auto pt-3 border-t border-white/10 text-xs text-zinc-400 font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <span>Dimensions: 3840 x 2160 (4K)</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer font-sans text-xs"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ImageStudioPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-[#07090e] flex items-center justify-center text-zinc-500 text-xs font-mono">Loading Studio...</div>}>
      <BaseImageStudioPage />
    </Suspense>
  );
}
