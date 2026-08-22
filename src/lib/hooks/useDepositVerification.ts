'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_VERIFIED = 'galx_deposit_verified';
const STORAGE_KEY_BALANCE = 'galx_wallet_balance';
const WALLET_EVENT_NAME = 'galx_wallet_update';
const DEFAULT_INITIAL_BALANCE = 0; // Default $0 for unverified accounts

export function useDepositVerification() {
  const [hasVerifiedDeposit, setHasVerifiedDeposit] = useState<boolean>(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const readStateFromStorage = useCallback(() => {
    try {
      const storedVerified = localStorage.getItem(STORAGE_KEY_VERIFIED);
      const storedBalance = localStorage.getItem(STORAGE_KEY_BALANCE);

      if (storedVerified === 'true') {
        setHasVerifiedDeposit(true);
        setWalletBalance(storedBalance ? parseFloat(storedBalance) : 114.59);
      } else if (storedVerified === 'false') {
        setHasVerifiedDeposit(false);
        setWalletBalance(storedBalance ? parseFloat(storedBalance) : DEFAULT_INITIAL_BALANCE);
      } else {
        // First-time visit: check if user already has active keys in backend
        fetch('/api/keys')
          .then((res) => res.json())
          .then((data) => {
            if (data.keys && data.keys.length > 0) {
              setHasVerifiedDeposit(true);
              setWalletBalance(storedBalance ? parseFloat(storedBalance) : 114.59);
              localStorage.setItem(STORAGE_KEY_VERIFIED, 'true');
            } else {
              setHasVerifiedDeposit(false);
              setWalletBalance(storedBalance ? parseFloat(storedBalance) : DEFAULT_INITIAL_BALANCE);
            }
            setIsLoaded(true);
          })
          .catch(() => {
            setHasVerifiedDeposit(false);
            setWalletBalance(0);
            setIsLoaded(true);
          });
        return;
      }
    } catch {
      setHasVerifiedDeposit(false);
      setWalletBalance(0);
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
      localStorage.setItem(STORAGE_KEY_VERIFIED, 'true');
      localStorage.setItem(STORAGE_KEY_BALANCE, newBalance.toFixed(2));
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
      localStorage.removeItem(STORAGE_KEY_VERIFIED);
      localStorage.removeItem(STORAGE_KEY_BALANCE);
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
