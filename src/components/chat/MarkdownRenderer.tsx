'use client';

import React, { useState } from 'react';
import { Copy, Check, Terminal, Code2, ExternalLink } from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

export function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  if (!content) return null;

  // Split content into blocks: code blocks vs text blocks
  const parts = splitCodeBlocks(content);

  return (
    <div className="space-y-3.5 text-[14px] leading-relaxed text-zinc-200 font-sans break-words select-text">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <CodeBlock
              key={`code-${index}`}
              language={part.language || 'text'}
              code={part.content}
            />
          );
        }

        return (
          <TextBlock
            key={`text-${index}`}
            content={part.content}
            isStreaming={isStreaming && index === parts.length - 1}
          />
        );
      })}
    </div>
  );
}

function splitCodeBlocks(text: string): Array<{ type: 'text' | 'code'; content: string; language?: string }> {
  const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)(?:```|$)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }

    parts.push({
      type: 'code',
      language: match[1] || 'plaintext',
      content: match[2] || '',
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  return parts;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await safeCopyToClipboard(code.trim());
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cleanLang = language.toLowerCase().trim() || 'code';

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-white/10 bg-[#090b11] shadow-2xl transition-all group">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.04] border-b border-white/10 text-xs font-mono text-zinc-400">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold text-zinc-300 uppercase text-[11px] tracking-wider">
            {cleanLang}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-[11px] font-mono cursor-pointer"
          title="Copy snippet"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <div className="p-4 overflow-x-auto font-mono text-[13px] leading-relaxed text-zinc-200 selection:bg-indigo-500 selection:text-white">
        <pre className="m-0 p-0 whitespace-pre">
          <code>{highlightCode(code)}</code>
        </pre>
      </div>
    </div>
  );
}

function highlightCode(code: string): React.ReactNode {
  // Simple, fast syntax highlighter for keywords, strings, comments, types, and numbers
  const lines = code.split('\n');

  return lines.map((line, lineIdx) => {
    return (
      <div key={lineIdx} className="table-row">
        <span className="table-cell pr-4 text-zinc-600 select-none text-right text-[11px] w-8">
          {lineIdx + 1}
        </span>
        <span className="table-cell">{tokenizeLine(line)}</span>
      </div>
    );
  });
}

function tokenizeLine(line: string): React.ReactNode {
  if (!line) return <span>&nbsp;</span>;

  // Single-line comment
  if (line.trim().startsWith('//') || line.trim().startsWith('#') || line.trim().startsWith('--')) {
    return <span className="text-zinc-500 italic">{line}</span>;
  }

  // Tokenize basic elements
  const tokens = line.split(/([ \t\(\)\{\}\[\]\.,;:=<>+\-*\/&|!"'`])/g);

  const keywords = new Set([
    'import', 'from', 'export', 'default', 'function', 'const', 'let', 'var', 'return',
    'if', 'else', 'async', 'await', 'try', 'catch', 'finally', 'for', 'while', 'class',
    'interface', 'type', 'extends', 'implements', 'new', 'switch', 'case', 'break',
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'GROUP', 'BY', 'ORDER', 'LIMIT', 'def', 'class',
    'public', 'private', 'readonly', 'typeof', 'instanceof', 'void', 'null', 'undefined', 'true', 'false'
  ]);

  return tokens.map((tok, i) => {
    if (!tok) return null;

    if (keywords.has(tok)) {
      return <span key={i} className="text-cyan-400 font-semibold">{tok}</span>;
    }
    if (/^["'].*["']$/.test(tok) || /^`.*`$/.test(tok)) {
      return <span key={i} className="text-amber-300">{tok}</span>;
    }
    if (/^[0-9]+(?:\.[0-9]+)?$/.test(tok)) {
      return <span key={i} className="text-emerald-400">{tok}</span>;
    }
    if (/^[A-Z][a-zA-Z0-9_]*$/.test(tok)) {
      return <span key={i} className="text-indigo-300 font-medium">{tok}</span>;
    }
    return <span key={i}>{tok}</span>;
  });
}

function TextBlock({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  // Parse paragraphs, markdown tables, headings, blockquotes, lists
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let inTable = false;
  let tableRows: string[][] = [];

  const flushList = (key: string) => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={key} className="my-2 space-y-1.5 pl-5 list-disc list-outside text-zinc-300 marker:text-cyan-400">
            {currentList.items.map((item, idx) => (
              <li key={idx}>{renderInlineMarkdown(item)}</li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={key} className="my-2 space-y-1.5 pl-5 list-decimal list-outside text-zinc-300 marker:text-amber-400">
            {currentList.items.map((item, idx) => (
              <li key={idx}>{renderInlineMarkdown(item)}</li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  const flushTable = (key: string) => {
    if (inTable && tableRows.length > 0) {
      const headerRow = tableRows[0];
      const bodyRows = tableRows.slice(1);

      elements.push(
        <div key={key} className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-black/40">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-zinc-200 font-mono">
                {headerRow.map((cell, cIdx) => (
                  <th key={cIdx} className="p-2.5 font-bold">
                    {renderInlineMarkdown(cell.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2.5 text-zinc-300">
                      {renderInlineMarkdown(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      inTable = false;
      tableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Markdown Table row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList(`list-before-table-${i}`);
      // Skip markdown separator row |---|---|
      if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(trimmed)) {
        continue;
      }
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => c.trim());
      inTable = true;
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable(`table-${i}`);
    }

    // Heading 1
    if (line.startsWith('# ')) {
      flushList(`list-${i}`);
      elements.push(
        <h1 key={`h1-${i}`} className="text-xl sm:text-2xl font-black text-white tracking-tight mt-5 mb-2.5 flex items-center gap-2">
          {renderInlineMarkdown(line.slice(2))}
        </h1>
      );
      continue;
    }

    // Heading 2
    if (line.startsWith('## ')) {
      flushList(`list-${i}`);
      elements.push(
        <h2 key={`h2-${i}`} className="text-lg sm:text-xl font-bold text-white tracking-tight mt-4 mb-2 flex items-center gap-2">
          {renderInlineMarkdown(line.slice(3))}
        </h2>
      );
      continue;
    }

    // Heading 3
    if (line.startsWith('### ')) {
      flushList(`list-${i}`);
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-white tracking-tight mt-3 mb-1.5">
          {renderInlineMarkdown(line.slice(4))}
        </h3>
      );
      continue;
    }

    // Bullet List (- or * or •)
    const bulletMatch = line.match(/^[\s]*[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList(`list-prev-${i}`);
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Numbered List
    const numMatch = line.match(/^[\s]*([0-9]+)\.\s+(.*)$/);
    if (numMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList(`list-prev-${i}`);
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numMatch[2]);
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList(`list-${i}`);
      const quoteText = line.slice(2);
      // Check for callout badge
      let alertStyle = 'border-l-2 border-cyan-500/50 bg-cyan-500/5 text-cyan-200';
      if (quoteText.startsWith('[!NOTE]')) {
        alertStyle = 'border-l-2 border-indigo-500/50 bg-indigo-500/5 text-indigo-200';
      } else if (quoteText.startsWith('[!TIP]')) {
        alertStyle = 'border-l-2 border-emerald-500/50 bg-emerald-500/5 text-emerald-200';
      } else if (quoteText.startsWith('[!WARNING]') || quoteText.startsWith('[!CAUTION]')) {
        alertStyle = 'border-l-2 border-amber-500/50 bg-amber-500/5 text-amber-200';
      }

      elements.push(
        <blockquote key={`quote-${i}`} className={`my-2 pl-3.5 py-1.5 rounded-r-xl ${alertStyle} text-xs font-mono`}>
          {renderInlineMarkdown(quoteText.replace(/^\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/, ''))}
        </blockquote>
      );
      continue;
    }

    // Regular Paragraph
    if (trimmed) {
      flushList(`list-${i}`);
      elements.push(
        <p key={`p-${i}`} className="my-1.5 text-zinc-200 leading-relaxed">
          {renderInlineMarkdown(line)}
        </p>
      );
    }
  }

  flushList('list-final');
  flushTable('table-final');

  return (
    <div className="space-y-1">
      {elements}
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse rounded-sm align-middle" />
      )}
    </div>
  );
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Parse inline elements: `code`, **bold**, *italic*, [link](url)
  const segments: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;

  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      segments.push(text.substring(lastIdx, match.index));
    }

    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      // Inline Code
      segments.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded-md bg-white/10 text-cyan-300 font-mono text-[12.5px] border border-white/10 mx-0.5">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      // Bold
      segments.push(
        <strong key={match.index} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      // Italic
      segments.push(
        <em key={match.index} className="italic text-zinc-300">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('[') && token.includes('](')) {
      // Link
      const linkTextMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkTextMatch) {
        const linkLabel = linkTextMatch[1];
        const linkUrl = linkTextMatch[2];
        segments.push(
          <a
            key={match.index}
            href={linkUrl}
            target={linkUrl.startsWith('http') ? '_blank' : '_self'}
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 inline-flex items-center gap-0.5 font-medium transition-colors"
          >
            <span>{linkLabel}</span>
            {linkUrl.startsWith('http') && <ExternalLink className="w-3 h-3 inline ml-0.5" />}
          </a>
        );
      } else {
        segments.push(token);
      }
    } else {
      segments.push(token);
    }

    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    segments.push(text.substring(lastIdx));
  }

  return segments.length > 0 ? segments : text;
}
