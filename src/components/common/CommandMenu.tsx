'use client';

import React, { useState, useEffect } from 'react';
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
  Swords
} from 'lucide-react';
import { EXCLUSIVE_MODEL_CATALOG, ModelCatalog } from '@/core/router/ModelCatalog';

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandMenu({ isOpen, onClose }: CommandMenuProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

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
        if (e.key === 'm') {
          e.preventDefault();
          router.push('/models');
        } else if (e.key === 'd') {
          e.preventDefault();
          router.push('/docs');
        } else if (e.key === 'k') {
          e.preventDefault();
          router.push('/keys');
        } else if (e.key === 'q') {
          e.preventDefault();
          router.push('/queues');
        } else if (e.key === 's') {
          e.preventDefault();
          router.push('/status');
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
  }, [isOpen, showShortcutsModal, onClose, router]);

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
              <span className="text-zinc-300">Go to Compare Matrix</span>
              <span className="space-x-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">g</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">c</kbd>
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5">
              <span className="text-zinc-300">Go to Docs</span>
              <span className="space-x-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">g</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">d</kbd>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  const navigateTo = (href: string) => {
    router.push(href);
    onClose();
  };

  const resolvedFromQuery = query.trim() ? ModelCatalog.resolveModel(query.trim()) : null;

  const filteredModels = EXCLUSIVE_MODEL_CATALOG.filter(m =>
    m.id.toLowerCase().includes(query.toLowerCase()) ||
    m.name.toLowerCase().includes(query.toLowerCase()) ||
    m.provider.toLowerCase().includes(query.toLowerCase())
  );

  const quickPages = [
    { label: 'Requests & Results (Async AI)', href: '/queues', icon: Activity, category: 'Navigation' },
    { label: 'Models & Pricing Matrix', href: '/models', icon: Cpu, category: 'Navigation' },
    { label: 'Plain English Beginner Guide', href: '/docs/simple', icon: Sparkles, category: 'Getting Started' },
    { label: 'AI Agents & Swarms Infrastructure', href: '/docs/agents', icon: Rocket, category: 'Solutions' },
    { label: 'Cursor & Windsurf IDE Setup', href: '/docs/ide-setup', icon: Terminal, category: 'Solutions' },
    { label: 'Developer API Keys', href: '/keys', icon: Key, category: 'Navigation' },
    { label: 'Create New Gateway API Key', href: '/keys/new', icon: Key, category: 'Actions' },
    { label: 'Model Comparison Matrix', href: '/models/compare', icon: GitCompare, category: 'Tools' },
    { label: '0ms Model Alias Resolver', href: '/models/resolver', icon: Cpu, category: 'Tools' },
    { label: 'Wholesale Pricing & Calculator', href: '/pricing', icon: CreditCard, category: 'Pricing' },
    { label: '1-Click Migration Guide', href: '/docs/migration', icon: Sparkles, category: 'Docs' },
    { label: 'Production Cookbooks & Recipes', href: '/docs/cookbook', icon: BookOpen, category: 'Docs' },
    { label: '75% Prompt Caching Architecture', href: '/docs/prompt-caching', icon: Sparkles, category: 'Docs' },
    { label: 'REST & SSE API Reference', href: '/docs/api-reference', icon: Code2, category: 'Docs' },
    { label: 'System Status & Uptime (99.99%)', href: '/status', icon: CheckCircle2, category: 'Trust' },
    { label: 'Knowledge Base & FAQ', href: '/faq', icon: HelpCircle, category: 'Support' },
  ].filter(p => p.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl glass-panel border border-indigo-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Bar Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-black/40">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type any model alias (e.g. sol, grok, dalle, fast, cursor)..."
            className="flex-1 bg-transparent text-white placeholder:text-zinc-500 text-sm focus:outline-none font-mono"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="overflow-y-auto p-3 space-y-4">
          {/* Ambiguity-Resolved Match Card */}
          {resolvedFromQuery && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-indigo-600/15 border border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-amber-300 uppercase">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>0ms Resolved Model for "{query}":</span>
                </span>
                <span>-{resolvedFromQuery.discountPercentage}% Wholesale</span>
              </div>
              <button
                onClick={() => navigateTo(`/models/${resolvedFromQuery.id}`)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-black/60 hover:bg-black/80 transition-all text-left cursor-pointer border border-white/5"
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
          )}

          {/* Models Section */}
          {filteredModels.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                Models ({filteredModels.length})
              </div>
              <div className="space-y-1">
                {filteredModels.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => navigateTo(`/models/${m.id.replace('/', '-')}`)}
                    className="w-full px-3.5 py-2.5 rounded-xl hover:bg-white/5 flex items-center justify-between group transition-all text-left cursor-pointer"
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
                        <div className="font-bold text-white text-xs group-hover:text-cyan-300 transition-colors">
                          {m.id}
                        </div>
                        <p className="text-[10px] text-zinc-400">{m.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-500">{m.contextWindowTokens / 1000}K ctx</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation & Actions Section */}
          {quickPages.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                Platform Pages & Actions
              </div>
              <div className="space-y-1">
                {quickPages.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.href}
                      onClick={() => navigateTo(p.href)}
                      className="w-full px-3.5 py-2.5 rounded-xl hover:bg-white/5 flex items-center justify-between group transition-all text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-white text-xs group-hover:text-indigo-300 transition-colors">
                          {p.label}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-mono text-zinc-500">{p.category}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="px-4 py-2.5 border-t border-white/5 bg-black/50 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Navigate: <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">↓</kbd></span>
          <span>Shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">?</kbd></span>
          <span>Close: <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">esc</kbd></span>
        </div>
      </div>
    </div>
  );
}
