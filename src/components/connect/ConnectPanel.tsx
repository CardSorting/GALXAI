'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AuthEntryShell } from '@/components/auth/AuthEntryShell';
import { useAuth } from '@/contexts/AuthContext';
import { authEntryPath } from '@/lib/auth/redirects';
import styles from '@/components/auth/auth-entry.module.css';
import local from './connect.module.css';

type Connection = { id: string; application: string; permission: string; connected_at: string };
type View = { application?: string; inference_access: boolean; connections?: Connection[] };

/** Extends the existing account entry surface; all authority stays in the API. */
export function ConnectPanel({ requestId }: { requestId?: string }) {
  const { user } = useAuth();
  // Account changes synchronously unmount the old owner's consent and connection list.
  return <ConnectPanelBody key={user?.id || 'signed-out'} requestId={requestId} />;
}
function ConnectPanelBody({ requestId }: { requestId?: string }) {
  const { user } = useAuth();
  const consent = requestId !== undefined;
  const [data, setData] = useState<View | null>(null), [error, setError] = useState('');
  const [signedOut, setSignedOut] = useState(false), [busy, setBusy] = useState<string | null>(null), [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const fence = useRef(0);
  const destination = consent ? `/connect/consent?request=${encodeURIComponent(requestId)}` : '/connect';
  useEffect(() => {
    const controller = new AbortController(), version = ++fence.current;
    setData(null); setError(''); setNotice(''); setSignedOut(false); setBusy(null);
    void (async () => {
      try {
        const response = await fetch(consent ? `/api/connect/consent?request=${encodeURIComponent(requestId)}` : '/api/connect/connections', { cache: 'no-store', signal: controller.signal });
        if (response.status === 401) { if (version === fence.current) setSignedOut(true); return; }
        if (!response.ok) throw new Error(response.status === 400 ? 'This connection request has expired or is invalid. Start again in your application.' : 'We couldn’t load your connections. Try again shortly.');
        const next = await response.json();
        if (typeof next.inference_access !== 'boolean' || (consent ? typeof next.application !== 'string' : !Array.isArray(next.connections))) throw new Error('We couldn’t load your connections. Try again shortly.');
        if (version === fence.current) setData(next);
      } catch (e) { if (!controller.signal.aborted && version === fence.current) setError(e instanceof Error ? e.message : 'Try again shortly.'); }
    })();
    return () => { controller.abort(); ++fence.current; };
  }, [consent, requestId, user?.id, revision]);

  async function act(action: string, connection?: string) {
    if (busy) return;
    const version = fence.current;
    setBusy(connection || action); setError(''); setNotice('');
    try {
      const response = await fetch(consent ? '/api/connect/consent' : '/api/connect/connections', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(consent ? { request: requestId!, decision: action } : { connection: connection! }) });
      if (version !== fence.current) return;
      if (response.status === 401) { setData(null); setSignedOut(true); return; }
      if (!response.ok) throw new Error();
      if (consent) {
        const result = await response.json();
        if (typeof result.redirect_uri !== 'string') throw new Error();
        window.location.assign(result.redirect_uri);
      } else {
        setData(current => current ? { ...current, connections: current.connections?.filter(c => c.id !== connection) } : current);
        setNotice('Application disconnected. New tasks are blocked. Work already started may still finish.');
      }
    } catch { if (version === fence.current) setError(consent ? 'We couldn’t confirm your decision. Start again in your application.' : 'We couldn’t confirm the disconnection. Try again.'); }
    finally { if (version === fence.current) setBusy(null); }
  }
  return <AuthEntryShell><section className={local.content} aria-busy={Boolean(busy)}>
    <div className={styles.intro}>
      <h1>{consent && data?.application ? <>Connect <span className={local.name}>{data.application}</span> to GALX</> : consent ? 'Connect with GALX' : 'Connected applications'}</h1>
      <p>{consent ? 'Use your GALX inference access in the tools you choose.' : 'Choose which applications can use your GALX inference access.'}</p>
    </div>
    {signedOut ? <div className={styles.actions}><p>Sign in with your existing GALX account to continue.</p><Link className={`${styles.button} ${styles.primary}`} href={authEntryPath(destination)}>Sign in to GALX</Link></div> : null}
    {error ? <div role="alert" className={styles.error}>{error}</div> : null}
    {error && !busy && !data ? <button className={styles.button} onClick={() => setRevision(v => v + 1)}>Try again</button> : null}
    {!data && !error && !signedOut ? <p role="status" className={styles.status}>Checking your connection…</p> : null}
    {data && consent ? <>
      {user?.email ? <p className={local.secondary}>Signed in as <span className={local.name}>{user.email}</span>.</p> : null}
      <p>Allow <strong className={local.name}>{data.application}</strong> to submit content to Nova and receive inference results using your account’s access.</p>
      <p>This connection does not grant access to your GALX library, payment details, or publishing permissions.</p>
      <p className={local.secondary}>Content you submit through this application will be sent to Nova for processing. Read our <Link href="/privacy" className={styles.link} target="_blank" rel="noopener noreferrer">data-handling policy<span className="sr-only"> (opens in a new tab)</span></Link>.</p>
      {!data.inference_access ? <p className={styles.notice}>Your account does not currently have inference access. You can connect now; requests will become available when your account has access.</p> : null}
      <div className={styles.actions}>
        <button className={`${styles.button} ${styles.primary}`} disabled={Boolean(busy)} onClick={() => void act('allow')}>{busy === 'allow' ? 'Connecting…' : 'Allow access'}</button>
        <button className={styles.button} disabled={Boolean(busy)} onClick={() => void act('cancel')}>{busy === 'cancel' ? 'Returning…' : 'Cancel'}</button>
      </div>
      <p className={local.secondary}>You can disconnect this application at any time from <Link href="/connect" className={styles.link}>Connected applications</Link>.</p>
    </> : null}
    {data && !consent ? <>
      <p className={styles.notice}>{data.inference_access ? 'Your account has inference access.' : 'Your account does not currently have inference access. Existing connections stay saved.'}</p>
      {!data.connections?.length ? <div className={local.empty}><h2>No applications connected</h2><p>Choose “Connect with GALX” in a supported application to get started.</p></div> : <ul className={local.connections}>{data.connections.map(c => <li key={c.id}>
        <h2 className={local.name}>{c.application}</h2><p>{c.permission}</p>
        <p className={local.secondary}>Connected <time dateTime={c.connected_at}>{new Date(c.connected_at).toLocaleDateString()}</time></p>
        <button className={styles.button} disabled={Boolean(busy)} onClick={() => void act('disconnect', c.id)}>{busy === c.id ? 'Disconnecting…' : 'Disconnect application'}<span className="sr-only"> {c.application}</span></button>
      </li>)}</ul>}
      <p className={local.secondary}>Disconnecting blocks new tasks after it is confirmed. It does not stop work already started or end your pass. Stop a task in the application that started it.</p>
    </> : null}
    <p role="status" className={local.notice}>{notice}</p>
  </section></AuthEntryShell>;
}
