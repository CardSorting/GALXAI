'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Share2,
  Copy,
  Check,
  Search,
  ArrowUp,
  Sparkles,
  Zap
} from 'lucide-react';
import { ShareModal } from './ShareModal';
import { withErrorBoundary } from './ErrorBoundary';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

function BaseFloatingActionDock() {
  const pathname = usePathname();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if ((pathname === '/' || pathname === '/images' || pathname?.startsWith('/images/') || pathname === '/sites' || pathname?.startsWith('/sites/') || pathname === '/signup' || pathname === '/login' || pathname === '/keys/top-up' || pathname === '/billing' || pathname === '/pricing' || pathname === '/docs' || pathname?.startsWith('/docs/'))) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const shouldShow = window.scrollY > 300;
          setShowScrollTop((prev) => (prev !== shouldShow ? shouldShow : prev));
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  if ((pathname === '/' || pathname === '/images' || pathname?.startsWith('/images/') || pathname === '/sites' || pathname?.startsWith('/sites/') || pathname === '/signup' || pathname === '/login' || pathname === '/keys/top-up' || pathname === '/billing' || pathname === '/pricing' || pathname === '/docs' || pathname?.startsWith('/docs/'))) {
    return null;
  }

  const handleCopyLink = async () => {
    if (typeof window !== 'undefined') {
      const success = await safeCopyToClipboard(window.location.href);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openCommandPalette = () => {
    const event = new CustomEvent('open-command-menu');
    window.dispatchEvent(event);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 hidden sm:flex items-center gap-1.5 p-1.5 rounded-2xl glass-panel border border-white/15 shadow-2xl bg-[#0a0d1a]/90 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-300">
        {/* Quick Share Trigger */}
        <button
          onClick={() => setShareOpen(true)}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer group relative"
          title="Share this page"
          aria-label="Share this page"
        >
          <Share2 className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span className="sr-only">Share</span>
        </button>

        {/* Quick Copy Link */}
        <button
          onClick={handleCopyLink}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer group"
          title={copied ? 'Link copied!' : 'Copy page link'}
          aria-label="Copy page link"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4 text-zinc-300 group-hover:scale-110 transition-transform" />
          )}
        </button>

        {/* Quick Search Trigger */}
        <button
          onClick={openCommandPalette}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer group"
          title="Search anything (⌘K)"
          aria-label="Search"
        >
          <Search className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
        </button>

        {/* Back to Top Button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="p-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 transition-all cursor-pointer group animate-in fade-in zoom-in-90 duration-150"
            title="Back to top"
            aria-label="Back to top"
          >
            <ArrowUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        )}
      </div>

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </>
  );
}

export const FloatingActionDock = withErrorBoundary(BaseFloatingActionDock, {
  name: 'Floating Action Dock',
  fallback: null
});

