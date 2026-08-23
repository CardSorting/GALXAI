import React from 'react';
import { Activity } from 'lucide-react';

export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07080d] text-white p-4 font-mono">
      <div className="text-center space-y-4 max-w-xs w-full">
        <div className="relative mx-auto w-12 h-12">
          <div className="absolute inset-0 rounded-2xl bg-cyan-500/20 blur-xl animate-pulse" />
          <div className="relative w-12 h-12 rounded-2xl bg-black/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Activity className="w-6 h-6 animate-spin" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-bold text-white uppercase tracking-wider">
            GALXAI Routing Gateway
          </div>
          <div className="text-[11px] text-zinc-500">
            Resolving tenant session &bull; &lt; 1ms
          </div>
        </div>
      </div>
    </div>
  );
}
