'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

export interface WalletTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amount: number, totalCredited: number) => void;
  initialAmount?: number;
}

/** The browser cannot grant credit. Payment and confirmation use the shared page. */
export function WalletTopUpModal({ isOpen, onClose }: WalletTopUpModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (isOpen) dialog.current?.showModal(); else dialog.current?.close(); }, [isOpen]);
  return <dialog ref={dialog} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="top-up-title" className="w-[calc(100%-2rem)] max-w-md rounded-xl border border-white/15 bg-[#0d0f15] p-6 text-zinc-100 backdrop:bg-black/70">
    <h2 id="top-up-title" className="text-xl font-semibold">Add compute credit</h2>
    <p className="mt-3 text-sm leading-6 text-zinc-400">Choose an amount and pay with Stripe. Your balance updates after payment confirmation.</p>
    <div className="mt-6 flex flex-wrap gap-3"><Link href="/keys/top-up" onClick={onClose} className="rounded-md border border-indigo-400/40 bg-indigo-500/20 px-4 py-2 text-sm text-indigo-100">Top up</Link><button type="button" onClick={onClose} className="rounded-md border border-white/15 px-4 py-2 text-sm text-zinc-300">Cancel</button></div>
  </dialog>;
}
