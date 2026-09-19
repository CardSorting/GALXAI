'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clearCreditCheckoutAttempt } from '@/lib/billing/checkout-attempt';

/** Redirect parameters only identify a checkout; only the account API confirms it. */
export function CheckoutStatus({ token, onConfirmed, accountId, onPending, returnSearch }: { token?: string; onConfirmed: () => void; accountId: string; onPending: (pending: boolean) => void; returnSearch?: string }) {
  const callback = useRef(onConfirmed);
  callback.current = onConfirmed;
  const pendingCallback = useRef(onPending);
  pendingCallback.current = onPending;
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => {
    const current = new URLSearchParams(window.location.search);
    const params = current.has('session_id') || current.has('checkout') ? current : new URLSearchParams(returnSearch || window.location.search);
    const session = params.get('session_id');
    if (!session) {
      pendingCallback.current(false);
      setMessage(params.get('checkout') === 'canceled' ? 'Checkout closed. No new payment is started here.' : params.get('checkout') === 'returned' ? 'Check your balance and transactions for payment confirmation.' : '');
      return;
    }
    pendingCallback.current(true);
    let stopped = false; let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const started = Date.now();
    setRetry(false); setMessage('Confirming your payment…');
    async function check() {
      try {
        const response = await fetch(`/api/stripe/session?session_id=${encodeURIComponent(session!)}`, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal, headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const result = await response.json();
        if (stopped) return;
        if (!response.ok) { setMessage(result.error || 'Could not check this payment.'); setRetry(true); if ([400,404].includes(response.status)) pendingCallback.current(false); return; }
        if (result.session.verified) {
          pendingCallback.current(false);
          try { clearCreditCheckoutAttempt(sessionStorage, accountId, result.session.amountTotalUsd); } catch { /* Optional retry storage. */ }
          setMessage(`Payment confirmed. $${Number(result.session.creditUsd).toFixed(2)} credit added.`);
          callback.current(); window.dispatchEvent(new Event('galx_wallet_update'));
          // Keep the receipt identifier in the URL for refreshes and support.
          return;
        }
        if (['expired','canceled'].includes(result.session.status)) { pendingCallback.current(false); setMessage('This historical checkout did not complete. Review the current GALX Pro plan if you still need a product subscription.'); return; }
        if (Date.now() - started < 30000) timer = setTimeout(check, 2000);
        else { setMessage('Payment is still pending confirmation. Check again before making another payment.'); setRetry(true); }
      } catch { if (!stopped) { setMessage('Could not check payment status. Check again before paying again.'); setRetry(true); } }
    }
    void check();
    const timeout = setTimeout(() => { if (!stopped) { controller.abort(); } }, 35000);
    return () => { stopped = true; controller.abort(); clearTimeout(timer); clearTimeout(timeout); };
  }, [token, revision, accountId, returnSearch]);
  if (!message) return null;
  return <div className="space-y-2 border-y border-white/10 py-4 text-sm leading-6 text-zinc-300"><p role="status" aria-live="polite">{message}</p>{retry && <button type="button" onClick={refresh} className="min-h-11 text-indigo-300 underline underline-offset-4 focus-visible:outline-indigo-300">Check payment status</button>}</div>;
}
