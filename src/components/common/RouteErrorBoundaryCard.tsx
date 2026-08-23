'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Copy,
  Check,
  RotateCcw,
  Wifi,
  WifiOff,
  ShieldCheck,
  Terminal
} from 'lucide-react';

import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { BroccoliResilienceSubstrate } from '@/lib/resilience/BroccoliResilienceSubstrate';

interface RouteErrorBoundaryCardProps {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  subtitle: string;
  badge?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accentColor?: 'rose' | 'amber' | 'cyan' | 'indigo' | 'emerald';
  primaryLinkHref?: string;
  primaryLinkLabel?: string;
  autoRetrySeconds?: number;
}

export function RouteErrorBoundaryCard({
  error,
  reset,
  title,
  subtitle,
  badge = 'GATEWAY RESILIENCE ACTIVE',
  icon: Icon = AlertTriangle,
  accentColor = 'rose',
  primaryLinkHref = '/',
  primaryLinkLabel = 'Return Home',
  autoRetrySeconds = 8,
}: RouteErrorBoundaryCardProps) {
  const [copied, setCopied] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [countdown, setCountdown] = useState(autoRetrySeconds);
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(true);

  // Network online/offline auto-sensing & SLA probe telemetry
  useEffect(() => {
    try {
      BroccoliResilienceSubstrate.getInstance().recordSlaProbe({
        endpoint: `route-error://${title}`,
        status: 'degraded',
        latencyMs: 1,
        success: false,
        timestampMs: Date.now(),
      });
    } catch {}

    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-trigger reset immediately on network reconnect
      reset();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setAutoRetryEnabled(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [reset, title]);

  // Auto-retry countdown timer
  useEffect(() => {
    if (!autoRetryEnabled || countdown <= 0 || !isOnline) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          reset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRetryEnabled, countdown, isOnline, reset]);

  const handleCopyDiagnostic = async () => {
    const sanitize = (text: string) =>
      text
        .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
        .replace(/(?:sk|galx_live_sk|xai)_[A-Za-z0-9_\-]+/gi, '[REDACTED_KEY]');

    const diagnosticReport = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        title,
        message: sanitize(error.message || 'Unknown runtime error'),
        digest: error.digest || 'N/A',
        stack: sanitize(error.stack || 'N/A'),
        url: typeof window !== 'undefined' ? window.location.href : 'SSR',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
        online: isOnline,
      },
      null,
      2
    );

    const success = await safeCopyToClipboard(diagnosticReport);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Color classes mapping
  const colorStyles = {
    rose: {
      border: 'border-rose-500/30',
      bgGrad: 'from-rose-500/10 via-black/80 to-black/90',
      badgeBg: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
      iconBg: 'bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-rose-500/20',
      btnBg: 'bg-rose-500 hover:bg-rose-400 text-black shadow-rose-500/20',
      shadow: 'shadow-rose-500/10'
    },
    amber: {
      border: 'border-amber-500/30',
      bgGrad: 'from-amber-500/10 via-black/80 to-black/90',
      badgeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
      iconBg: 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-amber-500/20',
      btnBg: 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-500/20',
      shadow: 'shadow-amber-500/10'
    },
    cyan: {
      border: 'border-cyan-500/30',
      bgGrad: 'from-cyan-500/10 via-black/80 to-black/90',
      badgeBg: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
      iconBg: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-cyan-500/20',
      btnBg: 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-cyan-500/20',
      shadow: 'shadow-cyan-500/10'
    },
    indigo: {
      border: 'border-indigo-500/30',
      bgGrad: 'from-indigo-500/10 via-black/80 to-black/90',
      badgeBg: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300',
      iconBg: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400 shadow-indigo-500/20',
      btnBg: 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/20',
      shadow: 'shadow-indigo-500/10'
    },
    emerald: {
      border: 'border-emerald-500/30',
      bgGrad: 'from-emerald-500/10 via-black/80 to-black/90',
      badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
      iconBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-emerald-500/20',
      btnBg: 'bg-emerald-400 hover:bg-emerald-300 text-black shadow-emerald-500/20',
      shadow: 'shadow-emerald-500/10'
    }
  }[accentColor];

  return (
    <div className={`w-full max-w-xl mx-auto glass-panel rounded-3xl p-6 sm:p-8 border ${colorStyles.border} bg-gradient-to-b ${colorStyles.bgGrad} shadow-2xl text-center space-y-6 relative overflow-hidden`}>
      {/* Network Status Header */}
      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pb-2 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Network Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span className="text-rose-400 font-bold">Offline — Reconnecting...</span>
            </>
          )}
        </div>

        {autoRetryEnabled && countdown > 0 && isOnline && (
          <span className="text-zinc-400">
            Auto-retrying in <strong className="text-white">{countdown}s</strong>
          </span>
        )}
      </div>

      {/* Icon & Title */}
      <div className={`w-14 h-14 rounded-2xl ${colorStyles.iconBg} border flex items-center justify-center mx-auto shadow-xl`}>
        <Icon className="w-7 h-7" />
      </div>

      <div className="space-y-2">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider ${colorStyles.badgeBg}`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{badge}</span>
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight font-sans">
          {title}
        </h2>

        <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-md mx-auto">
          {subtitle}
        </p>
      </div>

      {/* Error Details Box */}
      <div className="p-3.5 rounded-2xl bg-black/60 border border-white/5 font-mono text-left space-y-1.5 shadow-inner">
        <div className="flex items-center justify-between text-[10px] text-zinc-500 border-b border-white/5 pb-1.5">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-cyan-400" />
            <span>DIAGNOSTIC TRACE</span>
          </span>
          {error.digest && <span className="text-zinc-400">Digest: {error.digest}</span>}
        </div>
        <div className="text-rose-400 text-xs truncate">
          {error.message || 'An unexpected client runtime exception occurred.'}
        </div>
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs pt-1">
        <button
          onClick={() => reset()}
          className={`py-3 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${colorStyles.btnBg}`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry View Now</span>
        </button>

        <button
          onClick={handleCopyDiagnostic}
          className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center gap-2 transition-all border border-white/10 cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
          <span>{copied ? 'Copied Report!' : 'Copy Diagnostics'}</span>
        </button>
      </div>

      {/* Navigation Safeguard Footer */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-zinc-400">
        <button
          onClick={() => {
            if (typeof window !== 'undefined') window.location.reload();
          }}
          className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer text-[11px]"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Hard Reload</span>
        </button>

        <Link
          href={primaryLinkHref}
          className="hover:text-white transition-colors flex items-center gap-1.5 text-[11px] text-cyan-400 font-bold"
        >
          <Home className="w-3 h-3" />
          <span>{primaryLinkLabel}</span>
        </Link>
      </div>
    </div>
  );
}
