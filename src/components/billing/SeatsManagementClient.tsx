'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';

type Member = { id: string; user_id: string; name: string; email: string; role: string; status: string; monthly_spend_usd: string; monthly_spend_cap_usd: string };
type Invitation = { id: string; email: string; role: string; expires_at: string; team_name?: string };
type Organization = { id: string; name: string; tier: string; seat_capacity: number; role: string };
type Seats = { org: Organization | null; workspaces: Organization[]; members: Member[]; pending: Invitation[]; invitations: Invitation[] };
const control = 'rounded-md border border-white/15 bg-[#0d101c] px-3 py-2 text-sm text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 disabled:opacity-50';
const button = `${control} hover:bg-white/10 disabled:cursor-wait`;
const primary = `${button} bg-indigo-600 hover:bg-indigo-500`;
const roles = ['developer', 'viewer', 'billing', 'admin'];

export function SeatsManagementClient() {
  const { user, isLoading: authLoading } = useAuth();
  // Remount on account change so no previous user's team state is ever displayed.
  if (authLoading) return <p role="status" className="text-sm text-zinc-400">Loading account…</p>;
  return <AuthRequiredGate title="Sign in to manage your team" description="View your members and invitations.">
    {user && <AccountSeats key={user.id} userId={user.id} token={user.token} />}
  </AuthRequiredGate>;
}

function AccountSeats({ userId, token }: { userId: string; token?: string }) {
  const [data, setData] = useState<Seats | null>(null);
  const [orgId, setOrgId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const version = useRef(0);
  const request = useCallback(async (body?: Record<string, unknown>, selected = '') => {
    const response = await fetch(`/api/teams/seats${selected ? `?orgId=${encodeURIComponent(selected)}` : ''}`, {
      method: body ? 'POST' : 'GET', cache: 'no-store', credentials: 'same-origin',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Could not load your team. Try again.');
    return result;
  }, [token]);
  const load = useCallback(async () => {
    const current = ++version.current;
    setLoading(true);
    setError('');
    try {
      const result = await request(undefined, orgId);
      if (current === version.current) setData(result);
    } catch (e) {
      if (current === version.current) { setError((e as Error).message); setData(null); }
    } finally { if (current === version.current) setLoading(false); }
  }, [orgId, request]);
  useEffect(() => {
    void load();
    const requestVersion = version;
    return () => { requestVersion.current++; };
  }, [load]);

  async function mutate(body: Record<string, unknown>, message: string) {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await request({ orgId: data?.org?.id, ...body });
      setEditing(null); setRemoving(null); setInviting(false); setCreating(false);
      setNotice(message);
      if (result.orgId !== orgId) setOrgId(result.orgId);
      else await load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const org = data?.org;
  const canManage = !!org && ['owner', 'admin'].includes(org.role);
  const manageable = (member: Member) => canManage && member.role !== 'owner' && member.user_id !== userId && (org?.role === 'owner' || member.role !== 'admin');
  const active = data?.members.filter(m => m.status === 'active').length || 0;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold text-white">Team members</h1><p className="mt-1 text-sm text-zinc-400">Manage your team’s access and monthly limits.</p></div>
      <button className={button} disabled={busy || loading} onClick={() => void load()}>Refresh</button>
    </div>
    {error && <div role="alert" className="rounded-md border border-rose-400/30 p-3 text-sm text-rose-300">{error}</div>}
    {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
    {loading ? <p role="status" className="text-sm text-zinc-400">Loading team…</p> : data && <>
      {data.invitations.length > 0 && <section aria-label="Your invitations" className="space-y-3">
        <h2 className="text-base font-semibold">Invitations for you</h2>
        {data.invitations.map(invite => <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 p-4">
          <span>{invite.team_name} <span className="text-sm text-zinc-400">· {invite.role}</span></span>
          <button disabled={busy} className={primary} onClick={() => void mutate({ action: 'accept', inviteId: invite.id }, 'You joined the team.')}>Join team</button>
        </div>)}
      </section>}
      {data.workspaces.length > 1 && <label className="flex flex-wrap items-center gap-3 text-sm">Team
        <select className={control} value={org?.id || ''} disabled={busy} onChange={e => { setOrgId(e.target.value); setEditing(null); setRemoving(null); setInviting(false); }}>
          {data.workspaces.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
        </select>
      </label>}
      {!org ? <section className="rounded-lg border border-white/10 p-5 space-y-3">
        <h2 className="font-semibold">You don’t have a team yet</h2>
        <p className="text-sm text-zinc-400">Create a team, or accept an invitation above.</p>
        <button disabled={busy} className={primary} onClick={() => setCreating(true)}>Create team</button>
      </section> : <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold break-all">{org.name}</h2><p className="text-sm text-zinc-400">{active} active · {org.seat_capacity} seat limit{canManage ? ` · ${data.pending.length} pending` : ''}</p></div>
          {canManage && <button disabled={busy} className={primary} onClick={() => setInviting(!inviting)}>Invite member</button>}
        </div>
        {org.role === 'owner' && <details className="text-sm text-zinc-300">
          <summary className="cursor-pointer py-2">Seat limit</summary>
          <form className="mt-2 flex flex-wrap items-end gap-3" onSubmit={e => {
            e.preventDefault();
            void mutate({ action: 'capacity', capacity: Number(new FormData(e.currentTarget).get('capacity')) }, 'Seat limit updated.');
          }}>
            <label className="flex flex-col gap-1">Maximum members<input key={org.seat_capacity} className={`${control} w-32`} name="capacity" type="number" min="1" max="1000" defaultValue={org.seat_capacity} required /></label>
            <button disabled={busy} className={button}>Save limit</button>
          </form>
          <p className="mt-2 text-xs text-zinc-400">Includes pending invitations. This setting does not purchase a subscription.</p>
        </details>}
        {inviting && <form className="rounded-lg border border-white/10 p-4 space-y-3" onSubmit={e => {
          e.preventDefault(); const form = new FormData(e.currentTarget);
          void mutate({ action: 'invite', email: form.get('email'), role: form.get('role'), cap: Number(form.get('cap')) }, 'Invitation created. Ask them to sign in and open Team members.');
        }}>
          <div className="flex flex-wrap gap-3">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">Email<input className={control} name="email" type="email" maxLength={254} required autoComplete="email" /></label>
            <label className="flex flex-col gap-1 text-sm">Role<select className={control} name="role">{roles.filter(r => r !== 'admin' || org.role === 'owner').map(r => <option key={r}>{r}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-sm">Monthly cap ($)<input className={`${control} w-32`} name="cap" type="number" min="0" max="1000000" step="0.01" defaultValue="150" required /></label>
          </div>
          <p className="text-xs text-zinc-400">Valid for 7 days. They’ll see it at /teams/seats after signing in with this email. No email is sent.</p>
          <div className="flex gap-2"><button disabled={busy} className={primary}>{busy ? 'Saving…' : 'Create invitation'}</button><button type="button" disabled={busy} className={button} onClick={() => setInviting(false)}>Cancel</button></div>
        </form>}
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-left text-sm"><thead className="text-zinc-400"><tr>{['Member', 'Role', 'Spend / cap', 'Status', 'Actions'].map(label => <th key={label} scope="col" className="p-3 font-medium">{label}</th>)}</tr></thead>
            <tbody>{data.members.map(member => <tr key={member.id} className="border-t border-white/10">
              <td className="p-3"><div className="font-medium">{member.name}{member.user_id === userId ? ' (you)' : ''}</div><div className="text-xs text-zinc-400 break-all">{member.email}</div></td>
              <td className="p-3 capitalize">{member.role}</td><td className="p-3 whitespace-nowrap tabular-nums">${Number(member.monthly_spend_usd).toFixed(2)} / ${Number(member.monthly_spend_cap_usd).toFixed(2)}</td>
              <td className="p-3 capitalize text-zinc-400">{member.status}</td>
              <td className="p-3">{manageable(member) && member.status === 'active' && <div className="flex gap-2">
                <button disabled={busy} className={button} onClick={() => setEditing(member)}>Edit</button>
                <button disabled={busy} className={`${button} text-rose-300`} onClick={() => setRemoving(member)}>Remove</button>
              </div>}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {editing && <form key={editing.id} className="rounded-lg border border-white/10 p-4 space-y-3" onSubmit={e => {
          e.preventDefault(); const form = new FormData(e.currentTarget);
          void mutate({ action: 'update', memberId: editing.id, role: form.get('role'), cap: Number(form.get('cap')) }, 'Member updated.');
        }}>
          <h3 className="font-medium">Edit {editing.name}</h3>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">Role<select name="role" className={control} defaultValue={editing.role}>{roles.filter(r => r !== 'admin' || org.role === 'owner').map(r => <option key={r}>{r}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-sm">Monthly cap ($)<input className={`${control} w-32`} name="cap" type="number" min="0" max="1000000" step="0.01" defaultValue={Number(editing.monthly_spend_cap_usd)} required /></label>
          </div>
          <div className="flex gap-2"><button disabled={busy} className={primary}>Save</button><button disabled={busy} type="button" className={button} onClick={() => setEditing(null)}>Cancel</button></div>
        </form>}
        {removing && <div role="alert" className="rounded-lg border border-rose-400/30 p-4 space-y-3">
          <p>Remove <strong>{removing.name}</strong> from {org.name}?</p><p className="text-sm text-zinc-400">Their team membership will be suspended.</p>
          <div className="flex gap-2"><button disabled={busy} className={`${button} text-rose-300`} onClick={() => void mutate({ action: 'remove', memberId: removing.id }, 'Member removed.')}>Remove member</button><button disabled={busy} className={button} onClick={() => setRemoving(null)}>Cancel</button></div>
        </div>}
        {canManage && data.pending.length > 0 && <section className="space-y-3"><h2 className="font-semibold">Pending invitations</h2>
          {data.pending.map(invite => <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 py-3">
            <div><p className="break-all">{invite.email}</p><p className="text-xs text-zinc-400">{invite.role} · Expires {new Date(invite.expires_at).toLocaleDateString()}</p></div>
            <button disabled={busy} className={button} onClick={() => void mutate({ action: 'revokeInvite', inviteId: invite.id }, 'Invitation revoked.')}>Revoke</button>
          </div>)}
        </section>}
      </>}
      {creating && <form className="space-y-3" onSubmit={e => { e.preventDefault(); void mutate({ action: 'create', name: new FormData(e.currentTarget).get('name') }, 'Team created.'); }}>
        <label className="flex max-w-md flex-col gap-1 text-sm">Team name<input name="name" className={control} maxLength={100} required autoFocus /></label>
        <div className="flex gap-2"><button disabled={busy} className={primary}>Create team</button><button disabled={busy} type="button" className={button} onClick={() => setCreating(false)}>Cancel</button></div>
      </form>}
    </>}
  </div>;
}
