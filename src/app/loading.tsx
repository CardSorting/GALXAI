export default function RootLoading() {
  return <div className="mx-auto w-full max-w-7xl flex-1 px-5 py-8" role="status" aria-live="polite" aria-busy="true">
    <p className="text-sm text-zinc-300">Loading page…</p>
    <div className="mt-6 h-64 rounded-lg border border-white/10 bg-white/[.02]" aria-hidden="true" />
  </div>;
}
