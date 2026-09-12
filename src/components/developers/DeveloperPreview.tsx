'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
type Status = 'loading' | 'not_requested' | 'pending' | 'approved' | 'revoked' | 'declined' | 'expired' | 'session_required' | 'error';

export function DeveloperPreview() {
  const { user, isLoading } = useAuth();
  const token = user?.token;
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [useCase, setUseCase] = useState('');
  const [traffic, setTraffic] = useState('exploring');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const submitting = useRef(false);
  const accountId = user?.id;
  useEffect(() => { setUseCase(''); setFeedback(''); setNotice(''); setExpiresAt(null); }, [accountId]);
  useEffect(() => {
    if (isLoading) return;
    if (!accountId) { setStatus('not_requested'); return; }
    const controller = new AbortController();
    setStatus('loading');
    fetch('/api/developer-access', { cache: 'no-store', signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async response => { if (response.status === 401) return { status: 'session_required' }; if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { if (controller.signal.aborted) return; setStatus(['not_requested', 'pending', 'approved', 'revoked', 'declined', 'expired', 'session_required'].includes(data.status) ? data.status : 'error'); setExpiresAt(data.expires_at || null); })
      .catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => controller.abort();
  }, [accountId, token, refresh, isLoading]);

  async function submit(event: FormEvent, kind: 'request' | 'feedback') {
    event.preventDefault(); if (submitting.current) return;
    submitting.current = true; setBusy(true); setNotice('');
    try {
      const response = await fetch(`/api/developer-access${kind === 'feedback' ? '/feedback' : ''}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(kind === 'feedback' ? { message: feedback } : { use_case: useCase, expected_traffic: traffic }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) setStatus('session_required');
        if (response.status === 403 && data.error?.code === 'developer_preview_required') setRefresh(n => n + 1);
        setNotice(data.error?.message || 'We couldn’t save that. Please try again.'); return;
      }
      if (kind === 'request') { setStatus(data.status); setExpiresAt(data.expires_at || null); }
      else { setFeedback(''); setNotice('Feedback received. Thank you for helping shape GALX.'); }
    } catch { setNotice('We couldn’t save that. Check your connection and try again.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  const field = 'w-full rounded-xl border border-white/20 bg-[#101420] p-3 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400';
  const button = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-400 disabled:opacity-60';
  return <section className="mt-10 border-t border-white/15 pt-8" aria-label="Developer access">
    {isLoading ? <p role="status">Checking your preview access…</p> : !user ? <>
      <h2 className="text-2xl font-semibold">Join the developer waitlist</h2>
      <p className="mt-3 max-w-prose text-zinc-300">Create an account and verify your email, then tell us what you want to build. We review requests individually and open access gradually. Signup does not grant API access.</p>
      <div className="mt-6 flex flex-wrap items-center gap-5"><Link className={button} href="/auth/signup?next=%2Fdevelopers">Sign up to request access</Link><Link className="underline underline-offset-4" href="/auth/signin?next=%2Fdevelopers">Already have an account? Sign in</Link></div>
    </> : status === 'loading' ? <p role="status">Checking your preview access…</p>
      : status === 'session_required' ? <><h2 className="text-2xl font-semibold">Sign in to check your access</h2><p className="mt-3 max-w-prose text-zinc-300">Use your verified account to request developer access or view your current status. Your saved request will be waiting for you.</p><Link className={`${button} mt-5`} href="/auth/signin?next=%2Fdevelopers">Sign in again</Link></>
      : status === 'error' ? <><p role="alert">We couldn’t check your access. Please try again.</p><button className={`${button} mt-4`} onClick={() => setRefresh(n => n + 1)}>Try again</button></>
      : status === 'not_requested' ? <form onSubmit={event => submit(event, 'request')} className="max-w-2xl space-y-6">
        <h2 className="text-2xl font-semibold">Tell us what you’re building</h2>
        <p className="text-zinc-300">Your request is linked to your verified account. We use these details to review access and follow up about the preview. There’s no guaranteed invitation date.</p>
        <div><label className="mb-2 block font-medium" htmlFor="preview-project">What would you use the API for?</label><textarea id="preview-project" className={field} rows={5} minLength={20} maxLength={2000} required value={useCase} onChange={event => setUseCase(event.target.value)} aria-describedby="project-hint" /><p id="project-hint" className="mt-2 text-sm text-zinc-400">20–2,000 characters. Please leave out passwords, API keys, and sensitive customer data.</p></div>
        <div><label className="mb-2 block font-medium" htmlFor="preview-traffic">Expected API requests</label><select id="preview-traffic" className={field} value={traffic} onChange={event => setTraffic(event.target.value)}><option value="exploring">I’m still exploring</option><option value="under_100_daily">Fewer than 100 per day</option><option value="under_1000_daily">100–1,000 per day</option><option value="over_1000_daily">More than 1,000 per day</option></select></div>
        <button className={button} disabled={busy}>{busy ? 'Submitting…' : 'Request developer access'}</button>
      </form>
      : status === 'approved' ? <>
        <h2 className="text-2xl font-semibold">Your preview access is approved</h2>{expiresAt && <p className="mt-3 text-zinc-300">Your access is available until {new Date(expiresAt).toLocaleString()}.</p>}
        <p className="mt-3 text-zinc-300">You can create an API key and explore the developer tools. This is an early preview; share what works and where you need help.</p>
        <div className="mt-5 flex flex-wrap gap-5"><Link className={button} href="/keys">Manage API keys</Link><Link className="self-center underline underline-offset-4" href="/docs">Read the API docs</Link><Link className="self-center underline underline-offset-4" href="/playground">Open playground</Link></div>
        <form className="mt-10 max-w-2xl space-y-4" onSubmit={event => submit(event, 'feedback')}><label htmlFor="preview-feedback" className="block text-xl font-semibold">Share private feedback</label><p id="feedback-hint" className="text-zinc-300">Feedback goes to the GALX team and is not published. Tell us what happened and what you expected. Leave out credentials and sensitive data.</p><textarea id="preview-feedback" aria-describedby="feedback-hint" className={field} rows={5} minLength={10} maxLength={4000} required value={feedback} onChange={event => setFeedback(event.target.value)} /><button className={button} disabled={busy}>{busy ? 'Sending…' : 'Send private feedback'}</button></form>
      </> : <>
        <h2 className="text-2xl font-semibold">{status === 'pending' ? 'You’re on the developer waitlist' : status === 'expired' ? 'Your preview access period has ended' : status === 'declined' ? 'Your request was reviewed' : 'Your developer access is paused'}</h2>
        <p className="mt-3 max-w-prose text-zinc-300">{status === 'pending' ? 'Your request is saved. We review requests individually as we make room for more participants. Check back here for your access status.' : status === 'declined' ? 'We’re unable to open developer access for your project at this stage. Your request remains on file for future review. Images and Sites are still available.' : 'Developer API calls are unavailable for your account. Images and Sites are still available. Your original access request is saved for review.'}</p>
        <button className={`${button} mt-5`} onClick={() => setRefresh(n => n + 1)}>Check access status</button>
      </>}
    <p role="status" aria-live="polite" className="mt-5 text-zinc-200">{notice}</p>
  </section>;
}
