import Link from 'next/link';
import { AGENT_SETUP, DOC_NAV, docMarkdown, type DocPage } from '@/lib/docs/content';
import { DocsCode, DocsCopyButton } from './DocsControls';
export function DocsArticle({ page }: { page: DocPage }) {
  const index = DOC_NAV.findIndex(item => item.href === page.path);
  const previous = DOC_NAV[index - 1];
  const next = DOC_NAV[index + 1];
  return <article>
    <header className="border-b border-white/10 pb-7">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{page.title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">{page.description}</p>
      <div className="mt-5 flex flex-wrap items-start gap-2"><DocsCopyButton text={AGENT_SETUP} label="Copy for agent" primary /><DocsCopyButton text={docMarkdown(page)} label="Copy page" /><a href="/docs/agent-setup?download=1" className="px-3 py-2 text-sm text-zinc-400 underline underline-offset-4 hover:text-white">Download setup</a></div>
    </header>
    <nav aria-label="On this page" className="flex flex-wrap gap-x-4 gap-y-2 py-5 text-xs text-zinc-400">{page.sections.map(section => <a key={section.id} href={`#${section.id}`} className="hover:text-indigo-200 underline underline-offset-4">{section.title}</a>)}</nav>
    <div className="space-y-10 pt-3">{page.sections.map(section => <section key={section.id} id={section.id} className="scroll-mt-24 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
      {section.body?.map(text => <p key={text} className="text-sm leading-7 text-zinc-300">{text}</p>)}
      {section.steps && <ol className="list-decimal space-y-2 pl-5 text-sm leading-7 text-zinc-300">{section.steps.map(step => <li key={step}>{step}</li>)}</ol>}
      {section.table && <div className="overflow-x-auto rounded-lg border border-white/10"><table className="w-full text-left text-sm"><thead className="bg-white/[0.03] text-zinc-400"><tr>{section.table.headings.map(heading => <th scope="col" key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody>{section.table.rows.map((row, i) => <tr key={i} className="border-t border-white/10">{row.map((cell, j) => <td key={j} className={`px-4 py-3 leading-6 ${j === 0 ? 'font-mono text-xs text-zinc-200' : 'text-zinc-300'}`}>{cell}</td>)}</tr>)}</tbody></table></div>}
      {section.code && <DocsCode examples={section.code} />}
      {section.links && <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">{section.links.map(link => <Link key={link.href} href={link.href} className="text-indigo-300 underline underline-offset-4 hover:text-indigo-200">{link.label} →</Link>)}</div>}
    </section>)}</div>
    <nav aria-label="Continue reading" className="mt-12 flex justify-between gap-6 border-t border-white/10 pt-6 text-sm">{previous ? <Link href={previous.href} className="text-zinc-400 hover:text-white">← {previous.title}</Link> : <span />}{next && <Link href={next.href} className="text-indigo-300 hover:text-indigo-200">{next.title} →</Link>}</nav>
  </article>;
}
