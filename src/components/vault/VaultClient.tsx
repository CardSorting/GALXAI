'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { PoolMetricsOverview } from '@/components/dashboard/PoolMetricsOverview';
import { ShardVaultManager } from '@/components/dashboard/ShardVaultManager';
import { Plus, Activity } from 'lucide-react';
import type { GalxShardAccount, PoolStats, GalxRotationStrategy } from '@/core/contracts/GalxContracts';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { resilientFetch } from '@/lib/resilience/ResilientClient';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

function BaseVaultClient() {
  const [shards, setShards] = useState<GalxShardAccount[]>([]);
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchShards = React.useCallback(async () => {
    try {
      const res = await resilientFetch<{ shards: GalxShardAccount[] }>('/api/shards', {
        enableCacheFallback: true,
      });
      setShards(res.data?.shards || []);
    } catch {}
  }, []);

  const fetchStats = React.useCallback(async () => {
    try {
      const res = await resilientFetch<PoolStats>('/api/pool/stats', {
        enableCacheFallback: true,
      });
      setStats(res.data);
    } catch {}
  }, []);

  const refreshAll = React.useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchShards(), fetchStats()]);
    setIsLoading(false);
  }, [fetchShards, fetchStats]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchShards();
        fetchStats();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshAll, fetchShards, fetchStats]);

  const handleToggleMode = async (id: string, currentMode: 'pooled' | 'private') => {
    const nextMode = currentMode === 'private' ? 'pooled' : 'private';
    try {
      await resilientFetch(`/api/shards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shardMode: nextMode,
          priority: nextMode === 'private' ? 50 : 10,
        }),
      });
      refreshAll();
      showToast(`Account mode switched to ${nextMode.toUpperCase()}`);
    } catch {
      showToast('Failed to update mode');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'healthy' ? 'cooldown' : 'healthy';
    try {
      await resilientFetch(`/api/shards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      refreshAll();
      showToast(`Account status updated to ${nextStatus}`);
    } catch {
      showToast('Failed to update status');
    }
  };

  const handleRetract = async (id: string, userId: string) => {
    try {
      const res = await resilientFetch<{ success: boolean }>(`/api/shards/${id}/retract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.data?.success) {
        showToast('🛑 1-Click Retraction: Account disconnected and cache zeroized in < 40ms');
        refreshAll();
      }
    } catch {
      showToast('Failed to retract account');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await resilientFetch(`/api/shards/${id}`, { method: 'DELETE' });
      showToast('Account removed from pool');
      refreshAll();
    } catch {
      showToast('Failed to delete account');
    }
  };

  const handleStrategyChange = async (strategy: GalxRotationStrategy) => {
    try {
      const res = await resilientFetch<{ success: boolean }>('/api/pool/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy }),
      });
      if (res.data?.success) {
        fetchStats();
      }
    } catch {}
  };

  return (
    <div className="min-h-screen flex flex-col">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl glass-panel-glow border border-indigo-500/50 text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-pulse">
          <span>{toastMessage}</span>
        </div>
      )}

      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Breadcrumbs items={[{ label: 'Linked Accounts & Providers' }]} />

          <div className="flex items-center gap-2">
            <Link
              href="/vault/simulator"
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/5"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>Traffic Simulator</span>
            </Link>

            <Link
              href="/auth/connect"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-black text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Provider</span>
            </Link>
          </div>
        </div>

        <AuthRequiredGate
          title="Sign In to Manage Connected Providers & Shards"
          description="Your connected provider credentials, cooperative pooling shards, and token leases are private to your workspace."
          checkoutAmount={50}
        >
          {/* Live Pool Metrics Overview */}
          <PoolMetricsOverview
            stats={stats}
            onStrategyChange={handleStrategyChange}
            onRefresh={refreshAll}
            isLoading={isLoading}
          />

          {/* Accounts Table */}
          <ShardVaultManager
            shards={shards}
            onToggleMode={handleToggleMode}
            onToggleStatus={handleToggleStatus}
            onRetract={handleRetract}
            onDelete={handleDelete}
            onOpenAddModal={() => { window.location.href = '/auth/connect'; }}
          />
        </AuthRequiredGate>
      </main>
    </div>
  );
}

export const VaultClient = withErrorBoundary(BaseVaultClient, {
  name: 'Shard Vault Page',
});
