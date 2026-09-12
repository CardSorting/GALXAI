import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
export function PublicHome() {
  return <><Navigation /><main className="mx-auto w-full max-w-7xl px-5 py-10 sm:py-16">
    <section className="relative isolate overflow-hidden rounded-3xl border border-white/15 bg-[#0d1424] px-6 py-20 sm:px-12 sm:py-28">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-cover bg-center opacity-35" style={{ backgroundImage: 'url(/brand/galaxy-hero-banner.jpg)' }} />
      <div className="max-w-2xl"><p className="font-medium text-amber-100">GALX · Early access</p><h1 className="mt-5 text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">An idea. An image.<br />A site of your own.</h1><p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-200">Create images from a prompt, or turn your idea into a website with Sites. Both are open to explore today.</p>
      <div className="mt-9 flex flex-wrap gap-4"><Link className="inline-flex min-h-12 items-center rounded-xl bg-white px-6 py-3 font-semibold text-zinc-950 hover:bg-zinc-200" href="/images">Create an image</Link><Link className="inline-flex min-h-12 items-center rounded-xl border border-white/40 bg-[#101420] px-6 py-3 font-semibold hover:bg-[#1d2540]" href="/sites">Build a site</Link></div></div>
    </section>
    <section className="mt-12 flex flex-wrap items-start justify-between gap-6 border-t border-white/15 pt-8"><div className="max-w-2xl"><h2 className="text-2xl font-semibold">Building with the developer API?</h2><p className="mt-3 leading-relaxed text-zinc-300">The developer API and other developer tools are in private preview. Request access for a more personal introduction, and help shape the product with private feedback.</p></div><Link className="inline-flex min-h-11 items-center py-3 font-semibold text-amber-200 underline underline-offset-4" href="/developers">Join the developer waitlist →</Link></section>
  </main></>;
}
