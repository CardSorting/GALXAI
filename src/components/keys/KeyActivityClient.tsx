'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import type { KeyActivityResult } from '@/lib/keys/activity';
import { keyActivityCsv } from '@/lib/keys/activityCsv';

const control = 'rounded-md border border-white/15 bg-[#0d101c] px-3 py-2 text-sm text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 disabled:opacity-50';
const button = `${control} hover:bg-white/10 disabled:cursor-wait`;

export function KeyActivityClient() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p role="status" className="text-sm text-zinc-400">Loading account…</p>;
  return <AuthRequiredGate title="Sign in to view key activity" description="Your API usage is private to your account.">
    {user && <AccountActivity key={user.id} token={user.token} />}
  </AuthRequiredGate>;
}

function AccountActivity({ token }: { token?: string }) {
  const [data, setData] = useState<KeyActivityResult | null>(null);
  const [keys, setKeys] = useState<KeyActivityResult['keys']>([]);
  const [filters, setFilters] = useState({ days: '30', keyId: '', q: '' });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const version = useRef(0);

  const load = useCallback(async (cursor?: string) => {
    const current = ++version.current;
    setError('');
    if (cursor) setLoadingMore(true);
    else { setLoading(true); setData(null); setUpdatedAt(null); }
    try {
      const params = new URLSearchParams(filters);
      if (cursor) params.set('cursor', cursor);
      const response = await fetch(`/api/keys/activity?${params}`, {
        cache: 'no-store', credentials: 'same-origin', headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not load activity. Try again.');
      if (version.current !== current) return;
      setKeys(result.keys);
      setData(previous => ({ ...result, records: cursor ? [...(previous?.records || []), ...result.records] : result.records }));
      setUpdatedAt(new Date());
    } catch (e) {
      if (version.current === current) setError((e as Error).message);
    } finally {
      if (version.current === current) { setLoading(false); setLoadingMore(false); }
    }
  }, [filters, token]);
  useEffect(() => {
    void load();
    const requestVersion = version;
    return () => { requestVersion.current++; };
  }, [load]);

  function exportCsv() {
    if (!data?.records.length) return;
    const url = URL.createObjectURL(new Blob([keyActivityCsv(data.records)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `key-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const busy = loading || loadingMore;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-semibold text-white">Key activity</h1><p className="mt-1 text-sm text-zinc-400">API usage recorded in your account ledger.</p></div>
      <div className="flex flex-wrap gap-2">
        <button className={button} disabled={busy} onClick={() => void load()}>Refresh</button>
        <button className={button} disabled={busy || !data?.records.length} onClick={exportCsv}>Export loaded CSV</button>
      </div>
    </div>
    <form className="flex flex-wrap items-end gap-3" onSubmit={e => {
      e.preventDefault(); const form = new FormData(e.currentTarget);
      setFilters({ days: String(form.get('days')), keyId: String(form.get('keyId')), q: String(form.get('q')).trim() });
    }}>
      <label className="flex flex-col gap-1 text-xs text-zinc-400">Period<select className={control} name="days" defaultValue="30" disabled={busy}>
        <option value="1">24 hours</option><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option>
      </select></label>
      <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-400">API key<select className={`${control} max-w-64`} name="keyId" defaultValue="" disabled={busy}>
        <option value="">All keys</option>{keys.map(key => <option key={key.id} value={key.id}>{key.name}{key.revoked ? ' (revoked)' : ''}</option>)}
      </select></label>
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-zinc-400">Search<input className={control} name="q" maxLength={100} placeholder="Model, key name, or record ID" disabled={busy} /></label>
      <button className={button} disabled={busy}>Apply filters</button>
    </form>
    {error && <p role="alert" className="rounded-md border border-rose-400/30 p-3 text-sm text-rose-300">{error}</p>}
    {loading ? <p role="status" className="py-8 text-sm text-zinc-400">Loading activity…</p> : data && <>
      {data.records.length ? <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="text-zinc-400"><tr>{['Time', 'Key', 'Model', 'Tokens', 'Cost'].map(label => <th scope="col" className="p-3 font-medium" key={label}>{label}</th>)}</tr></thead>
          <tbody>{data.records.map(record => <tr key={record.id} className="border-t border-white/10">
            <td className="p-3 whitespace-nowrap text-xs text-zinc-300"><time dateTime={record.createdAt} title={record.createdAt}>{new Date(record.createdAt).toLocaleString()}</time></td>
            <td className="p-3"><div className="break-words">{record.keyName || (record.keyId ? 'Key unavailable' : 'Key not recorded')}</div>{record.keyId && <code className="text-xs text-zinc-400">{record.keyPrefix ? `${record.keyPrefix}…` : record.keyId}</code>}</td>
            <td className="p-3"><div>{record.model || 'Not recorded'}</div><details className="mt-1 text-xs text-zinc-400"><summary className="cursor-pointer">Record ID</summary><code className="break-all">{record.id}</code></details></td>
            <td className="p-3 tabular-nums"><details><summary className="cursor-pointer">{(record.promptTokens + record.completionTokens).toLocaleString()}</summary>
              <div className="mt-1 whitespace-nowrap text-xs text-zinc-400">Input: {record.promptTokens.toLocaleString()}<br />Cached input: {record.cachedTokens.toLocaleString()}<br />Output: {record.completionTokens.toLocaleString()}</div>
            </details></td>
            <td className="p-3 whitespace-nowrap tabular-nums">${record.costUsd.toFixed(6)}</td>
          </tr>)}</tbody>
        </table>
      </div> : <div className="rounded-lg border border-white/10 px-4 py-10 text-center">
        <p className="font-medium">No recorded usage</p><p className="mt-1 text-sm text-zinc-400">No usage matches this period and these filters.</p>
      </div>}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
        <p>{data.records.length} records loaded{updatedAt ? ` · Updated ${updatedAt.toLocaleTimeString()}` : ''}</p>
        {data.nextCursor && <button className={button} disabled={busy} onClick={() => void load(data.nextCursor!)}>{loadingMore ? 'Loading…' : 'Load more'}</button>}
      </div>
      <p className="text-xs text-zinc-400">Saved usage charges only. Unbilled and failed requests may not appear.</p>
    </>}
  </div>;
}
