'use client';

import { useState, useEffect, useCallback } from 'react';
import { resilientFetch } from '@/lib/resilience/ResilientClient';
import { SafeStorage } from '@/lib/resilience/SafeStorage';

const STORAGE_KEY_VERIFIED = 'galx_deposit_verified';
const STORAGE_KEY_BALANCE = 'galx_wallet_balance';
const WALLET_EVENT_NAME = 'galx_wallet_update';
const DEFAULT_INITIAL_BALANCE = 30.00; // Modal-style $30.00/mo Free Compute Grant for every developer

export function useDepositVerification() {
  const [hasVerifiedDeposit, setHasVerifiedDeposit] = useState<boolean>(() => {
    try {
      return SafeStorage.getItem(STORAGE_KEY_VERIFIED) === 'true';
    } catch {
      return false;
    }
  });
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    try {
      const stored = SafeStorage.getItem(STORAGE_KEY_BALANCE);
      return stored ? parseFloat(stored) : (SafeStorage.getItem(STORAGE_KEY_VERIFIED) === 'true' ? 114.59 : DEFAULT_INITIAL_BALANCE);
    } catch {
      return DEFAULT_INITIAL_BALANCE;
    }
  });
  const [isLoaded, setIsLoaded] = useState<boolean>(() => {
    try {
      return SafeStorage.getItem(STORAGE_KEY_VERIFIED) !== null;
    } catch {
      return false;
    }
  });

  const readStateFromStorage = useCallback(() => {
    try {
      const storedVerified = SafeStorage.getItem(STORAGE_KEY_VERIFIED);
      const storedBalance = SafeStorage.getItem(STORAGE_KEY_BALANCE);

      if (storedVerified === 'true') {
        setHasVerifiedDeposit(true);
        setWalletBalance(storedBalance ? parseFloat(storedBalance) : 114.59);
      } else if (storedVerified === 'false') {
        setHasVerifiedDeposit(false);
        setWalletBalance(storedBalance ? parseFloat(storedBalance) : DEFAULT_INITIAL_BALANCE);
      } else {
        // First-time visit: grant $30 free compute immediately
        resilientFetch<{ keys: any[] }>('/api/keys', { enableCacheFallback: true })
          .then(({ data }) => {
            if (data?.keys && data.keys.length > 0) {
              const hasPaidKey = data.keys.some((k: any) => k.computePool === 'priority_dedicated');
              setHasVerifiedDeposit(hasPaidKey);
              setWalletBalance(storedBalance ? parseFloat(storedBalance) : (hasPaidKey ? 114.59 : DEFAULT_INITIAL_BALANCE));
            } else {
              setHasVerifiedDeposit(false);
              setWalletBalance(storedBalance ? parseFloat(storedBalance) : DEFAULT_INITIAL_BALANCE);
            }
            setIsLoaded(true);
          })
          .catch(() => {
            setHasVerifiedDeposit(false);
            setWalletBalance(DEFAULT_INITIAL_BALANCE);
            setIsLoaded(true);
          });
        return;
      }
    } catch {
      setHasVerifiedDeposit(false);
      setWalletBalance(DEFAULT_INITIAL_BALANCE);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    readStateFromStorage();

    const handleCustomEvent = () => {
      readStateFromStorage();
    };

    window.addEventListener(WALLET_EVENT_NAME, handleCustomEvent);
    window.addEventListener('storage', handleCustomEvent);

    return () => {
      window.removeEventListener(WALLET_EVENT_NAME, handleCustomEvent);
      window.removeEventListener('storage', handleCustomEvent);
    };
  }, [readStateFromStorage]);

  const depositAndUnlock = (depositAmt: number): { totalCredited: number; bonus: number } => {
    const welcomeBonus = 5.0; // The $5 free compute grant
    const bonusPct = depositAmt >= 100 ? 0.1 : depositAmt >= 50 ? 0.05 : 0;
    const tierBonus = depositAmt * bonusPct;
    const totalBonus = welcomeBonus + tierBonus;
    const totalCredited = depositAmt + totalBonus;
    const newBalance = (walletBalance || 0) + totalCredited;

    setWalletBalance(newBalance);
    setHasVerifiedDeposit(true);

    try {
      SafeStorage.setItem(STORAGE_KEY_VERIFIED, 'true');
      SafeStorage.setItem(STORAGE_KEY_BALANCE, newBalance.toFixed(2));
      window.dispatchEvent(new CustomEvent(WALLET_EVENT_NAME, { detail: { newBalance, hasVerifiedDeposit: true } }));
    } catch {
      // Ignore storage error
    }

    return { totalCredited, bonus: totalBonus };
  };

  const resetDepositState = () => {
    setHasVerifiedDeposit(false);
    setWalletBalance(0);
    try {
      SafeStorage.removeItem(STORAGE_KEY_VERIFIED);
      SafeStorage.removeItem(STORAGE_KEY_BALANCE);
      window.dispatchEvent(new CustomEvent(WALLET_EVENT_NAME, { detail: { newBalance: 0, hasVerifiedDeposit: false } }));
    } catch {}
  };

  return {
    hasVerifiedDeposit,
    walletBalance,
    isLoaded,
    depositAndUnlock,
    resetDepositState
  };
}
