'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Clock3, Inbox, MessageSquare, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { AccessRequest, AdminActor, AdminRole, AuditItem, FeedbackItem, Page, RequestDetail, RequestState, StaffMember } from '@/lib/admin/preview-contract';
import { ROLE_DESCRIPTION } from '@/lib/admin/preview-contract';
import styles from './preview-admin.module.css';

type View = 'requests' | 'feedback' | 'activity' | 'staff';
type ListItem = AccessRequest | FeedbackItem | AuditItem | StaffMember;
const labels: Record<string, string> = { pending: 'Waiting', approved: 'Approved', revoked: 'Paused', declined: 'Declined', expired: 'Expired', all: 'All requests' };
const traffic: Record<string, string> = { exploring: 'Exploring', under_100_daily: 'Under 100 requests / day', under_1000_daily: '100–1,000 requests / day', over_1000_daily: 'Over 1,000 requests / day' };
const date = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const time = (value: string) => new Date(value).toLocaleString();
const title: Record<View, string> = { requests: 'Access requests', feedback: 'Private feedback', activity: 'Activity', staff: 'Staff access' };
const description: Record<View, string> = { requests: 'Review each project. Open access at a pace you can support.', feedback: 'Keep early feedback close. Resolve a report when it has been reviewed.', activity: 'A history of access decisions, feedback reviews and staff changes.', staff: 'Choose who can review requests and who can manage your team.' };
const eventLabel: Record<string, string> = { bootstrap: 'First owner added', staff_added: 'Staff access added', staff_changed: 'Staff role changed', staff_removed: 'Staff access removed', staff_activated: 'Staff account activated', request_reviewed: 'Access decision', feedback_resolved: 'Feedback resolved', feedback_reopened: 'Feedback reopened' };

function Badge({ state }: { state: string }) { return <span className={styles.badge} data-state={state}>{labels[state] || state}</span>; }
function Activity({ items }: { items: AuditItem[] }) {
  return items.length ? <ol className={styles.timeline}>{items.map(item => <li key={item.id}>
    <div className={styles.line}><strong>{eventLabel[item.action] || 'Access update'}</strong><time dateTime={item.created_at} title={time(item.created_at)}>{date(item.created_at)}</time></div>
    <p>{item.actor_email}{item.previous_state ? ` · ${labels[item.previous_state] || item.previous_state} → ${item.next_state ? labels[item.next_state] || item.next_state : 'Removed'}` : item.next_state ? ` · ${labels[item.next_state] || item.next_state}` : ''}</p>
    {item.reason && !item.action.startsWith('feedback_') && <p className={styles.note}>{item.reason}</p>}
    {item.expires_at && <p>Access until {time(item.expires_at)}</p>}
  </li>)}</ol> : <p className={styles.muted}>No decisions yet. The first review will appear here.</p>;
}

export function PreviewAdminWorkspace({ initialActor }: { initialActor: AdminActor }) {
  const { user, isLoading: authLoading } = useAuth();
  const [actor, setActor] = useState(initialActor), [view, setView] = useState<View>('requests');
  const [filter, setFilter] = useState('pending'), [search, setSearch] = useState(''), [query, setQuery] = useState('');
  const [page, setPage] = useState(1), [refresh, setRefresh] = useState(0);
  const [list, setList] = useState<Page<ListItem> | null>(null), [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<RequestDetail | null>(null), [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(''), [detailError, setDetailError] = useState(''), [notice, setNotice] = useState('');
  const [locked, setLocked] = useState(false), [busy, setBusy] = useState(false);
  const mutationLock = useRef(false);
  // Keep decision notes in memory across inbox navigation and record refreshes.
  // Staff-only drafts must never be written to shared browser storage.
  const decisionDrafts = useRef(new Map<string, string>());
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const [outcome, setOutcome] = useState<RequestState>('approved'), [days, setDays] = useState('30'), [reason, setReason] = useState('');
  const [staffEdit, setStaffEdit] = useState<StaffMember | 'new' | null>(null), [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<AdminRole | 'remove'>('reviewer'), [staffReason, setStaffReason] = useState('');
  const token = user?.token;
  useEffect(() => {
    if (!authLoading && user?.id !== initialActor.id) {
      decisionDrafts.current.clear(); setReason(''); setStaffReason(''); setStaffEdit(null);
      setLocked(true); setList(null); setDetail(null);
    }
  }, [authLoading, user?.id, initialActor.id]);
  const api = useCallback(async (params: string, body?: unknown, signal?: AbortSignal) => {
    const response = await fetch('/api/admin/preview' + params, { method: body ? 'POST' : 'GET', cache: 'no-store', signal,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 || (response.status === 403 && data.error?.code === 'forbidden')) {
        decisionDrafts.current.clear(); setReason(''); setStaffReason(''); setStaffEdit(null);
        setLocked(true); setList(null); setDetail(null);
      }
      throw new Error(data.error?.message || 'We couldn’t load this workspace. Try again.');
    }
    return data;
  }, [token]);
  useEffect(() => {
    const controller = new AbortController(); setList(null); setError('');
    const params = new URLSearchParams({ view, status: filter, q: query, page: String(page) });
    Promise.all([api('?view=session', undefined, controller.signal), api('?' + params, undefined, controller.signal)])
      .then(([session, data]) => { if (!controller.signal.aborted) { setActor(session.actor); setList(data); } })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [view, filter, query, page, refresh, api]);
  useEffect(() => {
    if (!selected || view !== 'requests') { setDetail(null); return; }
    const controller = new AbortController(); setDetailLoading(true); setDetailError(''); setDetail(null);
    api('?view=request&id=' + encodeURIComponent(selected), undefined, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      setDetail(data); setOutcome(data.request.status === 'approved' ? 'revoked' : 'approved'); setDays('30');
      setReason(decisionDrafts.current.get(selected) || '');
    }).catch(e => { if (!controller.signal.aborted) setDetailError(e.message); }).finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selected, view, refresh, api]);
  useEffect(() => { if (detail) detailHeading.current?.focus(); }, [detail]);
  function switchView(next: View) {
    setView(next); setFilter(next === 'feedback' ? 'open' : 'pending'); setPage(1); setQuery(''); setSearch(''); setSelected(null); setNotice(''); setError(''); setStaffEdit(null);
  }
  async function save(body: unknown, success: string, reviewedId?: string) {
    if (mutationLock.current) return false;
    mutationLock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await api('', body);
      if (reviewedId) { decisionDrafts.current.delete(reviewedId); setReason(''); }
      setNotice(success); setRefresh(v => v + 1); return true;
    }
    catch (e) { setError(e instanceof Error ? e.message : 'The change was not saved. Try again.'); return false; }
    finally { mutationLock.current = false; setBusy(false); }
  }
  function review(event: FormEvent) {
    event.preventDefault(); if (!detail) return;
    void save({ action: 'review', user_id: detail.request.user_id, revision: detail.request.revision, status: outcome,
      expires_in_days: outcome === 'approved' && days !== 'none' ? Number(days) : null, reason }, `Decision saved for ${detail.request.email}.`, detail.request.user_id);
  }
  function editStaff(member: StaffMember | 'new') {
    setStaffEdit(member); setStaffEmail(member === 'new' ? '' : member.email); setStaffRole(member === 'new' ? 'reviewer' : member.role); setStaffReason('');
  }
  async function saveStaff(event: FormEvent) {
    event.preventDefault(); if (!staffEdit) return;
    if (await save({ action: 'staff', email: staffEmail.trim(), revision: staffEdit === 'new' ? null : staffEdit.revision,
      role: staffRole === 'remove' ? null : staffRole, reason: staffReason }, 'Staff access updated.')) setStaffEdit(null);
  }
  async function shareLink() {
    try { await navigator.clipboard.writeText(location.origin + '/admin'); setNotice('Staff sign-in link copied. Share it with the person you added.'); }
    catch { setError('Copy the staff sign-in address from your browser: /admin.'); }
  }
  const canReview = actor.role !== 'viewer';
  const requestItems = view === 'requests' ? (list?.items as AccessRequest[] || []) : [];
  const selectedIndex = requestItems.findIndex(item => item.user_id === selected);
  const nextRequest = requestItems[selectedIndex + 1];
  const request = detail?.request;
  const actions = request?.status === 'approved' ? [['revoked', 'Pause access'], ['approved', 'Update access period']]
    : request?.status === 'pending' ? [['approved', 'Approve access'], ['declined', 'Decline request']]
      : [['approved', 'Approve access'], ['pending', 'Return to waitlist']];
  const actionLabel = actions.find(([value]) => value === outcome)?.[1] || 'Save decision';
  const feedbackCard = (item: FeedbackItem) => <article className={styles.feedback} key={item.id}>
    <div className={styles.line}><strong>{item.email}</strong><Badge state={item.resolved_at ? 'Resolved' : 'Open'} /></div>
    <p className={styles.message}>{item.message}</p>
    <div className={styles.line}><time dateTime={item.created_at} title={time(item.created_at)}>{date(item.created_at)}</time>
      {canReview && <button className={styles.secondary} disabled={busy} onClick={() => void save({ action: 'feedback', id: item.id, revision: item.revision, resolved: !item.resolved_at }, item.resolved_at ? 'Feedback reopened.' : 'Feedback marked as resolved.')}>{item.resolved_at ? 'Reopen' : 'Mark resolved'}</button>}</div>
  </article>;
  if (locked) return <main className={styles.locked}><ShieldCheck size={28} /><h1>Staff access required</h1><p>Your session or permissions changed. Sign in with an authorized staff account to continue.</p><Link href="/auth/signin?next=%2Fadmin">Sign in again</Link><Link href="/images">Go to Images</Link></main>;
  return <div className={styles.workspace}>
    <a href="#admin-content" className={styles.skip}>Skip to workspace</a>
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.brand}>GALX <span>Admin</span></Link>
      <nav aria-label="Administration">{([
        ['requests', Inbox, 'Requests'], ['feedback', MessageSquare, 'Feedback'], ['activity', Clock3, 'Activity'],
        ...(actor.role === 'owner' ? [['staff', Users, 'Staff access']] : []),
      ] as const).map(([key, Icon, label]) => <button key={key as string} onClick={() => switchView(key as View)} aria-current={view === key ? 'page' : undefined} disabled={busy}>
        <Icon size={18} aria-hidden="true" />{label as string}</button>)}</nav>
      <div className={styles.account}><span className={styles.role}>{actor.role}</span><span title={actor.email}>{actor.email}</span><Link href="/developers"><ArrowLeft size={15} aria-hidden="true" /> Participant view</Link></div>
    </aside>
    <main id="admin-content" className={styles.main}>
      <header className={styles.header}><div><h1>{title[view]}</h1><p>{description[view]}</p></div>
        <button className={styles.secondary} onClick={() => { setRefresh(v => v + 1); setNotice(''); }} disabled={busy}><RefreshCw size={16} aria-hidden="true" /> Refresh</button></header>
      <p className={styles.policy}><ShieldCheck size={16} aria-hidden="true" /> Images and Sites stay public. Developer access is reviewed individually.</p>
      {error && <div role="alert" className={styles.error}>{error} <button onClick={() => setRefresh(v => v + 1)} disabled={busy}>Reload current records</button></div>}
      <div role="status" aria-live="polite" className={notice ? styles.notice : styles.silent}>{notice && <><Check size={16} aria-hidden="true" />{notice}</>}</div>
      <div className={styles.toolbar}>
        {(view === 'requests' || view === 'feedback') && <label className={styles.filter}><span className={styles.srOnly}>Filter {view}</span><select value={filter} disabled={busy} onChange={e => { setFilter(e.target.value); setPage(1); setSelected(null); }}>{(view === 'requests' ? ['pending', 'approved', 'revoked', 'expired', 'declined', 'all'] : ['open', 'resolved', 'all']).map(value => <option key={value} value={value}>{view === 'requests' ? labels[value] : value === 'all' ? 'All feedback' : value === 'open' ? 'Open feedback' : 'Resolved feedback'}</option>)}</select></label>}
        {view === 'requests' && <form className={styles.search} onSubmit={e => { e.preventDefault(); setQuery(search.trim()); setPage(1); setSelected(null); }}><label htmlFor="request-search" className={styles.srOnly}>Search by email or account ID</label><input id="request-search" type="search" placeholder="Search by email or account ID" maxLength={320} value={search} onChange={e => setSearch(e.target.value)} /><button className={styles.secondary} disabled={busy}>Search</button></form>}
        {view === 'staff' && <><button className={styles.primary} onClick={() => editStaff('new')} disabled={busy}>Add staff member</button><button className={styles.secondary} onClick={() => void shareLink()}>Copy sign-in link</button></>}
        {actor.role === 'viewer' && <span className={styles.muted}>Read-only access</span>}
      </div>
      <div className={view === 'requests' ? styles.reviewGrid : styles.single} data-selected={Boolean(selected)}>
        <section aria-label={view === 'requests' ? 'Request inbox' : title[view]} className={styles.list}>
          {!list && !error && <div role="status" className={styles.empty}><div className={styles.skeleton} /><div className={styles.skeleton} /><p>Loading {title[view].toLowerCase()}…</p></div>}
          {list?.items.length === 0 && <div className={styles.empty}><Inbox size={28} aria-hidden="true" /><h2>{query ? 'No matching requests' : view === 'requests' && filter === 'pending' ? 'The waitlist is up to date' : view === 'feedback' && filter === 'open' ? 'No open feedback' : 'Nothing in this view yet'}</h2><p>{query ? 'Try another email or clear your search.' : view === 'requests' ? 'New requests appear here after someone signs up and submits their project.' : view === 'feedback' ? 'Feedback from approved participants will appear here.' : 'Updates will appear here as your team works.'}</p></div>}
          {view === 'requests' && (list?.items as AccessRequest[] | undefined)?.map(item => <button key={item.user_id} className={styles.requestRow} aria-pressed={selected === item.user_id} onClick={() => setSelected(item.user_id)} disabled={busy}>
            <div className={styles.line}><strong>{item.email}</strong><Badge state={item.access_state} /></div><p>{item.use_case}</p><div className={styles.line}><span>{traffic[item.expected_traffic]}</span><time dateTime={item.requested_at}>{date(item.requested_at)}</time></div></button>)}
          {view === 'feedback' && (list?.items as FeedbackItem[] | undefined)?.map(feedbackCard)}
          {view === 'activity' && list && <div className={styles.activityList}>{(list.items as AuditItem[]).map(item => <div key={item.id}><p className={styles.subject}>{item.subject_label}</p><Activity items={[item]} /></div>)}</div>}
          {view === 'staff' && <>
            {staffEdit && <form className={styles.staffForm} onSubmit={saveStaff}><h2>{staffEdit === 'new' ? 'Add a staff member' : 'Manage staff access'}</h2>
              <label>Email address<input type="email" required autoComplete="email" value={staffEmail} disabled={staffEdit !== 'new' || busy} maxLength={320} onChange={e => setStaffEmail(e.target.value)} /></label>
              <label>Role<select value={staffRole} disabled={busy} onChange={e => setStaffRole(e.target.value as AdminRole | 'remove')}><option value="viewer">Viewer</option><option value="reviewer">Reviewer</option><option value="owner">Owner</option>{staffEdit !== 'new' && <option value="remove">Remove access</option>}</select></label>
              <p className={styles.muted}>{staffRole === 'remove' ? 'This person will lose access to the admin workspace.' : ROLE_DESCRIPTION[staffRole]}</p>
              <label>Internal note<textarea required minLength={3} maxLength={1000} rows={2} value={staffReason} disabled={busy} onChange={e => setStaffReason(e.target.value)} /></label>
              <p className={styles.muted}>The member must sign in with this verified email. Share the sign-in link after saving. No email is sent automatically.</p>
              <div className={styles.actions}><button className={staffRole === 'remove' ? styles.danger : styles.primary} disabled={busy}>{busy ? 'Saving…' : staffRole === 'remove' ? 'Remove staff access' : 'Save staff access'}</button><button type="button" className={styles.secondary} disabled={busy} onClick={() => setStaffEdit(null)}>Cancel</button></div>
            </form>}
            {(list?.items as StaffMember[] | undefined)?.map(member => <article key={member.email} className={styles.staffRow}><div><strong>{member.email}</strong><p>{member.role} · {member.active ? 'Active' : 'Awaiting first sign-in'}</p><p>{ROLE_DESCRIPTION[member.role]}</p></div><button className={styles.secondary} disabled={busy} onClick={() => editStaff(member)} aria-label={'Manage ' + member.email}>Manage</button></article>)}
          </>}
          {list && <footer className={styles.pagination}><span>Page {page}{list.has_more ? ' · More results available' : ''}</span><div className={styles.actions}><button className={styles.secondary} aria-label="Previous page" disabled={busy || page === 1} onClick={() => setPage(v => v - 1)}><ArrowLeft size={16} /></button><button className={styles.secondary} aria-label="Next page" disabled={busy || !list.has_more} onClick={() => setPage(v => v + 1)}><ArrowRight size={16} /></button></div></footer>}
        </section>
        {view === 'requests' && <section className={styles.detail} aria-label="Request details" aria-busy={detailLoading}>
          {selected && <div className={styles.detailNavigation}><button className={styles.secondary} disabled={busy} onClick={() => setSelected(null)}><ArrowLeft size={16} aria-hidden="true" /> Back to requests</button>
            {nextRequest && <button className={styles.secondary} disabled={busy} onClick={() => setSelected(nextRequest.user_id)}>Next request <ArrowRight size={16} aria-hidden="true" /></button>}</div>}
          {!selected && <div className={styles.empty}><ShieldCheck size={28} aria-hidden="true" /><h2>Give every first experience a good start</h2><p>Select a request to understand the project, review access and read private feedback.</p></div>}
          {detailLoading && <div className={styles.empty} role="status">Loading request…</div>}
          {detailError && <div className={styles.error} role="alert">{detailError}<button onClick={() => setRefresh(v => v + 1)}>Reload request</button></div>}
          {detail && request && <>
            <div className={styles.detailHeader}><Badge state={request.access_state} /><h2 ref={detailHeading} tabIndex={-1}>{request.email}</h2><p>Requested {date(request.requested_at)} · {traffic[request.expected_traffic]}</p></div>
            <section className={styles.detailSection}><h3>What they’re building</h3><p className={styles.message}>{request.use_case}</p></section>
            <section className={styles.detailSection}><h3>Developer access</h3><p className={styles.muted}>{request.access_state === 'approved' ? `Access is active${request.expires_at ? ' until ' + time(request.expires_at) : ' with no expiry'}.` : 'Developer API and tools are unavailable for this account.'} Images and Sites remain available.</p>
              {canReview && <form className={styles.reviewForm} onSubmit={review}><label>Decision<select value={outcome} disabled={busy} onChange={e => setOutcome(e.target.value as RequestState)}>{actions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                {outcome === 'approved' && <label>Access period<select value={days} disabled={busy} onChange={e => setDays(e.target.value)}><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="none">No expiry</option></select></label>}
                <label>Internal decision note<textarea rows={3} required minLength={3} maxLength={1000} placeholder="Why is this the right next step?" value={reason} disabled={busy} onChange={e => {
                  setReason(e.target.value);
                  if (e.target.value) decisionDrafts.current.set(request.user_id, e.target.value);
                  else decisionDrafts.current.delete(request.user_id);
                }} /></label>
                <p className={styles.muted}>Only staff can read this note. The participant sees their access status when they return to the developer page.</p>
                <p className={styles.confirmation}>{actionLabel} for <strong>{request.email}</strong>{outcome === 'approved' ? days === 'none' ? ' with no expiry.' : ` for ${days} days.` : '.'} This takes effect immediately.</p>
                <button className={outcome === 'revoked' || outcome === 'declined' ? styles.danger : styles.primary} disabled={busy}>{busy ? 'Saving decision…' : actionLabel}</button>
              </form>}
            </section>
            <section className={styles.detailSection}><h3>Private feedback <span className={styles.muted}>(latest 25)</span></h3>{detail.feedback.length ? detail.feedback.map(feedbackCard) : <p className={styles.muted}>No feedback from this participant yet.</p>}</section>
            <section className={styles.detailSection}><h3>Decision history <span className={styles.muted}>(latest 25)</span></h3><Activity items={detail.activity} /></section>
          </>}
        </section>}
      </div>
    </main>
  </div>;
}
