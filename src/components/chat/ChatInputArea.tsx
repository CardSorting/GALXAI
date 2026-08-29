'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowUp,
  Square,
  Paperclip,
  Mic,
  MicOff,
  Code2,
  Sparkles,
  X,
  FileText,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { AttachedFile } from './ChatMessageItem';

const TEXTAREA_MIN_HEIGHT = 26;
const TEXTAREA_MAX_HEIGHT = 280;

interface ChatInputAreaProps {
  input: string;
  setInput: (value: string) => void;
  attachments: AttachedFile[];
  setAttachments: React.Dispatch<React.SetStateAction<AttachedFile[]>>;
  isStreaming: boolean;
  onSend: () => void;
  onStop: () => void;
  selectedModelName?: string;
  onOpenCharacterHub?: () => void;
  onOpenImageStudio?: () => void;
}

export function ChatInputArea({
  input,
  setInput,
  attachments,
  setAttachments,
  isStreaming,
  onSend,
  onStop,
  onOpenCharacterHub,
  onOpenImageStudio,
}: ChatInputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  const [isListening, setIsListening] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset first so scrollHeight reflects both growing and shrinking content.
    textarea.style.height = '0px';
    const contentHeight = textarea.scrollHeight;
    const nextHeight = Math.min(
      Math.max(contentHeight, TEXTAREA_MIN_HEIGHT),
      TEXTAREA_MAX_HEIGHT,
    );

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = contentHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
  }, []);

  // Keep programmatic changes (suggested prompts, dictation, send/reset) in sync.
  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  // Recalculate wrapping when the composer width changes.
  useEffect(() => {
    window.addEventListener('resize', resizeTextarea);
    return () => window.removeEventListener('resize', resizeTextarea);
  }, [resizeTextarea]);

  // Click outside to close tools menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setShowToolsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && (input.trim() || attachments.length > 0)) {
        onSend();
      }
    }
  };

  // Process selected files
  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      const fileId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const isImage = file.type.startsWith('image/');

      const reader = new FileReader();

      if (isImage) {
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setAttachments((prev) => [
            ...prev,
            {
              id: fileId,
              name: file.name,
              size: file.size,
              type: file.type,
              dataUrl,
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (e) => {
          const textContent = e.target?.result as string;
          setAttachments((prev) => [
            ...prev,
            {
              id: fileId,
              name: file.name,
              size: file.size,
              type: file.type,
              textContent,
            },
          ]);
        };
        reader.readAsText(file);
      }
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Clipboard Paste Support (for screenshots / code files)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      processFiles(e.clipboardData.files);
    }
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Web Speech Dictation
  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(input ? `${input} ${transcript}` : transcript);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const insertSnippet = (snippet: string) => {
    setInput(input ? `${input}\n${snippet}` : snippet);
    setShowToolsMenu(false);
    textareaRef.current?.focus();
  };

  const canSend = Boolean(input.trim() || attachments.length > 0);

  return (
    <div className="sticky bottom-0 z-20 w-full px-3 sm:px-6 pb-3 sm:pb-4 pt-1 bg-gradient-to-t from-[#07090e] via-[#07090e]/95 to-transparent">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        accept="image/*,.txt,.pdf,.json,.ts,.tsx,.js,.jsx,.py,.md,.csv,.html,.css"
        className="hidden"
      />

      <div className="max-w-3xl mx-auto space-y-1.5">
        {/* Dynamic Responsive Input Shell */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-[22px] sm:rounded-[26px] transition-colors duration-150 p-2.5 sm:p-3 shadow-2xl flex flex-col justify-between ${
            isDragging
              ? 'border-2 border-dashed border-cyan-400 bg-cyan-500/10 shadow-cyan-500/20'
              : isFocused
              ? 'bg-[#0f1424] border border-cyan-500/40 shadow-xl shadow-cyan-500/5 ring-1 ring-cyan-500/20'
              : 'bg-[#0e121e]/90 border border-white/15 hover:border-white/25'
          }`}
        >
          {/* Drag & Drop Overlay Indicator */}
          {isDragging && (
            <div className="absolute inset-0 z-30 rounded-[26px] bg-cyan-950/85 backdrop-blur-sm flex items-center justify-center gap-2 text-cyan-300 font-bold text-xs pointer-events-none">
              <Upload className="w-5 h-5" />
              <span>Drop files or images here to attach</span>
            </div>
          )}

          {/* Attachments Row & High-Velocity Document Indicator */}
          {attachments.length > 0 && (() => {
            const totalChars = attachments.reduce((acc, a) => acc + (a.textContent?.length || 0), 0);
            const estPages = Math.max(1, Math.ceil(totalChars / 2200));
            const estTokens = Math.ceil(totalChars / 3.8);
            const isLargeDoc = totalChars > 2000 || attachments.length >= 2;

            return (
              <div className="p-1 mb-2 border-b border-white/10 space-y-1.5">
                {isLargeDoc && (
                  <div className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono text-cyan-300">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                      <span className="font-bold">High-Velocity Context:</span>
                      <span>~{estPages.toLocaleString()} pages ({estTokens.toLocaleString()} tokens)</span>
                    </div>
                    <span className="text-[10px] text-cyan-400/80 font-semibold">Dynamic 1M Window</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {attachments.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 py-1 px-2.5 rounded-xl bg-black/60 border border-white/15 text-xs text-white group hover:border-cyan-500/40 transition-all shadow-sm"
                    >
                      {file.dataUrl ? (
                        <div className="w-5 h-5 rounded-md overflow-hidden bg-zinc-800 shrink-0">
                          <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      )}
                      <span className="truncate max-w-[130px] font-mono text-[11px]">{file.name}</span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(file.id)}
                        className="p-0.5 rounded text-zinc-400 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Auto-growing prompt field */}
          <div className="w-full px-1.5 py-0.5">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onInput={resizeTextarea}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={isListening ? 'Listening to your voice...' : 'Ask GALX anything, paste code, or drop files...'}
              className="block w-full resize-none overflow-y-hidden max-h-[280px] bg-transparent text-base leading-relaxed text-white placeholder-zinc-500 focus:outline-none px-0 py-0.5 font-sans selection:bg-cyan-500 selection:text-black"
              style={{ minHeight: `${TEXTAREA_MIN_HEIGHT}px` }}
            />
          </div>

          {/* Bottom Toolbar & Dynamic Controls */}
          <div className="flex items-center justify-between pt-2 px-1 gap-2 select-none">
            {/* Left Actions: Attach File / Template Snippets */}
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              <div className="relative" ref={toolsMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowToolsMenu(!showToolsMenu)}
                  className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                    showToolsMenu
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-white/5 hover:bg-white/10 hover:text-white text-zinc-400'
                  }`}
                  title="Attach files or insert templates"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {showToolsMenu && (
                  <div className="absolute left-0 bottom-full mb-2 w-64 rounded-2xl bg-[#0c101c] border border-white/15 p-2 shadow-2xl space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full p-2 rounded-xl hover:bg-white/5 text-left text-xs text-zinc-200 hover:text-white flex items-center gap-2 cursor-pointer font-semibold"
                    >
                      <Upload className="w-4 h-4 text-cyan-400" />
                      <span>Upload Files or Images</span>
                    </button>

                    <Link
                      href="/characters"
                      onClick={() => setShowToolsMenu(false)}
                      className="w-full p-2 rounded-xl hover:bg-white/5 text-left text-xs text-pink-300 hover:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-pink-400" />
                      <span>Explore AI Personas</span>
                    </Link>

                    <Link
                      href="/studio"
                      onClick={() => setShowToolsMenu(false)}
                      className="w-full p-2 rounded-xl hover:bg-white/5 text-left text-xs text-purple-300 hover:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-purple-400" />
                      <span>GPT-Image Studio (4K)</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => insertSnippet('```typescript\n// Insert your TypeScript code here\n```')}
                      className="w-full p-2 rounded-xl hover:bg-white/5 text-left text-xs text-zinc-300 hover:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <Code2 className="w-4 h-4 text-indigo-400" />
                      <span>Insert Code Block</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertSnippet('[System Context: Optimize strictly for low memory footprint and high throughput]')}
                      className="w-full p-2 rounded-xl hover:bg-white/5 text-left text-xs text-zinc-300 hover:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>Insert System Directive</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Character / Line Metrics when typing */}
              {input.length > 50 && (
                <span className="hidden sm:inline-block text-[10px] font-mono text-zinc-500 pl-1">
                  {input.length} chars • ~{Math.round(input.length / 4)} tokens
                </span>
              )}
            </div>

            {/* Right Actions: Voice Dictation & Send Button */}
            <div className="flex items-center gap-1.5">
              {/* Dictation Mic */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isListening
                    ? 'bg-red-500/25 border border-red-500/50 text-red-400 animate-pulse'
                    : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
                }`}
                title={isListening ? 'Listening... click to stop' : 'Voice dictation'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Dynamic Send / Stop Button */}
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="p-2 rounded-xl sm:rounded-2xl bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-1"
                  title="Stop generation (Esc)"
                >
                  <Square className="w-3.5 h-3.5 fill-black" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSend}
                  disabled={!canSend}
                  className={`p-2 rounded-xl sm:rounded-2xl transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center ${
                    canSend
                      ? 'bg-white hover:bg-zinc-200 text-black font-bold shadow-white/20 hover:scale-105'
                      : 'bg-white/10 text-zinc-600 cursor-not-allowed opacity-40'
                  }`}
                  title="Send message (Enter)"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Micro-Disclaimer & Developer Gateway Link */}
        <div className="flex items-center justify-between text-[10.5px] sm:text-[11px] text-zinc-500 px-2 font-mono">
          <span className="truncate pr-2">GALX AI routes across OpenAI Codex & GPT-5.6 frontier models.</span>
          <Link
            href="/gateway"
            className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 font-bold shrink-0"
          >
            <span>Developer Gateway & API →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
