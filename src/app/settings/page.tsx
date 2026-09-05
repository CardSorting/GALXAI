'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RotateCcw,
  Check,
  Lock,
  Palette,
  Globe,
  Shield,
  Search,
  CheckCircle2,
  User,
  LogOut,
  LogIn,
  Layers,
  Type,
  ChevronRight,
  Terminal,
  Copy,
  Cpu,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  useAppearance,
  ThemePreset,
  AccentColor,
  InterfaceDensity,
  CodeFontFamily,
} from '@/contexts/AppearanceContext';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/lib/i18n/translations';
type SettingsTab =
  | 'appearance'
  | 'language'
  | 'seats'
  | 'developer';

interface ThemeOption {
  id: ThemePreset;
  name: string;
  bgHex: string;
  cardHex: string;
  accentHex: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Cyber Dark',
    bgHex: '#07080d',
    cardHex: '#0f1324',
    accentHex: '#06b6d4',
  },
  {
    id: 'obsidian',
    name: 'OLED Black',
    bgHex: '#000000',
    cardHex: '#0a0a0a',
    accentHex: '#ffffff',
  },
  {
    id: 'emerald',
    name: 'Emerald Terminal',
    bgHex: '#040d08',
    cardHex: '#081c12',
    accentHex: '#10b981',
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    bgHex: '#0c071a',
    cardHex: '#180e30',
    accentHex: '#c084fc',
  },
  {
    id: 'contrast',
    name: 'High Contrast',
    bgHex: '#0a0c10',
    cardHex: '#141820',
    accentHex: '#f59e0b',
  },
];

interface AccentOption {
  id: AccentColor;
  name: string;
  hex: string;
}

const ACCENT_OPTIONS: AccentOption[] = [
  { id: 'cyan', name: 'Cyan', hex: '#06b6d4' },
  { id: 'indigo', name: 'Indigo', hex: '#6366f1' },
  { id: 'emerald', name: 'Emerald', hex: '#10b981' },
  { id: 'amber', name: 'Amber', hex: '#f59e0b' },
  { id: 'purple', name: 'Purple', hex: '#a855f7' },
  { id: 'rose', name: 'Rose', hex: '#f43f5e' },
];

export default function SettingsPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const { language, details: langDetails, isAutoDetected, setLanguage } = useLanguage();
  const {
    settings: appearance,
    setTheme,
    setAccentColor,
    setDensity,
    setFontFamily,
    setAmbientGlow,
    setGlassmorphism,
    setAnimationsEnabled,
    resetAppearance,
  } = useAppearance();

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [languageSearch, setLanguageSearch] = useState('');
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab') as SettingsTab | null;
      if (tabParam && ['appearance', 'language', 'seats', 'developer'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    } catch {}
  }, []);

  const filteredLanguages = useMemo(() => {
    const keys = Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[];
    if (!languageSearch.trim()) return keys;
    const query = languageSearch.toLowerCase().trim();
    return keys.filter((key) => {
      const info = SUPPORTED_LANGUAGES[key];
      return (
        info.name.toLowerCase().includes(query) ||
        info.nativeName.toLowerCase().includes(query) ||
        key.toLowerCase().includes(query)
      );
    });
  }, [languageSearch]);

  const handleResetAll = () => {
    resetAppearance();
  };

  const navItems = [
    {
      id: 'appearance' as SettingsTab,
      label: 'Appearance',
      icon: Palette,
      gated: false,
    },
    {
      id: 'language' as SettingsTab,
      label: 'Language',
      icon: Globe,
      gated: false,
      badge: langDetails.nativeName,
    },
    {
      id: 'seats' as SettingsTab,
      label: 'Seat & Limits',
      icon: Shield,
      gated: !isAuthenticated,
    },
    {
      id: 'developer' as SettingsTab,
      label: 'Developer & API',
      icon: Terminal,
      gated: false,
      badge: 'v1 Gateway',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--background,#07080d)] text-white font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#07090e]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/keys"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to API Keys</span>
          </Link>
          <h1 className="text-base font-bold text-white tracking-tight">Settings</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-medium transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {!isAuthenticated && (
            <Link
              href="/auth/signin?next=/settings"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </header>

      {/* Master-Detail Layout */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Master Nav (4 cols on tablet+) */}
          <aside className="md:col-span-4 space-y-3">
            {/* Account Tile */}
            <div className="p-3 rounded-2xl bg-[#0c101c] border border-white/10 flex items-center justify-between">
              {isAuthenticated && user ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500 text-black font-bold flex items-center justify-center text-xs shrink-0">
                      {(user.name || user.email || 'U')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{user.name || user.email}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{user.role || 'Developer'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-400" />
                    <span className="text-xs text-zinc-300 font-medium">Not Signed In</span>
                  </div>
                  <Link
                    href="/auth/signin?next=/settings"
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-bold"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>

            {/* Nav Items */}
            <div className="p-1.5 rounded-2xl bg-[#0c101c] border border-white/10 space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white/10 text-white font-bold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-zinc-500'}`} />
                      <span>{item.label}</span>
                      {item.gated && <Lock className="w-3 h-3 text-zinc-600" />}
                    </div>

                    <div className="flex items-center gap-1">
                      {item.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-zinc-400">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Detail Pane (8 cols) */}
          <div className="md:col-span-8 space-y-5">
            {/* 1. APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Theme */}
                <div className="p-5 rounded-2xl bg-[#0c101c] border border-white/10 space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Theme</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {THEME_OPTIONS.map((theme) => {
                      const isSelected = appearance.theme === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setTheme(theme.id)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-500/10 ring-1 ring-cyan-400'
                              : 'border-white/10 bg-black/40 hover:border-white/20'
                          }`}
                        >
                          <div
                            className="w-full h-8 rounded-lg border border-white/10 flex items-center justify-between px-2"
                            style={{ backgroundColor: theme.bgHex }}
                          >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.accentHex }} />
                            <div
                              className="w-8 h-3 rounded-md border border-white/10"
                              style={{ backgroundColor: theme.cardHex }}
                            />
                          </div>
                          <span className="text-xs font-bold text-white truncate">{theme.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Accent Color */}
                <div className="p-5 rounded-2xl bg-[#0c101c] border border-white/10 space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Accent Color</h2>
                  <div className="flex flex-wrap gap-2.5">
                    {ACCENT_OPTIONS.map((accent) => {
                      const isSelected = appearance.accentColor === accent.id;
                      return (
                        <button
                          key={accent.id}
                          type="button"
                          onClick={() => setAccentColor(accent.id)}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-white/40 bg-white/10 text-white'
                              : 'border-white/10 bg-black/30 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <div
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: accent.hex }}
                          />
                          <span>{accent.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Interface Density */}
                <div className="p-5 rounded-2xl bg-[#0c101c] border border-white/10 space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Density</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {(['compact', 'standard', 'spacious'] as InterfaceDensity[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDensity(d)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer ${
                          appearance.density === d
                            ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300'
                            : 'border-white/10 bg-black/30 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {d === 'standard' ? 'Default' : d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font */}
                <div className="p-5 rounded-2xl bg-[#0c101c] border border-white/10 space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Code Font</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'jetbrains' as CodeFontFamily, name: 'JetBrains Mono' },
                      { id: 'fira' as CodeFontFamily, name: 'Fira Code' },
                      { id: 'inter' as CodeFontFamily, name: 'Inter Sans' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFontFamily(f.id)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          appearance.fontFamily === f.id
                            ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300'
                            : 'border-white/10 bg-black/30 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Effects Switches */}
                <div className="p-5 rounded-2xl bg-[#0c101c] border border-white/10 space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Effects</h2>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30">
                      <span className="text-xs text-zinc-200">Ambient Background Glow</span>
                      <button
                        type="button"
                        onClick={() => setAmbientGlow(!appearance.ambientGlow)}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                          appearance.ambientGlow ? 'bg-cyan-500' : 'bg-zinc-700'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                            appearance.ambientGlow ? 'right-1' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30">
                      <span className="text-xs text-zinc-200">Glassmorphism Blur</span>
                      <button
                        type="button"
                        onClick={() => setGlassmorphism(!appearance.glassmorphism)}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                          appearance.glassmorphism ? 'bg-cyan-500' : 'bg-zinc-700'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                            appearance.glassmorphism ? 'right-1' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30">
                      <span className="text-xs text-zinc-200">Animations</span>
                      <button
                        type="button"
                        onClick={() => setAnimationsEnabled(!appearance.animationsEnabled)}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                          appearance.animationsEnabled ? 'bg-cyan-500' : 'bg-zinc-700'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                            appearance.animationsEnabled ? 'right-1' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. LANGUAGE TAB */}
            {activeTab === 'language' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-5 rounded-2xl bg-[#0c101c] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Language</h2>
                    {isAutoDetected && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20">
                        Auto: {langDetails.nativeName}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search language..."
                      value={languageSearch}
                      onChange={(e) => setLanguageSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {filteredLanguages.map((key) => {
                      const info = SUPPORTED_LANGUAGES[key];
                      const isSelected = language === key;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setLanguage(key)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-500/15 text-white'
                              : 'border-white/10 bg-black/30 text-zinc-300 hover:border-white/20'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold">{info.nativeName}</p>
                            <p className="text-[10px] text-zinc-500">{info.name}</p>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 6. DEVELOPER & API SETTINGS TAB */}
            {activeTab === 'developer' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Gateway API Endpoint Header */}
                <div className="p-5 rounded-2xl bg-[#0c101c] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                        <Terminal className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-white">Edge Gateway API Settings</h2>
                        <p className="text-xs text-zinc-400">OpenAI & Anthropic SDK drop-in replacement with sub-15ms TTFT</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Online • 99.99% SLA</span>
                    </span>
                  </div>

                  {/* Gateway Base URL with 1-click copy */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <label className="text-[11px] font-sans font-semibold text-zinc-300">Base URL Endpoint</label>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/60 border border-white/10 text-cyan-300">
                      <span className="select-all font-bold">https://galx.ai/v1</span>
                      <button
                        type="button"
                        onClick={() => {
                          try { navigator.clipboard.writeText('https://galx.ai/v1'); } catch {}
                          setCopiedEndpoint(true);
                          setTimeout(() => setCopiedEndpoint(false), 2000);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center gap-1 text-[11px] transition-all cursor-pointer"
                      >
                        {copiedEndpoint ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedEndpoint ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0c101c] border border-white/10 space-y-3">
                  <div className="flex items-start gap-3">
                    <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 space-y-1.5">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Server-managed provider credentials</h2>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        The deployed browser client never persists upstream keys. Add provider credentials through the encrypted shard vault and use scoped GALXAI gateway keys only from trusted server environments.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Production Gateway Keys Link Tile */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-black border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-indigo-400" />
                      <span>Production Gateway Keys & Telemetry</span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Mint scoped production keys, configure IP allowlists, manage 600 RPM limits, and view real-time latency logs.
                    </p>
                  </div>
                  <Link
                    href="/keys"
                    className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs font-mono whitespace-nowrap transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5 shrink-0"
                  >
                    <span>Manage Keys →</span>
                  </Link>
                </div>
              </div>
            )}

            {/* 3. GATED TABS (WHEN NOT LOGGED IN) */}
            {!isAuthenticated && activeTab === 'seats' && (
              <div className="p-8 rounded-2xl bg-[#0c101c] border border-white/10 text-center space-y-4 animate-in fade-in duration-150">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 mx-auto">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Sign In Required</h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Sign in to manage seats and account limits.
                  </p>
                </div>
                <Link
                  href="/auth/signin?next=/settings?tab=seats"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs cursor-pointer shadow-md shadow-cyan-500/20"
                >
                  Sign In
                </Link>
              </div>
            )}

            {/* 5. SEATS TAB (AUTHENTICATED) */}
            {isAuthenticated && activeTab === 'seats' && (
              <div className="p-5 rounded-2xl bg-[#0c101c] border border-white/10 space-y-4 animate-in fade-in duration-150">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Seat Tier</h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                    <p className="text-[10px] text-zinc-500">Queue Lane</p>
                    <p className="font-bold text-emerald-400">Fast-Lane</p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                    <p className="text-[10px] text-zinc-500">Prompt Cache</p>
                    <p className="font-bold text-cyan-400">75% Rebate</p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                    <p className="text-[10px] text-zinc-500">Data Privacy</p>
                    <p className="font-bold text-purple-400">Zero Retention</p>
                  </div>
                </div>

                <div className="pt-1">
                  <Link
                    href="/teams/seats"
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-bold hover:underline"
                  >
                    Manage Seats →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
