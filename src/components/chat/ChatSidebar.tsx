'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Plus,
  MessageSquare,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Zap,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Image as ImageIcon,
  Settings as SettingsIcon,
  HelpCircle,
  LogIn,
  Pin,
  Archive,
  ShieldCheck,
  Flame,
  Brain,
  Code2,
  Bot,
  Key,
} from 'lucide-react';
import { CustomPersona } from './PersonaContracts';
import { useAuth } from '@/contexts/AuthContext';

const ICON_MAP: Record<string, React.ElementType> = {
  ShieldCheck,
  Zap,
  Flame,
  Brain,
  Sparkles,
  Code2,
  Bot,
};

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  modelId: string;
  personaId?: string;
  isPinned?: boolean;
  isArchived?: boolean;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  activePersona?: CustomPersona | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onTogglePinSession?: (id: string) => void;
  onToggleArchiveSession?: (id: string) => void;
  onOpenCharacterHub?: () => void;
  onCreateCharacter?: () => void;
  onOpenImageStudio?: () => void;
  onOpenSettings?: () => void;
  onClearPersona?: () => void;
  onPrefetchSession?: (id: string) => void;
  onOpenAuth?: () => void;
}

export function ChatSidebar({
  isOpen,
  onToggle,
  sessions,
  activeSessionId,
  activePersona,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onTogglePinSession,
  onToggleArchiveSession,
  onOpenCharacterHub,
  onCreateCharacter,
  onOpenImageStudio,
  onOpenSettings,
  onClearPersona,
  onPrefetchSession,
  onOpenAuth,
}: ChatSidebarProps) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [archivedExpanded, setArchivedExpanded] = useState(false);

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group sessions
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const pinnedSessions = filteredSessions.filter((s) => s.isPinned && !s.isArchived);
  const unpinnedSessions = filteredSessions.filter((s) => !s.isPinned && !s.isArchived);
  const archivedSessions = filteredSessions.filter((s) => s.isArchived);

  const todaySessions = unpinnedSessions.filter((s) => now - s.updatedAt < oneDayMs);
  const weekSessions = unpinnedSessions.filter(
    (s) => now - s.updatedAt >= oneDayMs && now - s.updatedAt < 7 * oneDayMs
  );
  const olderSessions = unpinnedSessions.filter((s) => now - s.updatedAt >= 7 * oneDayMs);

  const startEditing = (s: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditingTitle(s.title);
  };

  const saveEditing = (id: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (editingTitle.trim()) {
      onRenameSession(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const cancelEditing = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#07090e] border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        {/* Top Header */}
        <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 group px-1.5 py-0.5 rounded-lg hover:bg-white/5 transition-colors"
            title="Go to GALXAI Home"
          >
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-cyan-500 via-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-3 h-3 text-white fill-white" />
            </div>
            <div className="flex items-baseline font-black tracking-tight text-xs">
              <span className="text-white font-sans">GALX</span>
              <span className="text-cyan-400 font-sans ml-0.5">AI</span>
            </div>
          </Link>

          <button
            onClick={onToggle}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Collapse sidebar (⌘B)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="p-2 space-y-1">
          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className="w-full py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:via-indigo-500/30 hover:to-purple-500/30 border border-cyan-500/40 text-cyan-200 hover:text-white font-semibold text-xs flex items-center justify-between shadow-sm transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-90 transition-transform duration-200" />
              <span>New conversation</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-400 bg-black/40 px-1 py-0.2 rounded border border-white/10">
              ⌘N
            </span>
          </button>

          {/* Explore AI Characters Hub Link */}
          <Link
            href="/characters"
            className="w-full py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-indigo-500/15 hover:from-pink-500/25 hover:via-purple-500/25 hover:to-indigo-500/25 border border-pink-500/30 text-pink-200 hover:text-white text-xs font-semibold flex items-center justify-between transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-400 group-hover:rotate-12 transition-transform" />
              <span>Explore AI Personas</span>
            </div>
            <span className="text-[8.5px] font-mono font-bold text-pink-300 bg-pink-500/20 px-1 py-0.2 rounded">
              Anime Hub
            </span>
          </Link>

          {/* Create an AI Companion Link */}
          <Link
            href="/characters/create"
            className="w-full py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/15 hover:from-indigo-500/25 hover:via-purple-500/25 hover:to-pink-500/25 border border-indigo-500/30 text-indigo-200 hover:text-white text-xs font-semibold flex items-center justify-between transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-90 transition-transform duration-200" />
              <span>Create AI Companion</span>
            </div>
            <span className="text-[8.5px] font-mono font-bold text-indigo-300 bg-indigo-500/30 px-1 py-0.2 rounded">
              + New
            </span>
          </Link>

          {/* GPT-Image Studio Link */}
          <Link
            href="/studio"
            className="w-full py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-cyan-500/15 hover:from-purple-500/25 hover:via-indigo-500/25 hover:to-cyan-500/25 border border-purple-500/30 text-purple-200 hover:text-white text-xs font-semibold flex items-center justify-between transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
              <span>Image Studio</span>
            </div>
            <span className="text-[8.5px] font-mono font-bold text-purple-400 bg-purple-500/20 px-1 py-0.2 rounded">
              4K SOTA
            </span>
          </Link>

          {/* Active Character Pill (if selected) */}
          {activePersona && (
            <div className="p-1.5 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={`w-5 h-5 rounded-md bg-gradient-to-tr ${activePersona.avatarGradient} flex items-center justify-center text-white shrink-0`}>
                  {React.createElement(ICON_MAP[activePersona.avatarIcon] || Sparkles, { className: 'w-3 h-3' })}
                </div>
                <div className="min-w-0">
                  <p className="text-[10.5px] font-bold text-white truncate leading-tight">{activePersona.name}</p>
                  <p className="text-[8.5px] font-mono text-pink-400 truncate leading-tight">{activePersona.handle}</p>
                </div>
              </div>
              {onClearPersona && (
                <button
                  onClick={onClearPersona}
                  className="p-0.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                  title="Switch back to Default GALX AI"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Search conversations */}
          {sessions.length > 2 && (
            <div className="relative pt-0.5">
              <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-2.5 select-none text-xs">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 space-y-1">
              <MessageSquare className="w-5 h-5 mx-auto stroke-[1.5] text-zinc-600" />
              <p className="text-[10px] font-sans">
                {searchQuery ? 'No matching chats' : 'No previous conversations'}
              </p>
            </div>
          ) : (
            <>
              {/* Pinned Chats Section */}
              {pinnedSessions.length > 0 && (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-amber-400 px-1.5 py-0.5">
                    <Pin className="w-2.5 h-2.5 fill-amber-400" />
                    <span>Pinned</span>
                  </div>
                  {pinnedSessions.map((s) => (
                    <SessionItem
                      key={s.id}
                      session={s}
                      isActive={activeSessionId === s.id}
                      isEditing={editingId === s.id}
                      editingTitle={editingTitle}
                      setEditingTitle={setEditingTitle}
                      onSelect={() => onSelectSession(s.id)}
                      onPrefetch={onPrefetchSession ? () => onPrefetchSession(s.id) : undefined}
                      onStartEdit={(e) => startEditing(s, e)}
                      onSaveEdit={(e) => saveEditing(s.id, e)}
                      onCancelEdit={cancelEditing}
                      onDelete={(e) => {
                        e.stopPropagation();
                        onDeleteSession(s.id);
                      }}
                      onTogglePin={onTogglePinSession ? (e) => {
                        e.stopPropagation();
                        onTogglePinSession(s.id);
                      } : undefined}
                      onToggleArchive={onToggleArchiveSession ? (e) => {
                        e.stopPropagation();
                        onToggleArchiveSession(s.id);
                      } : undefined}
                    />
                  ))}
                </div>
              )}

              {todaySessions.length > 0 && (
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 px-1.5 py-0.5 block">
                    Today
                  </span>
                  {todaySessions.map((s) => (
                    <SessionItem
                      key={s.id}
                      session={s}
                      isActive={activeSessionId === s.id}
                      isEditing={editingId === s.id}
                      editingTitle={editingTitle}
                      setEditingTitle={setEditingTitle}
                      onSelect={() => onSelectSession(s.id)}
                      onPrefetch={onPrefetchSession ? () => onPrefetchSession(s.id) : undefined}
                      onStartEdit={(e) => startEditing(s, e)}
                      onSaveEdit={(e) => saveEditing(s.id, e)}
                      onCancelEdit={cancelEditing}
                      onDelete={(e) => {
                        e.stopPropagation();
                        onDeleteSession(s.id);
                      }}
                      onTogglePin={onTogglePinSession ? (e) => {
                        e.stopPropagation();
                        onTogglePinSession(s.id);
                      } : undefined}
                      onToggleArchive={onToggleArchiveSession ? (e) => {
                        e.stopPropagation();
                        onToggleArchiveSession(s.id);
                      } : undefined}
                    />
                  ))}
                </div>
              )}

              {weekSessions.length > 0 && (
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 px-1.5 py-0.5 block">
                    Previous 7 Days
                  </span>
                  {weekSessions.map((s) => (
                    <SessionItem
                      key={s.id}
                      session={s}
                      isActive={activeSessionId === s.id}
                      isEditing={editingId === s.id}
                      editingTitle={editingTitle}
                      setEditingTitle={setEditingTitle}
                      onSelect={() => onSelectSession(s.id)}
                      onPrefetch={onPrefetchSession ? () => onPrefetchSession(s.id) : undefined}
                      onStartEdit={(e) => startEditing(s, e)}
                      onSaveEdit={(e) => saveEditing(s.id, e)}
                      onCancelEdit={cancelEditing}
                      onDelete={(e) => {
                        e.stopPropagation();
                        onDeleteSession(s.id);
                      }}
                      onTogglePin={onTogglePinSession ? (e) => {
                        e.stopPropagation();
                        onTogglePinSession(s.id);
                      } : undefined}
                      onToggleArchive={onToggleArchiveSession ? (e) => {
                        e.stopPropagation();
                        onToggleArchiveSession(s.id);
                      } : undefined}
                    />
                  ))}
                </div>
              )}

              {olderSessions.length > 0 && (
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 px-1.5 py-0.5 block">
                    Older Chats
                  </span>
                  {olderSessions.map((s) => (
                    <SessionItem
                      key={s.id}
                      session={s}
                      isActive={activeSessionId === s.id}
                      isEditing={editingId === s.id}
                      editingTitle={editingTitle}
                      setEditingTitle={setEditingTitle}
                      onSelect={() => onSelectSession(s.id)}
                      onPrefetch={onPrefetchSession ? () => onPrefetchSession(s.id) : undefined}
                      onStartEdit={(e) => startEditing(s, e)}
                      onSaveEdit={(e) => saveEditing(s.id, e)}
                      onCancelEdit={cancelEditing}
                      onDelete={(e) => {
                        e.stopPropagation();
                        onDeleteSession(s.id);
                      }}
                      onTogglePin={onTogglePinSession ? (e) => {
                        e.stopPropagation();
                        onTogglePinSession(s.id);
                      } : undefined}
                      onToggleArchive={onToggleArchiveSession ? (e) => {
                        e.stopPropagation();
                        onToggleArchiveSession(s.id);
                      } : undefined}
                    />
                  ))}
                </div>
              )}

              {/* Archived Chats Section */}
              {archivedSessions.length > 0 && (
                <div className="pt-1.5 border-t border-white/5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => setArchivedExpanded(!archivedExpanded)}
                    className="w-full flex items-center justify-between px-1.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1">
                      <Archive className="w-2.5 h-2.5" />
                      <span>Archived ({archivedSessions.length})</span>
                    </div>
                    {archivedExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                  </button>

                  {archivedExpanded && (
                    <div className="space-y-0.5 pl-0.5">
                      {archivedSessions.map((s) => (
                        <SessionItem
                          key={s.id}
                          session={s}
                          isActive={activeSessionId === s.id}
                          isEditing={editingId === s.id}
                          editingTitle={editingTitle}
                          setEditingTitle={setEditingTitle}
                          onSelect={() => onSelectSession(s.id)}
                          onPrefetch={onPrefetchSession ? () => onPrefetchSession(s.id) : undefined}
                          onStartEdit={(e) => startEditing(s, e)}
                          onSaveEdit={(e) => saveEditing(s.id, e)}
                          onCancelEdit={cancelEditing}
                          onDelete={(e) => {
                            e.stopPropagation();
                            onDeleteSession(s.id);
                          }}
                          onTogglePin={onTogglePinSession ? (e) => {
                            e.stopPropagation();
                            onTogglePinSession(s.id);
                          } : undefined}
                          onToggleArchive={onToggleArchiveSession ? (e) => {
                            e.stopPropagation();
                            onToggleArchiveSession(s.id);
                          } : undefined}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Navigation & Auth Promo */}
        <div className="p-2 border-t border-white/10 space-y-1.5 bg-[#05070a]/95">
          {/* Quick Links */}
          <div className="space-y-0.5 font-sans text-[11px]">
            <Link
              href="/keys"
              className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition-colors group cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>Developer API Keys</span>
            </Link>

            <Link
              href="/pricing"
              className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition-colors group cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-400 group-hover:scale-110 transition-transform" />
              <span>See plans and pricing</span>
            </Link>

            <Link
              href="/settings"
              className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer group"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-zinc-400 group-hover:rotate-45 transition-transform" />
              <span>Settings</span>
            </Link>

            <Link
              href="/docs"
              className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition-colors group cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>Help</span>
            </Link>
          </div>

          {/* Auth Profile or Log in Promo Card */}
          {isAuthenticated && user ? (
            <div className="p-2.5 rounded-xl bg-gradient-to-b from-[#0f1424] to-[#0a0d17] border border-white/10 space-y-2 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-mono text-xs shadow-sm shrink-0 overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    (user.name || user.email || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs text-white truncate">{user.name || 'Developer'}</p>
                  <p className="text-[10px] text-zinc-400 font-mono truncate">{user.email || 'Developer Workspace'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-white/5 font-mono">
                <span className="text-cyan-400 font-bold uppercase">{user.role || 'Pro Active'}</span>
                <button
                  type="button"
                  onClick={logout}
                  className="text-zinc-400 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-gradient-to-b from-[#0f1424] to-[#0a0d17] border border-white/10 space-y-1.5 shadow-lg relative overflow-hidden">
              <div className="space-y-0.5">
                <h3 className="font-bold text-[11px] text-white tracking-tight">
                  Save your chats and companions
                </h3>
                <p className="text-[10px] text-zinc-400 font-sans leading-snug">
                  Log in to save chat history, build AI companions, and create images.
                </p>
              </div>

              <Link
                href={pathname && pathname !== '/' && !pathname.startsWith('/auth') ? `/auth/signin?next=${encodeURIComponent(pathname)}` : '/auth/signin'}
                className="w-full py-1.5 px-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer text-center"
              >
                <LogIn className="w-3 h-3" />
                <span>Log in</span>
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function SessionItem({
  session,
  isActive,
  isEditing,
  editingTitle,
  setEditingTitle,
  onSelect,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onTogglePin,
  onToggleArchive,
  onPrefetch,
}: {
  session: ChatSession;
  isActive: boolean;
  isEditing: boolean;
  editingTitle: string;
  setEditingTitle: (val: string) => void;
  onSelect: () => void;
  onStartEdit: (e: React.MouseEvent) => void;
  onSaveEdit: (e?: React.MouseEvent | React.FormEvent) => void;
  onCancelEdit: (e?: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onTogglePin?: (e: React.MouseEvent) => void;
  onToggleArchive?: (e: React.MouseEvent) => void;
  onPrefetch?: () => void;
}) {
  if (isEditing) {
    return (
      <form
        onSubmit={onSaveEdit}
        onClick={(e) => e.stopPropagation()}
        className="p-1 rounded-lg bg-white/10 border border-cyan-500/50 flex items-center gap-1"
      >
        <input
          type="text"
          autoFocus
          value={editingTitle}
          onChange={(e) => setEditingTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancelEdit();
          }}
          className="flex-1 bg-transparent px-1.5 py-0.5 text-xs text-white focus:outline-none"
        />
        <button
          type="button"
          onClick={onSaveEdit}
          className="p-0.5 text-emerald-400 hover:text-emerald-300"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onCancelEdit}
          className="p-0.5 text-zinc-400 hover:text-zinc-200"
        >
          <X className="w-3 h-3" />
        </button>
      </form>
    );
  }

  return (
    <div
      onClick={onSelect}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className={`group relative flex items-center justify-between py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
        isActive
          ? 'bg-white/10 text-white font-semibold border border-white/10'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0 pr-1">
        {session.isPinned ? (
          <Pin className="w-3 h-3 shrink-0 text-amber-400 fill-amber-400" />
        ) : session.isArchived ? (
          <Archive className="w-3 h-3 shrink-0 text-purple-400" />
        ) : (
          <MessageSquare
            className={`w-3 h-3 shrink-0 ${
              isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-zinc-400'
            }`}
          />
        )}
        <span className="truncate text-xs">{session.title || 'Untitled Conversation'}</span>
      </div>

      {/* Hover action buttons */}
      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 bg-[#07090e]/95 pl-1 rounded">
        {onTogglePin && (
          <button
            onClick={onTogglePin}
            className={`p-0.5 rounded hover:bg-white/10 transition-colors ${
              session.isPinned ? 'text-amber-400' : 'text-zinc-400 hover:text-amber-300'
            }`}
            title={session.isPinned ? 'Unpin chat' : 'Pin chat to top'}
          >
            <Pin className={`w-2.5 h-2.5 ${session.isPinned ? 'fill-amber-400' : ''}`} />
          </button>
        )}
        {onToggleArchive && (
          <button
            onClick={onToggleArchive}
            className={`p-0.5 rounded hover:bg-white/10 transition-colors ${
              session.isArchived ? 'text-purple-400' : 'text-zinc-400 hover:text-purple-300'
            }`}
            title="Archive & Delete conversation"
          >
            <Archive className="w-2.5 h-2.5" />
          </button>
        )}
        <button
          onClick={onStartEdit}
          className="p-0.5 text-zinc-400 hover:text-white rounded hover:bg-white/10 transition-colors"
          title="Rename conversation"
        >
          <Edit2 className="w-2.5 h-2.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-0.5 text-zinc-400 hover:text-red-400 rounded hover:bg-white/10 transition-colors"
          title="Delete conversation"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}
