'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Activity,
  Zap,
  Rocket,
  Shield,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Server
} from 'lucide-react';

interface SimulatedShard {
  id: string;
  name: string;
  provider: 'openai' | 'grok';
  remainingTokens: number;
  maxTokens: number;
  circuitState: 'healthy' | 'cooldown' | 'exhausted' | 'dead';
  cooldownRemainingSec: number;
  requestsServed: number;
}

export default function VaultSimulatorPage() {
  const [shards, setShards] = useState<SimulatedShard[]>([
    {
      id: 'shard_openai_alpha',
      name: 'OpenAI Codex Shard (Alpha)',
      provider: 'openai',
      remainingTokens: 380000,
      maxTokens: 400000,
      circuitState: 'healthy',
      cooldownRemainingSec: 0,
      requestsServed: 142
    },
    {
      id: 'shard_grok_beta',
      name: 'xAI Grok Shard (Beta)',
      provider: 'grok',
      remainingTokens: 400000,
      maxTokens: 400000,
      circuitState: 'healthy',
      cooldownRemainingSec: 0,
      requestsServed: 98
    }
  ]);

  const [simLog, setSimLog] = useState<string[]>([
    'System initialized. Both shards healthy and participating in least-utilized load balancing.'
  ]);

  // Continuous microsecond refill interval
  useEffect(() => {
    const timer = setInterval(() => {
      setShards(prev => prev.map(s => {
        let nextTokens = s.remainingTokens;
        let nextState = s.circuitState;
        let nextCooldown = s.cooldownRemainingSec;

        // Continuous refill (approx 5,000 tokens/sec)
        if (s.remainingTokens < s.maxTokens) {
          nextTokens = Math.min(s.maxTokens, s.remainingTokens + 2500);
        }

        // Cooldown timer
        if (s.cooldownRemainingSec > 0) {
          nextCooldown = s.cooldownRemainingSec - 1;
          if (nextCooldown === 0 && s.circuitState === 'cooldown') {
            nextState = 'healthy';
          }
        }

        return {
          ...s,
          remainingTokens: nextTokens,
          circuitState: nextState,
          cooldownRemainingSec: nextCooldown
        };
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const addLog = (msg: string) => {
    setSimLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 15)]);
  };

  const handleSimulateBurst = () => {
    setShards(prev => {
      const updated = [...prev];
      const target = updated.find(s => s.circuitState === 'healthy') || updated[0];
      target.remainingTokens = Math.max(0, target.remainingTokens - 65000);
      target.requestsServed += 15;
      return updated;
    });
    addLog('⚡ Simulated 15 concurrent agent requests. Tokens drained. Rate governor refilling continuously.');
  };

  const handleSimulate429 = () => {
    setShards(prev => {
      const updated = [...prev];
      const target = updated[0];
      target.circuitState = 'cooldown';
      target.cooldownRemainingSec = 15;
      return updated;
    });
    addLog('⚠️ HTTP 429 Rate Limit received on Shard Alpha! Circuit breaker engaged: COOLDOWN for 15s. Traffic failed over to Shard Beta.');
  };

  const handleSimulateCanaryRecovery = () => {
    setShards(prev => prev.map(s => ({
      ...s,
      circuitState: 'healthy',
      cooldownRemainingSec: 0,
      remainingTokens: s.maxTokens
    })));
    addLog('✅ Half-Open Canary probe passed! All shards recovered to HEALTHY state.');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'BYOQ Vault', href: '/vault' },
            { label: 'Traffic & Circuit Simulator' }
          ]}
        />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-3 relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
            <Activity className="w-3.5 h-3.5" />
            <span>REAL-TIME RATE GOVERNOR & FAILOVER SIMULATOR</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Live Traffic & Circuit Breaker Simulator</h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Test how GALXAI's continuous token-bucket calculus replenishes quota in real-time, how 429 rate limit backoffs isolate failing credentials, and how transparent failover maintains 100% uptime.
          </p>
        </div>

        {/* Action Simulation Triggers */}
        <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSimulateBurst}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Simulate Traffic Burst (15 Requests)</span>
          </button>

          <button
            onClick={handleSimulate429}
            className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Simulate Upstream HTTP 429</span>
          </button>

          <button
            onClick={handleSimulateCanaryRecovery}
            className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset & Probe Canary</span>
          </button>
        </div>

        {/* Live Shard Simulation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {shards.map((shard) => {
            const isGrok = shard.provider === 'grok';
            const percent = Math.round((shard.remainingTokens / shard.maxTokens) * 100);

            return (
              <div
                key={shard.id}
                className={`glass-panel rounded-3xl p-6 space-y-4 border ${
                  shard.circuitState === 'cooldown'
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isGrok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {isGrok ? <Rocket className="w-4 h-4" /> : <Zap className="w-4 h-4 fill-amber-400" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-xs">{shard.name}</h3>
                      <span className="text-[10px] text-zinc-500 font-mono">{shard.id}</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                    shard.circuitState === 'healthy'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                  }`}>
                    {shard.circuitState} {shard.cooldownRemainingSec > 0 && `(${shard.cooldownRemainingSec}s)`}
                  </span>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Continuous Capacity ({percent}%)</span>
                    <span>{shard.remainingTokens.toLocaleString()} tok</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        shard.circuitState === 'cooldown'
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] font-mono text-zinc-400 flex justify-between pt-1 border-t border-white/5">
                  <span>Served: {shard.requestsServed} req</span>
                  <span>Refill: 5k tok/sec</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Simulation Stream Output */}
        <div className="glass-panel rounded-3xl p-6 space-y-3">
          <h2 className="text-xs font-bold uppercase text-zinc-400 font-mono">Live Circuit & Rate Log</h2>
          <div className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-zinc-300 space-y-1.5 max-h-48 overflow-y-auto border border-white/5">
            {simLog.map((log, idx) => (
              <div key={idx} className="leading-relaxed">{log}</div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
