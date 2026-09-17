import Link from 'next/link';
import { 
  Bot, 
  Download, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Hash, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';
import { AGENT_SETUP, DOC_NAV, docMarkdown, type DocPage } from '@/lib/docs/content';
import { DocsCode, DocsCopyButton, DocsCalloutBox } from './DocsControls';

export function DocsArticle({ page }: { page: DocPage }) {
  const index = DOC_NAV.findIndex((item) => item.href === page.path);
  const previous = index > 0 ? DOC_NAV[index - 1] : undefined;
  const next = index >= 0 && index < DOC_NAV.length - 1 ? DOC_NAV[index + 1] : undefined;

  return (
    <article className="min-w-0 pb-16">
      {/* Header Banner */}
      <header className="border-b border-white/10 pb-8 pt-2">
        {page.badge && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span>{page.badge}</span>
          </div>
        )}

        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          {page.title}
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-300 sm:text-lg">
          {page.description}
        </p>

        {/* Action Controls */}
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <DocsCopyButton
            text={AGENT_SETUP}
            label="Copy for Coding Agent"
            primary
            className="px-3 py-2 text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-500/10"
          />
          <DocsCopyButton
            text={docMarkdown(page)}
            label="Copy Markdown"
            className="px-3 py-2 text-xs sm:text-sm"
          />
          <a
            href="/docs/agent-setup?download=1"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs sm:text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <Download className="h-3.5 w-3.5 text-zinc-400" />
            Download Agent Setup
          </a>
          <Link
            href="/playground"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs sm:text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Open in Playground
          </Link>
        </div>
      </header>

      {/* Mobile/Tablet On-Page TOC */}
      <div className="my-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 lg:hidden">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          On this page
        </p>
        <nav aria-label="On this page" className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          {page.sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="text-zinc-400 hover:text-indigo-300 transition-colors"
            >
              # {section.title}
            </a>
          ))}
        </nav>
      </div>

      {/* Article Sections */}
      <div className="divide-y divide-white/[0.07] space-y-12">
        {page.sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-28 pt-10 first:pt-8 space-y-5"
          >
            {/* Section Header */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <a
                  href={`#${section.id}`}
                  className="group inline-flex items-center gap-2 text-xl font-bold tracking-tight text-white hover:text-indigo-300 transition-colors sm:text-2xl"
                >
                  <span>{section.title}</span>
                  <Hash className="h-4 w-4 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-indigo-400" />
                </a>

                {section.badge && (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[11px] font-medium text-zinc-400">
                    {section.badge}
                  </span>
                )}
              </div>
            </div>

            {/* Callout Box */}
            {section.callout && <DocsCalloutBox callout={section.callout} />}

            {/* Paragraphs */}
            {section.body?.map((text, idx) => (
              <p key={idx} className="text-sm leading-7 text-zinc-300 sm:text-base">
                {text}
              </p>
            ))}

            {/* Step List */}
            {section.steps && (
              <div className="my-4 space-y-3">
                {section.steps.map((step, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors hover:border-white/10"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 font-mono text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/40">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-6 text-zinc-200">{step}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Structured Table */}
            {section.table && (
              <div className="my-6 overflow-hidden rounded-xl border border-white/10 bg-[#06070a] shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-white/10 bg-zinc-900/50 text-xs uppercase tracking-wider text-zinc-400">
                      <tr>
                        {section.table.headings.map((heading) => (
                          <th scope="col" key={heading} className="px-4 py-3 font-semibold">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {section.table.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                          {row.map((cell, j) => (
                            <td
                              key={j}
                              className={`px-4 py-3.5 leading-6 ${
                                j === 0
                                  ? 'font-mono text-xs font-medium text-indigo-200'
                                  : 'text-xs sm:text-sm text-zinc-300'
                              }`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Code Blocks */}
            {section.code && (
              <DocsCode examples={section.code} responseCode={section.responseCode} />
            )}

            {/* Deep Links */}
            {section.links && (
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 transition-colors hover:text-indigo-200 hover:underline"
                  >
                    <span>{link.label}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Pagination Footer */}
      <nav
        aria-label="Continue reading"
        className="mt-16 grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-2"
      >
        {previous ? (
          <Link
            href={previous.href}
            className="group flex flex-col rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-all hover:border-white/20 hover:bg-white/[0.05]"
          >
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 group-hover:text-zinc-300">
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              Previous Guide
            </span>
            <span className="mt-1 text-sm font-semibold text-zinc-100 group-hover:text-indigo-300">
              {previous.title}
            </span>
          </Link>
        ) : (
          <div />
        )}

        {next && (
          <Link
            href={next.href}
            className="group flex flex-col items-end text-right rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-all hover:border-white/20 hover:bg-white/[0.05]"
          >
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 group-hover:text-zinc-300">
              Next Guide
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="mt-1 text-sm font-semibold text-zinc-100 group-hover:text-indigo-300">
              {next.title}
            </span>
          </Link>
        )}
      </nav>
    </article>
  );
}
