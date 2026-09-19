import { BILLING_PATHS } from '@/lib/billing/navigation';
import React from 'react';
import { IntentLink as Link } from '@/components/common/IntentLink';
import { Navigation } from '@/components/dashboard/Navigation';
import {
  Compass,
  ImageIcon,
  CreditCard,
  Home
} from 'lucide-react';
import { NotFoundSearchHelper } from '@/components/common/NotFoundSearchHelper';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[#07080d] text-white selection:bg-cyan-500 selection:text-black">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="w-full glass-panel rounded-3xl p-8 sm:p-12 border border-white/10 bg-gradient-to-b from-white/[0.03] via-black/70 to-black/90 shadow-2xl text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

          {/* 404 Visual Icon */}
          <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 shadow-xl shadow-cyan-500/15">
            <Compass className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-cyan-300 text-xs font-mono font-bold">
              <span>404</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Page Not Found
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
              That page isn’t available. Check the address, or choose a destination below.
            </p>
          </div>

          {/* Interactive Smart Search Recovery */}
          <NotFoundSearchHelper />

          {/* Quick Destination Links */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-2xl mx-auto font-mono text-xs pt-2">
            <Link
              href="/"
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white flex flex-col items-center justify-center gap-1.5 transition-all group"
            >
              <Home className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold">Home</span>
            </Link>

            <Link
              href="/#stream"
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white flex flex-col items-center justify-center gap-1.5 transition-all group"
            >
              <Compass className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold">Stream</span>
            </Link>

            <Link
              href="/images"
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white flex flex-col items-center justify-center gap-1.5 transition-all group"
            >
              <ImageIcon className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold">Images</span>
            </Link>

            <Link
              href={BILLING_PATHS.overview}
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white flex flex-col items-center justify-center gap-1.5 transition-all group"
            >
              <CreditCard className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold">Account</span>
            </Link>

          </div>
        </div>
      </main>
    </div>
  );
}
