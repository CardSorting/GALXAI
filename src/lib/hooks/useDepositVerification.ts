'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/** The server is the authority for balances. Browser events only request a refresh. */
export function useDepositVerification() {
  const { user, isLoading } = useAuth();
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<{ userId: string; balance: number; verified: boolean } | null>(null);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    setSnapshot(null);
    if (!user?.id || isLoading) return;
    const controller = new AbortController();
    fetch('/api/wallet/summary', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal, headers: user.token ? { Authorization: `Bearer ${user.token}` } : {} })
      .then(async response => {
        if (!response.ok) throw new Error('Wallet unavailable');
        const result = await response.json();
        if (!controller.signal.aborted && typeof result.summary?.balanceUsd === 'number') setSnapshot({ userId: user.id, balance: result.summary.balanceUsd, verified: result.summary.proofOfDepositVerified === true });
      }).catch(() => {});
    return () => controller.abort();
  }, [user?.id, user?.token, isLoading, revision]);
  useEffect(() => {
    window.addEventListener('galx_wallet_update', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('galx_wallet_update', refresh); window.removeEventListener('focus', refresh); };
  }, [refresh]);
  const current = snapshot?.userId === user?.id ? snapshot : null;
  return { walletBalance: current?.balance ?? 0, hasVerifiedDeposit: current?.verified ?? false, isLoaded: Boolean(current), resetDepositState: refresh };
}
