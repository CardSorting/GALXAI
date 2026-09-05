const CARD_SHAPES = [
  'aspect-square',
  'aspect-[4/5]',
  'aspect-square',
  'aspect-[4/5]',
  'aspect-square'
] as const;

function Pulse({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse bg-white/[0.055] motion-reduce:animate-none ${className}`} />;
}

export function VisualLibrarySkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-7">
      <span className="sr-only">Loading your image library</span>

      <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Pulse className="h-7 w-40 rounded-md" />
          <Pulse className="h-4 w-full max-w-md rounded sm:w-96" />
        </div>
        <div className="grid grid-cols-3 divide-x divide-white/[0.08] rounded-xl border border-white/[0.08] bg-white/[0.02] px-1 py-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex min-w-24 flex-col items-center gap-2 px-3 py-0.5">
              <Pulse className="h-2.5 w-12 rounded" />
              <Pulse className="h-4 w-8 rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <Pulse className="h-11 min-w-0 flex-1 rounded-lg" />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Pulse className="h-11 rounded-lg sm:w-48" />
          <Pulse className="h-11 rounded-lg sm:w-36" />
          <Pulse className="h-11 rounded-lg sm:w-28" />
          <Pulse className="h-11 rounded-lg sm:w-36" />
        </div>
      </div>

      {[0, 1].map((group) => (
        <div key={group} className="space-y-3">
          <div className="flex items-center justify-between">
            <Pulse className="h-4 w-24 rounded" />
            <Pulse className="h-3 w-14 rounded" />
          </div>
          <div className="grid grid-cols-2 items-start gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {CARD_SHAPES.map((shape, item) => (
              <div key={item} className="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.015]">
                <Pulse className={`${shape} w-full`} />
                <div className="flex items-center justify-between px-3 py-3">
                  <Pulse className="h-3 w-16 rounded" />
                  <Pulse className="h-3 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
