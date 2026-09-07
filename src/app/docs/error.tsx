'use client';

import Link from 'next/link';

export default function DocsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="space-y-4 py-10">
    <h1 className="text-2xl font-semibold">Could not load this page</h1>
    <p className="text-sm text-zinc-400">Try again, or return to the quickstart.</p>
    <div className="flex items-center gap-5 text-sm">
      <button type="button" onClick={reset} className="rounded-md border border-white/15 px-3 py-2 hover:bg-white/5">Try again</button>
      <Link href="/docs" className="text-indigo-300 underline underline-offset-4">Quickstart</Link>
    </div>
  </div>;
}
