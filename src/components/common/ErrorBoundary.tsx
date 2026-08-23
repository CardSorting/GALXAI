'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Copy, Check, Terminal, ShieldCheck } from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
  onReset?: () => void;
  resetKeys?: any[];
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  copied: boolean;
  isRetrying: boolean;
}

function sanitizeDiagnostics(text: string): string {
  if (!text) return '';
  // Redact potential API keys or Bearer tokens
  return text
    .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
    .replace(/galx_[a-zA-Z0-9_\-]+/gi, 'galx_[REDACTED]')
    .replace(/sk-[a-zA-Z0-9_\-]+/gi, 'sk-[REDACTED]');
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0,
    copied: false,
    isRetrying: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, isRetrying: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error(`💥 [GALXAI ErrorBoundary in ${this.props.name || 'Component'}]:`, error, errorInfo);

    const maxRetries = this.props.maxRetries ?? 2;
    const shouldAutoRetry = this.props.autoRetry !== false && this.state.retryCount < maxRetries;

    if (shouldAutoRetry) {
      const delay = (this.props.retryDelayMs ?? 1500) * Math.pow(1.5, this.state.retryCount);
      console.log(`🔄 [GALXAI ErrorBoundary] Auto-retrying ${this.props.name || 'Component'} in ${delay}ms (attempt ${this.state.retryCount + 1}/${maxRetries})...`);

      this.setState({ isRetrying: true });
      this.retryTimeoutId = setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: prev.retryCount + 1,
          isRetrying: false,
        }));
      }, delay);
    }
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && this.props.resetKeys && prevProps.resetKeys) {
      const hasChanged = this.props.resetKeys.some(
        (key, idx) => !Object.is(key, prevProps.resetKeys?.[idx])
      );
      if (hasChanged) {
        this.handleReset();
      }
    }
  }

  public componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private handleReset = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    this.setState({ hasError: false, error: null, errorInfo: null, retryCount: 0, isRetrying: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleCopy = async () => {
    const rawMessage = this.state.error?.message || 'Unknown';
    const rawStack = this.state.error?.stack || 'N/A';

    const report = JSON.stringify(
      {
        component: this.props.name || 'Anonymous Component',
        error: sanitizeDiagnostics(rawMessage),
        stack: sanitizeDiagnostics(rawStack),
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.pathname : 'SSR',
      },
      null,
      2
    );

    const success = await safeCopyToClipboard(report);
    if (success) {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-5 sm:p-6 rounded-3xl border border-rose-500/30 bg-gradient-to-b from-rose-500/10 via-black/80 to-black/90 text-center space-y-4 my-3 shadow-xl backdrop-blur-md">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30 shadow-md shadow-rose-500/15">
            <AlertCircle className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-[10px] font-mono font-bold uppercase text-rose-400">
              <ShieldCheck className="w-3 h-3 text-rose-400" />
              <span>ISOLATED FAULT SAFEGUARD</span>
            </div>
            <h4 className="text-sm font-bold text-white font-sans">
              Unable to display {this.props.name || 'this module'}
            </h4>
            <p className="text-xs text-zinc-400 font-sans max-w-sm mx-auto">
              A temporary issue occurred in this section. Your account, wallet, and surrounding services are working normally.
            </p>
          </div>

          {this.state.error?.message && (
            <div className="p-2.5 rounded-xl bg-black/60 border border-white/5 font-mono text-[10px] text-rose-300 max-w-md mx-auto truncate text-left flex items-center gap-2">
              <Terminal className="w-3 h-3 text-zinc-500 shrink-0" />
              <span className="truncate">{sanitizeDiagnostics(this.state.error.message)}</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 font-mono text-xs pt-1">
            <button
              onClick={this.handleReset}
              disabled={this.state.isRetrying}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-black font-bold transition-all cursor-pointer shadow-md shadow-rose-500/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${this.state.isRetrying ? 'animate-spin' : ''}`} />
              <span>{this.state.isRetrying ? 'Auto-retrying...' : 'Retry View'}</span>
            </button>

            <button
              onClick={this.handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10 cursor-pointer"
              title="Copy sanitized error details for support"
            >
              {this.state.copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{this.state.copied ? 'Copied' : 'Diagnostics'}</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-Order Component to wrap any component with ErrorBoundary protection.
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    name?: string;
    fallback?: ReactNode;
    onReset?: () => void;
    autoRetry?: boolean;
    maxRetries?: number;
    retryDelayMs?: number;
  }
) {
  const DisplayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary
      name={options?.name || DisplayName}
      fallback={options?.fallback}
      onReset={options?.onReset}
      autoRetry={options?.autoRetry}
      maxRetries={options?.maxRetries}
      retryDelayMs={options?.retryDelayMs}
    >
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${DisplayName})`;
  return ComponentWithErrorBoundary;
}
