'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Zap,
  Rocket,
  Shield,
  Key,
  Terminal,
  Code2,
  Activity,
  Cpu,
  Sparkles,
  ArrowRight,
  X,
  CreditCard,
  CheckCircle2,
  GitCompare,
  HelpCircle,
  BookOpen,
  FileText,
  DollarSign,
  ShieldCheck,
  LifeBuoy,
  Copy,
  Check
} from 'lucide-react';
import { EXCLUSIVE_MODEL_CATALOG, ModelCatalog } from '@/core/router/ModelCatalog';
import { BroccoliOmniSearch, OmniSearchItem } from '@/lib/resilience/BroccoliOmniSearch';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { withErrorBoundary } from './ErrorBoundary';

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PlatformPage {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  keywords: string[];
  description: string;
}

const PLATFORM_PAGES: PlatformPage[] = [
  {
    label: 'Frontier AI Models & Arena',
    href: '/models',
    icon: Cpu,
    category: 'Models',
    keywords: ['models', 'gpt', 'grok', 'sol', 'terra', 'luna', 'ai', 'engines', 'intelligence'],
    description: 'Explore and compare 12 state-of-the-art AI models'
  },
  {
    label: 'Requests & Live Results (Async AI)',
    href: '/queues',
    icon: Activity,
    category: 'Workloads',
    keywords: ['requests', 'results', 'queues', 'async', 'tasks', 'jobs', 'batch'],
    description: 'Submit background AI tasks and stream live results'
  },
  {
    label: 'Plain-English Beginner Guide',
    href: '/docs/simple',
    icon: Sparkles,
    category: 'Getting Started',
    keywords: ['beginner', 'simple', 'easy', 'plain english', 'guide', 'start', 'how to', 'tutorial', 'no-code'],
    description: 'Zero technical jargon walkthrough for new users'
  },
  {
    label: 'Developer API Keys',
    href: '/keys',
    icon: Key,
    category: 'Access',
    keywords: ['api keys', 'keys', 'tokens', 'secret', 'create key', 'credentials', 'auth'],
    description: 'Generate and manage universal gateway API access keys'
  },
  {
    label: 'Create New Gateway API Key',
    href: '/keys/new',
    icon: Key,
    category: 'Actions',
    keywords: ['new key', 'generate key', 'make key', 'add key'],
    description: 'Instantly generate an OpenAI-compatible API key'
  },
  {
    label: 'Wallet & Compute Balance',
    href: '/billing',
    icon: DollarSign,
    category: 'Finance',
    keywords: ['wallet', 'balance', 'deposit', 'add money', 'add funds', 'billing', 'credits', 'pay'],
    description: 'View balance, top up credits with 50% match grant'
  },
  {
    label: 'Wholesale Pricing & Calculator',
    href: '/pricing',
    icon: CreditCard,
    category: 'Finance',
    keywords: ['pricing', 'cost', 'cheapest', 'cheap', 'rates', 'discount', 'wholesale', 'savings', 'calculator'],
    description: 'Wholesale rates: 25%–40% below retail token prices'
  },
  {
    label: 'Model Comparison Matrix',
    href: '/models/compare',
    icon: GitCompare,
    category: 'Tools',
    keywords: ['compare', 'matrix', 'benchmark', 'side by side', 'difference', 'which model'],
    description: 'Side-by-side benchmark comparison of all 12 models'
  },
  {
    label: 'Cursor & Windsurf IDE Setup',
    href: '/docs/ide-setup',
    icon: Terminal,
    category: 'Solutions',
    keywords: ['cursor', 'windsurf', 'vscode', 'ide', 'code editor', 'setup', 'copilot'],
    description: 'Connect GALXAI base URL to your favorite AI IDE'
  },
  {
    label: 'System Status & 99.99% Uptime SLA',
    href: '/status',
    icon: CheckCircle2,
    category: 'Trust',
    keywords: ['status', 'uptime', 'sla', 'health', 'is it down', 'latency', 'operational', 'monitoring'],
    description: 'Real-time operational health and historical 99.99% SLA'
  },
  {
    label: 'Business Tax Invoices & Receipts',
    href: '/billing/invoices',
    icon: FileText,
    category: 'Finance',
    keywords: ['invoices', 'receipts', 'tax', 'pdf', 'bills', 'accounting'],
    description: 'Download PDF invoices with corporate tax details'
  },
  {
    label: 'SOC2 & Zero-Retention Compliance',
    href: '/compliance',
    icon: ShieldCheck,
    category: 'Security',
    keywords: ['compliance', 'soc2', 'security', 'privacy', 'hipaa', 'gdpr', 'zero retention', 'encryption', 'private', 'safe'],
    description: 'Security certifications, DPA agreement, and data safety'
  },
  {
    label: 'Interactive API & Model Playground',
    href: '/playground',
    icon: Sparkles,
    category: 'Tools',
    keywords: ['playground', 'try', 'test', 'demo', 'sandbox', 'chat', 'prompt', 'experiment', 'run model'],
    description: 'Test prompts live across OpenAI and Grok models with 0 config'
  },
  {
    label: 'Linked Accounts & Cooperative Shards',
    href: '/vault',
    icon: Shield,
    category: 'Access',
    keywords: ['vault', 'shards', 'accounts', 'link openai', 'link grok', 'pool', 'private mode', 'connect key'],
    description: 'Manage connected provider accounts and high-concurrency shards'
  },
  {
    label: 'Traffic Simulator & Failover Demo',
    href: '/vault/simulator',
    icon: Activity,
    category: 'Tools',
    keywords: ['simulator', 'failover', 'stress test', 'circuit breaker', 'demo', 'sub-15ms', 'latency test'],
    description: 'Simulate high concurrency spikes and automatic 15ms failover'
  },
  {
    label: 'Knowledge Base & Frequently Asked Questions',
    href: '/faq',
    icon: HelpCircle,
    category: 'Support',
    keywords: ['faq', 'help', 'support', 'questions', 'answers', 'contact', 'troubleshooting', 'cancel', 'refund'],
    description: 'Instant answers to billing, models, and integration questions'
  },
];

interface SelectableItem {
  id: string;
  href: string;
  title: string;
  category: string;
  type: 'recent' | 'resolved' | 'omni' | 'model';
  actionType?: 'copy_curl' | 'copy_python' | 'copy_ts' | 'copy_key' | 'navigate';
  actionData?: string;
}

function BaseCommandMenu({ isOpen, onClose }: CommandMenuProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedQuery = query.toLowerCase().trim();
  const resolvedFromQuery = normalizedQuery ? ModelCatalog.resolveModel(normalizedQuery) : null;
  const recentVisits = BroccoliOmniSearch.getRecentVisits(3);
  const omniResults = BroccoliOmniSearch.search(normalizedQuery, 8);
  const autocompleteSuggestion = BroccoliOmniSearch.getAutocompleteSuggestion(normalizedQuery);

  const filteredModels = useMemo(() => {
    return EXCLUSIVE_MODEL_CATALOG.filter(
      (m) =>
        m.id.toLowerCase().includes(normalizedQuery) ||
        m.name.toLowerCase().includes(normalizedQuery) ||
        m.provider.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery]);

  // Unified Selectable Item List for Keyboard Navigation
  const selectableItems = useMemo<SelectableItem[]>(() => {
    const items: SelectableItem[] = [];

    if (!normalizedQuery) {
      recentVisits.forEach((r) => {
        items.push({
          id: `recent_${r.href}`,
          href: r.href,
          title: r.title,
          category: r.category || 'Navigation',
          type: 'recent'
        });
      });
      return items;
    }

    if (resolvedFromQuery) {
      items.push({
        id: `resolved_${resolvedFromQuery.id}`,
        href: `/models/${resolvedFromQuery.id}`,
        title: resolvedFromQuery.name,
        category: 'Models & Engines',
        type: 'resolved'
      });
    }

    omniResults.forEach((o) => {
      items.push({
        id: `omni_${o.id}`,
        href: o.href,
        title: o.title,
        category: o.category,
        type: 'omni',
        actionType: o.actionType,
        actionData: o.actionData
      });
    });

    if (!resolvedFromQuery) {
      filteredModels.forEach((m) => {
        items.push({
          id: `model_${m.id}`,
          href: `/models/${m.id.replace('/', '-')}`,
          title: m.name,
          category: 'Models & Engines',
          type: 'model'
        });
      });
    }

    return items;
  }, [normalizedQuery, recentVisits, resolvedFromQuery, omniResults, filteredModels]);

  // Reset selected index on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Predictive prefetch the highlighted item and top 3 results to eliminate route transition latency
  useEffect(() => {
    if (selectableItems.length > 0) {
      const activeItem = selectableItems[selectedIndex];
      if (activeItem) {
        try {
          router.prefetch(activeItem.href);
          BroccoliOmniSearch.prefetchRoute(activeItem.href);
        } catch {}
      }

      // Speculatively prefetch top 3 results in background
      const topItems = selectableItems.slice(0, 3);
      for (const item of topItems) {
        if (item.href !== activeItem?.href) {
          try {
            router.prefetch(item.href);
            BroccoliOmniSearch.prefetchRoute(item.href);
          } catch {}
        }
      }
    }
  }, [selectedIndex, selectableItems, router]);

  const navigateTo = async (
    href: string,
    title?: string,
    category?: string,
    actionType?: string,
    actionData?: string
  ) => {
    if (actionType && actionData) {
      const copied = await safeCopyToClipboard(actionData);
      if (copied) {
        setCopiedNotification(title || 'Copied snippet to clipboard');
        setTimeout(() => {
          setCopiedNotification(null);
          onClose();
        }, 500);
        return;
      }
    }

    if (title) {
      BroccoliOmniSearch.recordVisit(title, href, category || 'Navigation');
    }
    router.push(href);
    onClose();
  };

  useEffect(() => {
    let lastKey = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          const event = new CustomEvent('open-command-menu');
          window.dispatchEvent(event);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
          return;
        }
        if (isOpen) {
          onClose();
          return;
        }
      }

      // Handle in-menu keyboard traversal when open
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (selectableItems.length > 0 ? (prev + 1) % selectableItems.length : 0));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (selectableItems.length > 0 ? (prev - 1 + selectableItems.length) % selectableItems.length : 0));
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (selectableItems.length > 0 && selectableItems[selectedIndex]) {
            const active = selectableItems[selectedIndex];
            void navigateTo(active.href, active.title, active.category, active.actionType, active.actionData);
          }
          return;
        }
        if (e.key === 'Tab' && autocompleteSuggestion) {
          e.preventDefault();
          setQuery(autocompleteSuggestion);
          return;
        }
      }

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === '?' && !isOpen) {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }

      const now = Date.now();
      if (lastKey === 'g' && now - lastKeyTime < 1000) {
        if (e.key === 'h') {
          e.preventDefault();
          router.push('/');
        } else if (e.key === 'm') {
          e.preventDefault();
          router.push('/models');
        } else if (e.key === 'd') {
          e.preventDefault();
          router.push('/docs');
        } else if (e.key === 'k') {
          e.preventDefault();
          router.push('/keys');
        } else if (e.key === 'b') {
          e.preventDefault();
          router.push('/billing');
        } else if (e.key === 'q') {
          e.preventDefault();
          router.push('/queues');
        } else if (e.key === 's') {
          e.preventDefault();
          router.push('/status');
        } else if (e.key === 'p') {
          e.preventDefault();
          router.push('/playground');
        } else if (e.key === 'c') {
          e.preventDefault();
          router.push('/models/compare');
        } else if (e.key === 'f') {
          e.preventDefault();
          router.push('/faq');
        }
        lastKey = '';
        return;
      }

      if (e.key === 'g') {
        lastKey = 'g';
        lastKeyTime = now;
      } else {
        lastKey = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showShortcutsModal, onClose, router, selectableItems, selectedIndex, autocompleteSuggestion]);

  if (showShortcutsModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
        <div className="relative w-full max-w-md glass-panel border border-indigo-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              Keyboard Navigation Shortcuts
            </h3>
            <button
              onClick={() => setShowShortcutsModal(false)}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5">
              <span className="text-zinc-300">Universal Search Palette</span>
              <kbd className="px-2 py-0.5 rounded bg-white/10 text-indigo-300 font-bold">⌘K</kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5">
              <span className="text-zinc-300">Go to Models</span>
              <span className="space-x-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">g</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">m</kbd>
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5">
              <span className="text-zinc-300">Go to Requests & Results</span>
              <span className="space-x-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">g</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">q</kbd>
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5">
              <span className="text-zinc-300">Go to Documentation</span>
              <span className="space-x-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">g</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">d</kbd>
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5">
              <span className="text-zinc-300">Go to API Keys</span>
              <span className="space-x-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">g</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">k</kbd>
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5">
              <span className="text-zinc-300">Go to Status & Uptime</span>
              <span className="space-x-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">g</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">s</kbd>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  let currentItemCounter = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl glass-panel border border-indigo-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Bar Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-black/40">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models, pricing, guides, API keys, or prefix with '>', '@', '#', '$'..."
              className="w-full bg-transparent text-white placeholder:text-zinc-500 text-sm focus:outline-none font-mono"
              aria-label="Universal Command Search"
            />
          </div>
          {copiedNotification && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-lg animate-in fade-in duration-100">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Copied!</span>
            </div>
          )}
          {autocompleteSuggestion && !copiedNotification && (
            <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
              <span>Tab to complete</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
            aria-label="Close Command Search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="overflow-y-auto p-3 space-y-4">
          {/* Recent Navigation (Shown when query is empty) */}
          {!normalizedQuery && recentVisits.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400 font-mono flex items-center justify-between">
                <span>Recently Visited Workflows</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      BroccoliOmniSearch.clearRecentVisits();
                      setQuery((q) => q + ' ');
                      setTimeout(() => setQuery((q) => q.trim()), 10);
                    }}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors uppercase text-[9px] cursor-pointer"
                  >
                    Clear
                  </button>
                  <span className="text-zinc-600 font-normal">BroccoliDB L1</span>
                </div>
              </div>
              <div className="space-y-1">
                {recentVisits.map((r) => {
                  const itemIndex = currentItemCounter++;
                  const isSelected = itemIndex === selectedIndex;
                  return (
                    <button
                      key={r.href}
                      onClick={() => navigateTo(r.href, r.title, r.category)}
                      onMouseEnter={() => {
                        setSelectedIndex(itemIndex);
                        router.prefetch(r.href);
                        BroccoliOmniSearch.prefetchRoute(r.href);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between group transition-all text-left cursor-pointer border ${
                        isSelected
                          ? 'bg-white/10 border-indigo-500/50 shadow-sm ring-1 ring-indigo-500/20'
                          : 'bg-white/[0.02] hover:bg-white/5 border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                          <BookOpen className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className={`font-bold text-xs transition-colors ${isSelected ? 'text-indigo-300' : 'text-white group-hover:text-indigo-300'}`}>
                            {r.title}
                          </div>
                          <p className="text-[10px] text-zinc-500 font-mono">{r.href}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 shrink-0">{r.category}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ambiguity-Resolved Match Card */}
          {resolvedFromQuery && (() => {
            const itemIndex = currentItemCounter++;
            const isSelected = itemIndex === selectedIndex;
            return (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-indigo-600/15 border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-amber-300 uppercase">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>Resolved Model for "{query}":</span>
                  </span>
                  <span>-{resolvedFromQuery.discountPercentage}% Wholesale</span>
                </div>
                <button
                  onClick={() => navigateTo(`/models/${resolvedFromQuery.id}`, resolvedFromQuery.name, 'Models & Engines')}
                  onMouseEnter={() => {
                    setSelectedIndex(itemIndex);
                    router.prefetch(`/models/${resolvedFromQuery.id}`);
                    BroccoliOmniSearch.prefetchRoute(`/models/${resolvedFromQuery.id}`);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl transition-all text-left cursor-pointer border ${
                    isSelected ? 'bg-black/90 border-amber-400 ring-1 ring-amber-400/40' : 'bg-black/60 hover:bg-black/80 border-white/5'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white font-mono">{resolvedFromQuery.name}</div>
                    <div className="text-[11px] text-cyan-300 font-mono">ID: {resolvedFromQuery.id} • ${resolvedFromQuery.inputPricePer1M.toFixed(2)} / 1M</div>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-amber-400 text-black font-mono font-black text-xs flex items-center gap-1">
                    <span>View Specs</span>
                    <ArrowRight className="w-3 h-3 text-black" />
                  </div>
                </button>
              </div>
            );
          })()}

          {/* Intelligent OmniSearch Results (Non-Technical Natural Query Matching & Action Dispatchers) */}
          {normalizedQuery && omniResults.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono flex items-center justify-between">
                <span>Matching Pages & Actions ({omniResults.length})</span>
                <span className="text-zinc-500 font-normal">BroccoliDB L1 Natural Parser</span>
              </div>
              <div className="space-y-1">
                {omniResults.map((item) => {
                  const itemIndex = currentItemCounter++;
                  const isSelected = itemIndex === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.href, item.title, item.category, item.actionType, item.actionData)}
                      onMouseEnter={() => {
                        setSelectedIndex(itemIndex);
                        router.prefetch(item.href);
                        BroccoliOmniSearch.prefetchRoute(item.href);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between group transition-all text-left cursor-pointer border ${
                        isSelected
                          ? 'bg-white/10 border-cyan-500/50 shadow-sm ring-1 ring-cyan-500/20'
                          : 'hover:bg-white/5 border-transparent hover:border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                          {item.actionType ? (
                            <Copy className="w-3.5 h-3.5 text-amber-400" />
                          ) : item.category === 'Models & Engines' ? (
                            <Cpu className="w-3.5 h-3.5" />
                          ) : item.category === 'Documentation' ? (
                            <FileText className="w-3.5 h-3.5" />
                          ) : item.category === 'Help & Diagnostics' ? (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-xs transition-colors ${isSelected ? 'text-cyan-300' : 'text-white group-hover:text-cyan-300'}`}>
                              {item.title}
                            </span>
                            {item.badge && (
                              <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold ${item.badge.includes('Quick Action') ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'}`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-tight">{item.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.shortcutKey && (
                          <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[10px] font-mono text-zinc-400">
                            {item.shortcutKey}
                          </kbd>
                        )}
                        <ArrowRight className={`w-3.5 h-3.5 transition-all ${isSelected ? 'text-cyan-300 translate-x-0.5' : 'text-zinc-600 group-hover:text-white group-hover:translate-x-0.5'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Direct Model Engine Matches */}
          {filteredModels.length > 0 && !resolvedFromQuery && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                Model Engines ({filteredModels.length})
              </div>
              <div className="space-y-1">
                {filteredModels.map((m) => {
                  const itemIndex = currentItemCounter++;
                  const isSelected = itemIndex === selectedIndex;
                  const routeHref = `/models/${m.id.replace('/', '-')}`;
                  return (
                    <button
                      key={m.id}
                      onClick={() => navigateTo(routeHref, m.name, 'Models & Engines')}
                      onMouseEnter={() => {
                        setSelectedIndex(itemIndex);
                        router.prefetch(routeHref);
                        BroccoliOmniSearch.prefetchRoute(routeHref);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between group transition-all text-left cursor-pointer border ${
                        isSelected
                          ? 'bg-white/10 border-indigo-500/50 shadow-sm ring-1 ring-indigo-500/20'
                          : 'hover:bg-white/5 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          m.provider === 'xai-grok'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {m.provider === 'xai-grok' ? <Rocket className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5 fill-amber-400" />}
                        </div>
                        <div>
                          <div className={`font-bold text-xs transition-colors ${isSelected ? 'text-cyan-300' : 'text-white group-hover:text-cyan-300'}`}>
                            {m.id}
                          </div>
                          <p className="text-[10px] text-zinc-400">{m.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-500">{m.contextWindowTokens / 1000}K ctx</span>
                        <ArrowRight className={`w-3.5 h-3.5 transition-all ${isSelected ? 'text-white translate-x-0.5' : 'text-zinc-600 group-hover:text-white group-hover:translate-x-0.5'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Shortcut Hints with Category Filter Cheatsheet */}
        <div className="px-4 py-2.5 border-t border-white/5 bg-black/50 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Navigate: <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">↓</kbd> • Filters: <span className="text-zinc-400">&gt; Actions</span> <span className="text-zinc-400">@ Models</span> <span className="text-zinc-400"># Docs</span> <span className="text-zinc-400">$ Pricing</span></span>
          <span>Close: <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">esc</kbd></span>
        </div>
      </div>
    </div>
  );
}

export const CommandMenu = withErrorBoundary(BaseCommandMenu, {
  name: 'Universal Command Menu',
  fallback: null
});
