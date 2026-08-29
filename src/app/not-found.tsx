import React from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import {
  Compass,
  ArrowRight,
  Terminal,
  Cpu,
  Key,
  CreditCard,
  FileText,
  Home,
  Users2
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
            <Compass className="w-10 h-10 animate-spin" style={{ animationDuration: '20s' }} />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-cyan-300 text-xs font-mono font-bold">
              <span>HTTP 404 • ROUTE UNRESOLVED</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Page Not Found
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
              The requested endpoint or path is not mapped in the GALXAI model gateway routing table.
            </p>
          </div>

          {/* Interactive Smart Search Recovery */}
          <NotFoundSearchHelper />

          {/* Terminal Hint */}
          <div className="p-4 rounded-2xl bg-[#040508] border border-white/5 font-mono text-xs text-zinc-400 max-w-md mx-auto text-left space-y-1 shadow-inner">
            <div className="flex items-center gap-2 text-zinc-500 border-b border-white/5 pb-2 text-[10px]">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>ROUTER DIAGNOSTIC LOG</span>
            </div>
            <div className="text-rose-400 text-[11px] pt-1">404 ERR_ROUTE_NOT_FOUND</div>
            <div className="text-[10px] text-zinc-500">status: 404 &bull; residency: global &bull; gateway: online</div>
          </div>

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
              href="/models"
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white flex flex-col items-center justify-center gap-1.5 transition-all group"
            >
              <Cpu className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold">Models</span>
            </Link>

            <Link
              href="/keys"
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white flex flex-col items-center justify-center gap-1.5 transition-all group"
            >
              <Key className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold">API Keys</span>
            </Link>

            <Link
              href="/teams/seats"
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white flex flex-col items-center justify-center gap-1.5 transition-all group"
            >
              <Users2 className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold">Seats</span>
            </Link>

            <Link
              href="/docs"
              className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white flex flex-col items-center justify-center gap-1.5 transition-all group"
            >
              <FileText className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold">Docs</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
