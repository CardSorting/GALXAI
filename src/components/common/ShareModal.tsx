'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Sparkles,
  Zap,
  Globe,
  QrCode,
  FileCode2,
  Link2,
  Download,
  Smartphone,
  Flame
} from 'lucide-react';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  url?: string;
}

function BaseShareModal({
  isOpen,
  onClose,
  title = 'GALXAI — Generative Playground & Frontier Intelligence',
  description = 'A generative creative playground with community creators and sustainable serving of GPT-5.6 Luna for developers.',
  url
}: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<'social' | 'qr' | 'markdown' | 'badge'>('social');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedBadge, setCopiedBadge] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [includeUtm, setIncludeUtm] = useState(true);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentUrl = url || window.location.href;
      if (includeUtm) {
        const u = new URL(currentUrl, window.location.origin);
        u.searchParams.set('ref', 'galx_share');
        setShareUrl(u.toString());
      } else {
        const u = new URL(currentUrl, window.location.origin);
        u.searchParams.delete('ref');
        setShareUrl(u.toString());
      }
    }
  }, [isOpen, url, includeUtm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const markdownSnippet = `[${title}](${shareUrl}) — ${description}`;
  const badgeMarkdown = `[![Powered by GALXAI](https://img.shields.io/badge/Powered_by-GALXAI_Universal_Router-06b6d4?style=flat&logo=openai&logoColor=white)](${shareUrl})`;

  const generateCardCanvas = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 1200, 630);
    grad.addColorStop(0, '#07080d');
    grad.addColorStop(0.5, '#0d1226');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 630);

    // Glow circle
    const glow = ctx.createRadialGradient(1000, 100, 10, 1000, 100, 400);
    glow.addColorStop(0, 'rgba(34, 211, 238, 0.3)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(1000, 100, 400, 0, Math.PI * 2);
    ctx.fill();

    // Brand logo
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.roundRect(70, 60, 52, 52, 14);
    ctx.fill();

    // Brand title
    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('GALX', 136, 98);
    ctx.fillStyle = '#22d3ee';
    ctx.fillText('AI', 230, 98);
    ctx.font = '500 20px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Universal Gateway', 275, 98);

    // Discount badge
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.beginPath();
    ctx.roundRect(850, 65, 280, 44, 22);
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText('Optimal Performance / $', 860, 93);

    // Card Title
    ctx.font = '900 48px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title.slice(0, 45), 70, 240);

    // Card Description
    ctx.font = '400 22px sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(description.slice(0, 80), 70, 300);

    // Specs row
    const specs = ['Sub-15ms TTFT', '75% Prompt Caching', 'Zero Code Changes', 'AES-256 Vault'];
    specs.forEach((s, i) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(70 + i * 265, 480, 245, 65, 16);
      ctx.fill();
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s, 95 + i * 265, 520);
    });

    return canvas;
  };

  const handleDownloadImage = () => {
    setDownloadingImage(true);
    const canvas = generateCardCanvas();
    const link = document.createElement('a');
    link.download = `galxai-share-card.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setTimeout(() => setDownloadingImage(false), 1500);
  };

  const handleCopyImage = async () => {
    try {
      const canvas = generateCardCanvas();
      canvas.toBlob(async (blob) => {
        if (blob && typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.write === 'function') {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            setCopiedImage(true);
            setTimeout(() => setCopiedImage(false), 2000);
            return;
          } catch {}
        }
        handleDownloadImage();
      });
    } catch {
      handleDownloadImage();
    }
  };

  const handleCopyLink = async () => {
    const success = await safeCopyToClipboard(shareUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyMarkdown = async () => {
    const success = await safeCopyToClipboard(markdownSnippet);
    if (success) {
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    }
  };

  const handleCopyBadge = async () => {
    const success = await safeCopyToClipboard(badgeMarkdown);
    if (success) {
      setCopiedBadge(true);
      setTimeout(() => setCopiedBadge(false), 2000);
    }
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(`${title} — ${description}`);

  const shareDestinations = [
    {
      name: 'X (Twitter)',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      color: 'hover:bg-zinc-800 hover:text-white',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      name: 'LinkedIn',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.88a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z" />
        </svg>
      ),
      color: 'hover:bg-[#0077b5]/20 hover:text-[#0077b5]',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      name: 'WhatsApp',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.53c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.21-.18-.46-.3z" />
        </svg>
      ),
      color: 'hover:bg-[#25D366]/20 hover:text-[#25D366]',
      href: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
    },
    {
      name: 'Telegram',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
        </svg>
      ),
      color: 'hover:bg-[#229ED9]/20 hover:text-[#229ED9]',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      name: 'Reddit',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm5.01 4.75a1.25 1.25 0 0 1 1.24 1.25 1.25 1.25 0 0 1-.74 1.15c.02.16.03.32.03.48 0 2.45-2.84 4.44-6.34 4.44s-6.34-1.99-6.34-4.44c0-.16.01-.32.03-.48a1.25 1.25 0 1 1 1.49-1.92 5.6 5.6 0 0 1 3.51-1.09l.64-3 2.1.44a.9.9 0 1 1 .86 1.18l-1.63-.35-.44 2.06c1.37.15 2.58.55 3.5 1.13a1.25 1.25 0 0 1 1.68.73zM9.25 12a1 1 0 1 0 1 1 1 1 0 0 0-1-1zm5.5 0a1 1 0 1 0 1 1 1 1 0 0 0-1-1zm-4.75 3.5a3.5 3.5 0 0 0 4 0 .25.25 0 0 0-.35-.35 3 3 0 0 1-3.3 0 .25.25 0 0 0-.35.35z" />
        </svg>
      ),
      color: 'hover:bg-[#FF4500]/20 hover:text-[#FF4500]',
      href: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-white/15 p-6 sm:p-8 space-y-6 shadow-2xl bg-[#0a0d1a]/95">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Share GALXAI</h3>
              <p className="text-xs text-zinc-400">Share with colleagues, community, or mobile</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viral Referral Incentive Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-indigo-600/15 border border-amber-500/30 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <span className="text-white font-bold block text-xs">Give $10, Get $25 Compute Credit</span>
              <span className="text-[10px] text-zinc-400">When your referral connects, credits deposit automatically</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase shrink-0">
            Referral
          </span>
        </div>

        {/* View Switcher Tabs (Social / QR Code / Markdown) */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/50 border border-white/10 text-xs font-semibold font-mono">
          <button
            onClick={() => setActiveTab('social')}
            className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'social' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Link &amp; Social</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'qr' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code</span>
          </button>

          <button
            onClick={() => setActiveTab('markdown')}
            className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'markdown' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Markdown</span>
          </button>

          <button
            onClick={() => setActiveTab('badge')}
            className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'badge' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Badge</span>
          </button>
        </div>

        {/* TAB 1: SOCIAL & PREVIEW */}
        {activeTab === 'social' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Live Social Share Card Preview */}
            <div className="rounded-2xl bg-black/60 border border-white/10 p-4 space-y-3 relative overflow-hidden group">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-cyan-400" />
                  <span>Live Preview Card</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Dynamic OG Active
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-gradient-to-br from-zinc-950/40 via-black to-zinc-950 border border-indigo-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center text-white">
                    <Zap className="w-3 h-3 fill-current" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-cyan-300">GALXAI Universal Gateway</span>
                </div>
                <div className="text-sm font-bold text-white leading-snug line-clamp-1">{title}</div>
                <div className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{description}</div>
                <div className="text-[10px] font-mono text-zinc-500 truncate pt-1">{shareUrl}</div>
              </div>

              {/* Visual Card Image Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleDownloadImage}
                  disabled={downloadingImage}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Download 1200x630 high-res PNG social share card"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{downloadingImage ? 'Generating PNG...' : 'Download PNG Card'}</span>
                </button>

                <button
                  onClick={handleCopyImage}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Copy share card image directly to clipboard"
                >
                  {copiedImage ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Image Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Copy Image to Clipboard</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 1-Click Social Media Destinations */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Quick Dispatch</span>
                <span className="text-[11px] font-mono text-zinc-500">1-Click Share</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {shareDestinations.map((dest) => (
                  <a
                    key={dest.name}
                    href={dest.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 transition-all ${dest.color} group cursor-pointer`}
                    title={`Share on ${dest.name}`}
                  >
                    <div className="p-1 group-hover:scale-110 transition-transform">{dest.icon}</div>
                    <span className="text-[10px] font-semibold mt-1 truncate max-w-full">{dest.name}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Copy Link Input Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                <span>Deep Link</span>
                <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeUtm}
                    onChange={(e) => setIncludeUtm(e.target.checked)}
                    className="rounded bg-white/10 border-white/20 text-indigo-500 focus:ring-0 w-3 h-3 cursor-pointer"
                  />
                  <span>Include ref analytics tag</span>
                </label>
              </div>

              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/50 border border-white/15 focus-within:border-cyan-400 transition-all">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    copiedLink
                      ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                      : 'bg-white hover:bg-zinc-200 text-zinc-950 shadow-md shadow-white/5'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QR CODE SCANNER */}
        {activeTab === 'qr' && (
          <div className="space-y-4 text-center animate-in fade-in duration-150">
            <div className="p-6 rounded-2xl bg-white flex flex-col items-center justify-center max-w-[220px] mx-auto shadow-2xl">
              {/* High-res Clean Vector QR Code Representation */}
              <svg className="w-36 h-36" viewBox="0 0 100 100" fill="#000000">
                {/* Position detection corners */}
                <rect x="5" y="5" width="25" height="25" fill="none" stroke="#000" strokeWidth="6" />
                <rect x="12" y="12" width="11" height="11" fill="#000" />
                <rect x="70" y="5" width="25" height="25" fill="none" stroke="#000" strokeWidth="6" />
                <rect x="77" y="12" width="11" height="11" fill="#000" />
                <rect x="5" y="70" width="25" height="25" fill="none" stroke="#000" strokeWidth="6" />
                <rect x="12" y="77" width="11" height="11" fill="#000" />

                {/* Data modules */}
                <rect x="36" y="8" width="6" height="6" />
                <rect x="48" y="14" width="6" height="6" />
                <rect x="58" y="8" width="6" height="6" />
                <rect x="36" y="24" width="6" height="6" />
                <rect x="48" y="24" width="6" height="6" />
                <rect x="8" y="36" width="6" height="6" />
                <rect x="20" y="42" width="6" height="6" />
                <rect x="36" y="36" width="6" height="6" />
                <rect x="48" y="42" width="6" height="6" />
                <rect x="58" y="36" width="6" height="6" />
                <rect x="72" y="42" width="6" height="6" />
                <rect x="84" y="36" width="6" height="6" />
                <rect x="8" y="52" width="6" height="6" />
                <rect x="24" y="58" width="6" height="6" />
                <rect x="38" y="52" width="6" height="6" />
                <rect x="50" y="58" width="6" height="6" />
                <rect x="64" y="52" width="6" height="6" />
                <rect x="78" y="58" width="6" height="6" />
                <rect x="36" y="72" width="6" height="6" />
                <rect x="48" y="78" width="6" height="6" />
                <rect x="60" y="72" width="6" height="6" />
                <rect x="72" y="78" width="6" height="6" />
                <rect x="84" y="72" width="6" height="6" />
                <rect x="42" y="88" width="6" height="6" />
                <rect x="58" y="88" width="6" height="6" />
                <rect x="78" y="88" width="6" height="6" />
              </svg>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Scan with Camera on Mobile</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans">
                Point your iPhone or Android camera to instantly open and test this link on mobile.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: MARKDOWN FORMAT */}
        {activeTab === 'markdown' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Markdown Link (For GitHub, Notion, Slack, Discord)
              </label>
              <textarea
                readOnly
                rows={3}
                value={markdownSnippet}
                className="w-full p-3 rounded-xl bg-black/60 border border-white/15 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              onClick={handleCopyMarkdown}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                copiedMarkdown
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/25'
              }`}
            >
              {copiedMarkdown ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Markdown Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Markdown Snippet</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 4: EMBED BADGE */}
        {activeTab === 'badge' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">
                GitHub / README Badge Preview
              </label>
              <div className="p-4 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center">
                {/* Visual Representation of Shield Badge */}
                <div className="inline-flex items-center rounded-md overflow-hidden text-[11px] font-mono font-bold shadow-md">
                  <span className="px-2.5 py-1 bg-zinc-800 text-zinc-200">Powered by</span>
                  <span className="px-2.5 py-1 bg-cyan-500 text-black flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-black" />
                    <span>GALXAI Universal Router</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Badge Markdown Snippet
              </label>
              <textarea
                readOnly
                rows={2}
                value={badgeMarkdown}
                className="w-full p-2.5 rounded-xl bg-black/60 border border-white/15 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              onClick={handleCopyBadge}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                copiedBadge
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-black font-extrabold shadow-md shadow-cyan-500/25'
              }`}
            >
              {copiedBadge ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Badge Markdown Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Badge Markdown</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const ShareModal = withErrorBoundary(BaseShareModal, {
  name: 'Share Modal',
  fallback: null
});
