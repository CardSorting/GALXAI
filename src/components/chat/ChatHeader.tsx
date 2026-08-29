'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  ChevronDown,
  Zap,
  Brain,
  Flame,
  Code2,
  Share2,
  Sliders,
  Sparkles,
  Shield,
  Clock,
  Check,
  Layers,
  Bot,
  X,
  Pin,
  Archive,
  Flag,
  User as UserIcon,
  LogIn,
  LogOut,
  Settings as SettingsIcon,
  CreditCard,
} from 'lucide-react';
import { CustomPersona } from './PersonaContracts';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatModelOption {
  id: string;
  name: string;
  badge: string;
  discount: string;
  description: string;
  category: 'code' | 'reasoning' | 'fast' | 'visual' | 'router';
  icon: React.ElementType;
  contextWindow: string;
  ttft: string;
  computeRate?: string;
}

export const CHAT_MODELS: ChatModelOption[] = [
  {
    id: 'gpt-5.6-sol',
    name: 'GPT-5.6 Sol',
    badge: 'Flagship Code',
    discount: '-25%',
    description: 'SOTA frontier coding, TypeScript, and distributed system refactoring.',
    category: 'code',
    icon: Zap,
    contextWindow: '1,000K',
    ttft: '14ms',
    computeRate: '1.0x Usage'
  },
  {
    id: 'gpt-5.6-terra',
    name: 'GPT-5.6 Terra',
    badge: 'Deep Logic',
    discount: '-25%',
    description: 'Complex multi-step reasoning, mathematical proofing, and SQL analysis.',
    category: 'reasoning',
    icon: Brain,
    contextWindow: '800K',
    ttft: '18ms',
    computeRate: '1.0x Usage'
  },
  {
    id: 'gpt-5.6-luna',
    name: 'GPT-5.6 Luna',
    badge: 'Sub-Second',
    discount: '-36%',
    description: 'Ultra-fast execution for realtime chat, summarization, and autocomplete.',
    category: 'fast',
    icon: Flame,
    contextWindow: '500K',
    ttft: '8ms',
    computeRate: '0.25x (4x Msgs)'
  },
  {
    id: 'openai-codex-v3',
    name: 'OpenAI Codex V3',
    badge: 'Agent Engine',
    discount: '-25%',
    description: 'Autonomous repository manipulation, debugging, and patch generation.',
    category: 'code',
    icon: Code2,
    contextWindow: '1,000K',
    ttft: '16ms',
    computeRate: '1.0x Usage'
  },
  {
    id: 'auto-router',
    name: 'Anycast Auto-Router',
    badge: 'Sub-15ms',
    discount: '-30%',
    description: 'Intelligently routes across upstream providers for lowest latency & cost.',
    category: 'router',
    icon: Layers,
    contextWindow: '1,000K',
    ttft: '12ms',
    computeRate: 'Dynamic Smart'
  },
];

interface ChatHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  activePersona?: CustomPersona | null;
  onOpenCharacterHub?: () => void;
  onClearPersona?: () => void;
  isTempChat: boolean;
  onToggleTempChat: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  isArchived?: boolean;
  onToggleArchive?: () => void;
  onOpenSettings?: () => void;
  onOpenShare?: () => void;
  onNewChat: () => void;
  onOpenAuth?: () => void;
  seatTier?: any;
}

export function ChatHeader({
  isSidebarOpen,
  onToggleSidebar,
  selectedModelId,
  onSelectModel,
  activePersona,
  onOpenCharacterHub,
  onClearPersona,
  isTempChat,
  onToggleTempChat,
  isPinned,
  onTogglePin,
  isArchived,
  onToggleArchive,
  onOpenSettings,
  onOpenShare,
  onNewChat,
  onOpenAuth,
  seatTier,
}: ChatHeaderProps) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const currentModel =
    CHAT_MODELS.find((m) => m.id === selectedModelId) || CHAT_MODELS[0];
  const Icon = currentModel.icon;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setModelDropdownOpen(false);
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-3 sm:px-6 py-2.5 bg-[#07090e]/95 backdrop-blur-xl border-b border-white/10 text-white font-sans">
      {/* Left: Sidebar Toggle, Model Selector, & Active Character Badge */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            !isSidebarOpen
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
              : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
          }`}
          title={isSidebarOpen ? 'Collapse sidebar (⌘B)' : 'Expand sidebar (⌘B)'}
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Model Selector Dropdown Trigger */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setModelDropdownOpen((prev) => !prev);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all cursor-pointer group select-none"
          >
            <div className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-xs text-white">{currentModel.name}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${modelDropdownOpen ? 'rotate-180 text-cyan-400' : ''}`} />
          </button>

          {/* Model Selector Menu */}
          {modelDropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 rounded-3xl bg-[#0b0e17] border border-white/15 p-2 shadow-2xl space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto">
              <div className="p-2 border-b border-white/10 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>FRONTIER AI ENGINE</span>
                <span className="text-cyan-400 font-bold">Unified Gateway</span>
              </div>

              <div className="space-y-1 max-h-72 overflow-y-auto p-1">
                {CHAT_MODELS.map((model) => {
                  const ModelIcon = model.icon;
                  const isSelected = model.id === selectedModelId;

                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectModel(model.id);
                        setModelDropdownOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-2xl text-left transition-all flex items-start justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/15 border border-cyan-500/40 text-white'
                          : 'hover:bg-white/5 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'bg-cyan-500/30 text-cyan-300' : 'bg-white/10 text-zinc-400'
                        }`}>
                          <ModelIcon className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{model.name}</span>
                            <span className="text-[10px] font-mono text-zinc-400 bg-black/40 px-1.5 rounded">
                              {model.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-snug font-sans line-clamp-1">
                            {model.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <p className="text-[10px] font-mono text-cyan-400 font-semibold">{model.ttft} TTFT</p>
                        {model.computeRate && (
                          <span className={`inline-block text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            model.category === 'fast'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-white/5 text-zinc-400 border border-white/10'
                          }`}>
                            {model.computeRate}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Rolling Quotas Mini-Telemetry Footer */}
              <div className="p-2.5 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between text-xs mt-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-mono text-zinc-300">
                    5h: <strong className="text-emerald-300">{seatTier?.fiveHourWindow?.percentRemaining ?? 100}%</strong> • Wk: <strong className="text-cyan-300">{seatTier?.weeklyWindow?.percentRemaining ?? 100}%</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModelDropdownOpen(false);
                    onOpenSettings?.();
                  }}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 font-bold hover:underline cursor-pointer"
                >
                  View Limits →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Active Character Pill (Only shown when a persona is active) */}
        {activePersona && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/40 text-pink-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <Link
              href="/characters"
              className="hover:underline cursor-pointer font-bold"
              title="Change anime character"
            >
              {activePersona.name} ({activePersona.handle})
            </Link>
            {onClearPersona && (
              <button
                type="button"
                onClick={onClearPersona}
                className="ml-1 p-0.5 hover:text-white text-pink-400 cursor-pointer"
                title="Reset to default GALX"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Temp Chat Badge Indicator */}
        {isTempChat && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono text-amber-300">
            <Shield className="w-3 h-3" />
            <span>Temp Chat</span>
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Pin to Sidebar Button */}
        <button
          type="button"
          onClick={onTogglePin}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            isPinned
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
              : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-amber-300'
          }`}
          title={isPinned ? 'Unpin chat from sidebar' : 'Pin chat to sidebar'}
        >
          <Pin className={`w-4 h-4 ${isPinned ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>

        {/* Quick Flag / Archive Chat Button */}
        <button
          type="button"
          onClick={onToggleArchive}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            isArchived
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10'
              : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-purple-300'
          }`}
          title="Archive & Delete conversation"
        >
          <Flag className={`w-4 h-4 ${isArchived ? 'fill-purple-400 text-purple-400' : ''}`} />
        </button>

        {/* Share Chat Link */}
        <Link
          href="/share"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Share or Export Chat"
        >
          <Share2 className="w-4 h-4" />
        </Link>

        {/* Settings Link */}
        <Link
          href="/settings"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Chat & Model Settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </Link>

        {/* Auth Trigger / User Menu */}
        {isAuthenticated && user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-mono shadow-sm">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full rounded-lg object-cover" />
                ) : (
                  (user.name || user.email || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <span className="hidden sm:inline text-xs font-medium text-zinc-200 max-w-[90px] truncate">
                {user.name || user.email?.split('@')[0] || 'User'}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#0b0e17] border border-white/15 p-2 shadow-2xl space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-2 border-b border-white/10 space-y-0.5">
                  <p className="text-xs font-bold text-white truncate">{user.name || 'Developer'}</p>
                  <p className="text-[10px] text-zinc-400 font-mono truncate">{user.email || 'Sandbox User'}</p>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {user.role || 'Pro Active'}
                  </span>
                </div>

                <Link
                  href="/dashboard"
                  onClick={() => setUserMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Developer Dashboard</span>
                </Link>

                <Link
                  href="/pricing"
                  onClick={() => setUserMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5 text-pink-400" />
                  <span>Billing & Credits</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <SettingsIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Settings</span>
                </Link>

                <div className="pt-1 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            href={pathname && pathname !== '/' && !pathname.startsWith('/auth') ? `/auth/signin?next=${encodeURIComponent(pathname)}` : '/auth/signin'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
}
