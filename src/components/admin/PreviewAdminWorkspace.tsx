'use client';
import { normalizeProfile } from '@/lib/developers/application';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Clock3, Copy, Gauge, Inbox, KeyRound, LayoutDashboard, MessageSquare, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { AccessRequest, AdminActor, AdminRole, AuditItem, FeedbackItem, Page, PrivateAccessKey, RequestDetail, RequestState, StaffMember } from '@/lib/admin/preview-contract';
import { ROLE_DESCRIPTION } from '@/lib/admin/preview-contract';
import styles from './preview-admin.module.css';

type View = 'requests' | 'access' | 'feedback' | 'activity' | 'staff';
type ListItem = AccessRequest | FeedbackItem | AuditItem | StaffMember;
const labels: Record<string, string> = { pending: 'Waiting', approved: 'Approved', revoked: 'Paused', declined: 'Declined', expired: 'Expired', all: 'All requests', open: 'Open', resolved: 'Resolved' };
const traffic: Record<string, string> = { exploring: 'Exploring', under_100_daily: 'Under 100 requests / day', under_1000_daily: '100–1,000 requests / day', over_1000_daily: 'Over 1,000 requests / day' };
const date = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const time = (value: string) => new Date(value).toLocaleString();
const title: Record<View, string> = { requests: 'Access requests', access: 'Private access', feedback: 'Private feedback', activity: 'Activity', staff: 'Staff access' };
const description: Record<View, string> = { requests: 'Review each project. Open access at a pace you can support.', access: 'Provision bounded credentials, adjust allocations, and monitor private cohort usage.', feedback: 'Keep early feedback close. Resolve a report when it has been reviewed.', activity: 'A history of access decisions, credential changes and staff changes.', staff: 'Choose who can review requests and who can manage your team.' };
const eventLabel: Record<string, string> = { bootstrap: 'First owner added', staff_added: 'Staff access added', staff_changed: 'Staff role changed', staff_removed: 'Staff access removed', staff_activated: 'Staff account activated', request_reviewed: 'Access decision', credential_created: 'Credential created', credential_updated: 'Credential updated', credential_revoked: 'Credential revoked', feedback_resolved: 'Feedback resolved', feedback_reopened: 'Feedback reopened' };

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
  const [lastSynced, setLastSynced] = useState<string | null>(null);
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
  const [credentialName, setCredentialName] = useState('Private cohort key'), [credentialEnvironment, setCredentialEnvironment] = useState<'live' | 'test'>('live');
  const [credentialRpm, setCredentialRpm] = useState('60'), [credentialCap, setCredentialCap] = useState('25'), [credentialExpiry, setCredentialExpiry] = useState('30');
  const [secret, setSecret] = useState('');
  const [keyDrafts, setKeyDrafts] = useState<Record<string, { name: string; rpm: string; cap: string }>>({});
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
    if (authLoading || user?.id !== initialActor.id || locked) return;
    const controller = new AbortController(); setList(null); setError('');
    const params = new URLSearchParams({ view, status: filter, q: query, page: String(page) });
    api('?' + params, undefined, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setActor(data.actor); setList(data); setLastSynced(new Date().toISOString()); } })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [view, filter, query, page, refresh, api, authLoading, user?.id, initialActor.id, locked]);
  useEffect(() => {
    if (authLoading || user?.id !== initialActor.id || locked) return;
    if (!selected || !['requests', 'access'].includes(view)) { setDetail(null); return; }
    const controller = new AbortController(); setDetailLoading(true); setDetailError(''); setDetail(null);
    api('?view=request&id=' + encodeURIComponent(selected), undefined, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      setDetail(data); setOutcome(data.request.status === 'approved' ? 'revoked' : 'approved'); setDays('30');
      setReason(decisionDrafts.current.get(selected) || '');
    }).catch(e => { if (!controller.signal.aborted) setDetailError(e.message); }).finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selected, view, refresh, api, authLoading, user?.id, initialActor.id, locked]);
  useEffect(() => { if (detail) detailHeading.current?.focus(); }, [detail]);
  function switchView(next: View) {
    setView(next); setFilter(next === 'feedback' ? 'open' : next === 'access' ? 'approved' : 'pending'); setPage(1); setQuery(''); setSearch(''); setSelected(null); setNotice(''); setError(''); setStaffEdit(null); setSecret('');
  }
  async function save(body: unknown, success: string, reviewedId?: string) {
    if (mutationLock.current) return false;
    mutationLock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const result = await api('', body);
      if (reviewedId) { decisionDrafts.current.delete(reviewedId); setReason(''); }
      setNotice(success); setRefresh(v => v + 1); return result;
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
  async function createCredential(event: FormEvent) {
    event.preventDefault();
    if (!request) return;
    const result = await save({ action: 'credential_create', user_id: request.user_id, name: credentialName, environment: credentialEnvironment,
      rate_limit_per_minute: Number(credentialRpm), usage_cap_usd: Number(credentialCap), expires_in_days: credentialExpiry === 'none' ? null : Number(credentialExpiry) }, 'Private credential created.');
    if (result?.key?.api_key) { setSecret(result.key.api_key); setCredentialName('Private cohort key'); }
  }
  function draftFor(key: PrivateAccessKey) { return keyDrafts[key.id] || { name: key.name, rpm: String(key.rate_limit_per_minute), cap: String(key.usage_cap_usd ?? 25) }; }
  async function updateCredential(key: PrivateAccessKey) {
    if (!request) return;
    const draft = draftFor(key);
    await save({ action: 'credential_update', user_id: request.user_id, key_id: key.id, name: draft.name, rate_limit_per_minute: Number(draft.rpm), usage_cap_usd: Number(draft.cap) }, 'Private credential updated.');
  }
  async function revokeCredential(key: PrivateAccessKey) {
    if (!request || !window.confirm(`Revoke ${key.name}? Existing requests using it will stop.`)) return;
    await save({ action: 'credential_revoke', user_id: request.user_id, key_id: key.id, reason: 'Revoked by GALX administrator.' }, 'Private credential revoked.');
  }
  async function copySecret() {
    try { await navigator.clipboard.writeText(secret); setNotice('Credential copied. Store it in the approved integration now; it will not be shown again.'); }
    catch { setError('Copy failed. Store the credential from this screen before leaving.'); }
  }
  async function shareLink() {
    try { await navigator.clipboard.writeText(location.origin + '/admin'); setNotice('Staff sign-in link copied. Share it with the person you added.'); }
    catch { setError('Copy the staff sign-in address from your browser: /admin.'); }
  }
  const canReview = actor.role !== 'viewer';
  const requestItems = ['requests', 'access'].includes(view) ? (list?.items as AccessRequest[] || []) : [];
  const selectedIndex = requestItems.findIndex(item => item.user_id === selected);
  const nextRequest = requestItems[selectedIndex + 1];
  const request = detail?.request;
  const actions = request?.status === 'approved' ? [['revoked', 'Pause access'], ['approved', 'Update access period']]
    : request?.status === 'pending' ? [['approved', 'Approve access'], ['declined', 'Decline request']]
      : [['approved', 'Approve access'], ['pending', 'Return to pending']];
  const actionLabel = actions.find(([value]) => value === outcome)?.[1] || 'Save decision';
  const feedbackCard = (item: FeedbackItem) => <article className={styles.feedback} key={item.id}>
    <div className={styles.line}><strong>{item.email}</strong><Badge state={item.resolved_at ? 'Resolved' : 'Open'} /></div>
    <p className={styles.message}>{item.message}</p>
    <div className={styles.line}><time dateTime={item.created_at} title={time(item.created_at)}>{date(item.created_at)}</time>
      {canReview && <button className={styles.secondary} disabled={busy} onClick={() => void save({ action: 'feedback', id: item.id, revision: item.revision, resolved: !item.resolved_at }, item.resolved_at ? 'Feedback reopened.' : 'Feedback marked as resolved.')}>{item.resolved_at ? 'Reopen' : 'Mark resolved'}</button>}</div>
  </article>;
  if (locked) return <main className={styles.locked}><ShieldCheck size={28} /><h1>Staff access required</h1><p>Your session or permissions changed. Sign in with an authorized staff account to continue.</p><Link href="/login?next=/admin">Sign in again</Link><Link href="/images">Go to Images</Link></main>;
  const usage = detail?.private_access?.usage;
  const usagePercent = usage ? Math.min(100, Math.max(0, usage.percent_used)) : 0;
  const viewCount = list ? list.items.length : '—';
  const viewCountLabel = list ? `${filter === 'all' ? 'All' : labels[filter] || filter} records on this page` : 'Loading current view';
  return <div className={styles.workspace}>
    <a href="#admin-content" className={styles.skip}>Skip to workspace</a>
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.brand}><span className={styles.brandMark}>G</span><span className={styles.brandName}>GALX</span><span className={styles.brandContext}>Admin</span></Link>
      <div className={styles.consoleLabel}>Control plane</div>
      <nav aria-label="Administration">
        <div className={styles.homeNav}><LayoutDashboard size={17} aria-hidden="true" />Workspace</div>
        <div className={styles.navGroup}><span className={styles.navGroupLabel}>Access operations</span>
          {([
            ['requests', Inbox, 'Requests'], ['access', KeyRound, 'Private access'], ['feedback', MessageSquare, 'Feedback'],
          ] as const).map(([key, Icon, label]) => <button key={key as string} onClick={() => switchView(key as View)} aria-current={view === key ? 'page' : undefined} disabled={busy}>
            <Icon size={17} aria-hidden="true" />{label as string}<span className={styles.navChevron}><ChevronRight size={14} aria-hidden="true" /></span></button>)}
        </div>
        <div className={styles.navGroup}><span className={styles.navGroupLabel}>Governance</span>
          <button onClick={() => switchView('activity')} aria-current={view === 'activity' ? 'page' : undefined} disabled={busy}><Clock3 size={17} aria-hidden="true" />Activity<span className={styles.navChevron}><ChevronRight size={14} aria-hidden="true" /></span></button>
          {actor.role === 'owner' && <button onClick={() => switchView('staff')} aria-current={view === 'staff' ? 'page' : undefined} disabled={busy}><Users size={17} aria-hidden="true" />Staff access<span className={styles.navChevron}><ChevronRight size={14} aria-hidden="true" /></span></button>}
        </div>
      </nav>
      <div className={styles.account}><div className={styles.accountIdentity}><span className={styles.avatar} aria-hidden="true">{actor.email.slice(0, 1).toUpperCase()}</span><span><span className={styles.role}>{actor.role}</span><span className={styles.accountEmail} title={actor.email}>{actor.email}</span></span></div><Link href="/developers"><ArrowLeft size={15} aria-hidden="true" /> Public surface</Link></div>
    </aside>
    <main id="admin-content" className={styles.main}>
      <div className={styles.topbar}><div className={styles.breadcrumbs}><Link href="/">GALX</Link><ChevronRight size={14} aria-hidden="true" /><span>Admin console</span><ChevronRight size={14} aria-hidden="true" /><strong>{title[view]}</strong></div><div className={styles.topbarActions}><span className={styles.secureState}><ShieldCheck size={15} aria-hidden="true" /> Staff-only</span><button className={styles.secondary} onClick={() => { setRefresh(v => v + 1); setNotice(''); }} disabled={busy}><RefreshCw size={16} aria-hidden="true" /> Refresh</button></div></div>
      <header className={styles.header}><div><h1>{title[view]}</h1><p>{description[view]}</p></div><div className={styles.syncState} aria-live="polite"><span className={styles.syncDot} aria-hidden="true" />{lastSynced ? `Synced ${time(lastSynced)}` : 'Syncing workspace'}</div></header>
      <p className={styles.policy}><ShieldCheck size={16} aria-hidden="true" /> Private access is deliberate: explicit, bounded, metered, administered, and revocable.</p>
      <section className={styles.posture} aria-label="Workspace posture">
        <div className={styles.postureItem}><span className={styles.postureLabel}>Current view</span><strong>{viewCount}</strong><span>{viewCountLabel}</span></div>
        <div className={styles.postureItem}><span className={styles.postureLabel}>Access model</span><strong>Private cohorts</strong><span>Approval before provisioning</span></div>
        <div className={styles.postureItem}><span className={styles.postureLabel}>Metering</span><strong>Always visible</strong><span>Usage stays attached to access</span></div>
        <div className={styles.postureItem}><span className={styles.postureLabel}>Your role</span><strong>{actor.role}</strong><span>{canReview ? 'Can make changes' : 'Read-only workspace'}</span></div>
      </section>
      {error && <div role="alert" className={styles.error}>{error} <button onClick={() => setRefresh(v => v + 1)} disabled={busy}>Reload current records</button></div>}
      <div role="status" aria-live="polite" className={notice ? styles.notice : styles.silent}>{notice && <><Check size={16} aria-hidden="true" />{notice}</>}</div>
      <div className={styles.toolbar}>
        <div className={styles.toolbarTitle}><SlidersHorizontal size={16} aria-hidden="true" /><span>View controls</span></div>
        {(view === 'requests' || view === 'access' || view === 'feedback') && <label className={styles.filter}><span className={styles.srOnly}>Filter {view}</span><select value={filter} disabled={busy} onChange={e => { setFilter(e.target.value); setPage(1); setSelected(null); }}>{(view === 'requests' || view === 'access' ? ['pending', 'approved', 'revoked', 'expired', 'declined', 'all'] : ['open', 'resolved', 'all']).map(value => <option key={value} value={value}>{view === 'feedback' ? value === 'all' ? 'All feedback' : value === 'open' ? 'Open feedback' : 'Resolved feedback' : labels[value]}</option>)}</select></label>}
        {['requests', 'access'].includes(view) && <form className={styles.search} onSubmit={e => { e.preventDefault(); setQuery(search.trim()); setPage(1); setSelected(null); }}><label htmlFor={`${view}-search`} className={styles.srOnly}>Search by email or account ID</label><Search size={16} aria-hidden="true" /><input id={`${view}-search`} type="search" placeholder="Search email or account ID" maxLength={320} value={search} onChange={e => setSearch(e.target.value)} /><button className={styles.secondary} disabled={busy}>Search</button></form>}
        {view === 'staff' && <><button className={styles.primary} onClick={() => editStaff('new')} disabled={busy}>Add staff member</button><button className={styles.secondary} onClick={() => void shareLink()}>Copy sign-in link</button></>}
        {actor.role === 'viewer' && <span className={styles.muted}>Read-only access</span>}
      </div>
      <div className={['requests', 'access'].includes(view) ? styles.reviewGrid : styles.single} data-selected={Boolean(selected)}>
        <section aria-label={['requests', 'access'].includes(view) ? 'Request inbox' : title[view]} className={styles.list}>
          {!list && !error && <div role="status" className={styles.empty}><div className={styles.skeleton} /><div className={styles.skeleton} /><p>Loading {title[view].toLowerCase()}…</p></div>}
          {list?.items.length === 0 && <div className={styles.empty}><Inbox size={28} aria-hidden="true" /><h2>{query ? 'No matching requests' : view === 'requests' && filter === 'pending' ? 'No pending requests' : view === 'access' && filter === 'approved' ? 'No active private cohorts' : view === 'feedback' && filter === 'open' ? 'No open feedback' : 'Nothing in this view yet'}</h2><p>{query ? 'Try another email or clear your search.' : view === 'access' ? 'Approve a private cohort before provisioning credentials.' : view === 'requests' ? 'New requests appear here only through the private administration workflow.' : view === 'feedback' ? 'Feedback from approved participants will appear here.' : 'Updates will appear here as your team works.'}</p></div>}
          {['requests', 'access'].includes(view) && (list?.items as AccessRequest[] | undefined)?.map(item => <button key={item.user_id} className={styles.requestRow} aria-pressed={selected === item.user_id} onClick={() => setSelected(item.user_id)} disabled={busy}>
            <div className={styles.line}><strong>{item.email}</strong><Badge state={item.access_state} /></div><p>{item.use_case}</p><div className={styles.line}><span>{item.cohort_interest === 'next' ? 'Interested in next cohort' : item.cohort_interest === 'later' ? 'Prefers a future cohort' : 'Cohort preference not provided'}</span><time dateTime={item.requested_at}>{date(item.requested_at)}</time></div></button>)}
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
        {['requests', 'access'].includes(view) && <section className={styles.detail} aria-label="Request details" aria-busy={detailLoading}>
          {selected && <div className={styles.detailNavigation}><button className={styles.secondary} disabled={busy} onClick={() => setSelected(null)}><ArrowLeft size={16} aria-hidden="true" /> Back to requests</button>
            {nextRequest && <button className={styles.secondary} disabled={busy} onClick={() => setSelected(nextRequest.user_id)}>Next request <ArrowRight size={16} aria-hidden="true" /></button>}</div>}
          {!selected && <div className={styles.empty}><ShieldCheck size={28} aria-hidden="true" /><h2>Give every first experience a good start</h2><p>Select a request to understand the project, review access and read private feedback.</p></div>}
          {detailLoading && <div className={styles.empty} role="status">Loading request…</div>}
          {detailError && <div className={styles.error} role="alert">{detailError}<button onClick={() => setRefresh(v => v + 1)}>Reload request</button></div>}
          {detail && request && <>
            <div className={styles.detailHeader}><Badge state={request.access_state} /><h2 ref={detailHeading} tabIndex={-1}>{request.email}</h2><p>Requested {date(request.requested_at)} · {traffic[request.expected_traffic]}</p></div>
            <section className={styles.detailSection}><h3>Meet the builder</h3>
              <p className={styles.message}>{request.introduction || 'This application was submitted before introductions were added.'}</p>
              <div className={styles.actions}>{(['github', 'linkedin'] as const).map(kind => {
                const url = normalizeProfile(request[`${kind}_url`], kind);
                return url ? <a key={kind} className={styles.secondary} href={url} target="_blank" rel="noopener noreferrer">{kind === 'github' ? 'GitHub profile' : 'LinkedIn profile'}<span className={styles.srOnly}> (opens in a new tab)</span></a> : null;
              })}</div>
              <p className={styles.muted}>Profiles are provided by the applicant.</p>
              <p className={styles.message}>{request.cohort_interest === 'next' ? 'Interested in joining the next private cohort and sharing feedback.' : request.cohort_interest === 'later' ? 'Prefers a future cohort; not ready to participate yet.' : 'Cohort preference not provided.'}</p>
              {request.application_updated_at && <p className={styles.muted}>Application updated {time(request.application_updated_at)}.</p>}
            </section>
            <section className={styles.detailSection}><h3>What they’re building</h3><p className={styles.message}>{request.use_case}</p></section>
            <section className={styles.detailSection}><h3>Private access</h3><p className={styles.muted}>{request.access_state === 'approved' ? `Access is active${request.expires_at ? ' until ' + time(request.expires_at) : ' with no expiry'}.` : 'Private integration access is not active for this cohort.'} Images and Sites remain available.</p>
              {canReview && <form className={styles.reviewForm} onSubmit={review}><label>Decision<select value={outcome} disabled={busy} onChange={e => setOutcome(e.target.value as RequestState)}>{actions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                {outcome === 'approved' && <label>Access period<select value={days} disabled={busy} onChange={e => setDays(e.target.value)}><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="none">No expiry</option></select></label>}
                <label>Internal decision note<textarea rows={3} required minLength={3} maxLength={1000} placeholder="Why is this the right next step?" value={reason} disabled={busy} onChange={e => {
                  setReason(e.target.value);
                  if (e.target.value) decisionDrafts.current.set(request.user_id, e.target.value);
                  else decisionDrafts.current.delete(request.user_id);
                }} /></label>
                <p className={styles.muted}>Only staff can read this note. Approval does not create credentials; provision them deliberately below.</p>
                <p className={styles.confirmation}>{actionLabel} for <strong>{request.email}</strong>{outcome === 'approved' ? days === 'none' ? ' with no expiry.' : ` for ${days} days.` : '.'} This takes effect immediately.</p>
                <button className={outcome === 'revoked' || outcome === 'declined' ? styles.danger : styles.primary} disabled={busy}>{busy ? 'Saving decision…' : actionLabel}</button>
              </form>}
            </section>
            <section className={styles.detailSection}><h3>Credentials and metering</h3>
              {usage && <div className={styles.usageCard}><div className={styles.usageHeader}><div><span className={styles.postureLabel}>Current metering period</span><strong>{usage.percent_used}% used</strong></div><Gauge size={20} aria-hidden="true" /></div><div className={styles.usageTrack} role="progressbar" aria-label="Current metering period used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={usagePercent}><span style={{ transform: `scaleX(${usagePercent / 100})` }} /></div><div className={styles.usageGrid}><div><span>Completed</span><strong>{usage.completed_messages.toLocaleString()}</strong></div><div><span>Pending</span><strong>{usage.pending_messages.toLocaleString()}</strong></div><div><span>Allocation</span><strong>{usage.cap_messages.toLocaleString()} messages</strong></div><div><span>Remaining</span><strong>${usage.remaining_usd.toFixed(2)}</strong></div></div><p className={styles.muted}>{usage.reset_at ? `Resets ${time(usage.reset_at)}.` : 'No reset date is recorded for this period.'} {usage.accrued_usd > 0 ? `$${usage.accrued_usd.toFixed(2)} accrued in this period.` : 'No usage has accrued yet.'}</p></div>}
              {!detail.private_access?.usage && <p className={styles.muted}>No current metering period is available for this cohort. Credential-level totals remain visible when recorded.</p>}
              {detail.private_access?.keys.length ? <div className={styles.activityList}>{detail.private_access.keys.map(key => {
                const draft = draftFor(key);
                return <article className={styles.staffRow} key={key.id}>
                  <div className={styles.message}>
                    <div className={styles.line}><strong>{key.name}</strong><Badge state={key.revoked ? 'revoked' : 'approved'} /></div>
                    <p>{key.key_prefix} · {key.environment} · {key.total_requests.toLocaleString()} requests · {key.total_tokens.toLocaleString()} tokens</p>
                    <p className={styles.muted}>{key.last_used_at ? `Last used ${time(key.last_used_at)}` : 'Not used yet'}{key.expires_at ? ` · expires ${time(key.expires_at)}` : ''}</p>
                    {!key.revoked && canReview && <div className={styles.reviewForm}>
                      <label>Name<input value={draft.name} disabled={busy} onChange={e => setKeyDrafts(current => ({ ...current, [key.id]: { ...draft, name: e.target.value } }))} /></label>
                      <label>Traffic allocation (RPM)<input type="number" min={10} max={10000} value={draft.rpm} disabled={busy} onChange={e => setKeyDrafts(current => ({ ...current, [key.id]: { ...draft, rpm: e.target.value } }))} /></label>
                      <label>Usage allocation (USD)<input type="number" min={0.01} step="0.01" value={draft.cap} disabled={busy} onChange={e => setKeyDrafts(current => ({ ...current, [key.id]: { ...draft, cap: e.target.value } }))} /></label>
                      <div className={styles.actions}><button type="button" className={styles.secondary} disabled={busy} onClick={() => void updateCredential(key)}>Save allocation</button><button type="button" className={styles.danger} disabled={busy} onClick={() => void revokeCredential(key)}>Revoke</button></div>
                    </div>}
                  </div>
                </article>;
              })}</div> : <p className={styles.muted}>No credentials have been provisioned for this cohort.</p>}
              {canReview && request.access_state === 'approved' && <form className={styles.reviewForm} onSubmit={createCredential}>
                <h4><KeyRound size={16} aria-hidden="true" /> Provision a credential</h4>
                <p className={styles.muted}>The secret is displayed once. Confirm the approved integration can store it securely.</p>
                <label>Name<input value={credentialName} disabled={busy} maxLength={80} onChange={e => setCredentialName(e.target.value)} /></label>
                <label>Environment<select value={credentialEnvironment} disabled={busy} onChange={e => setCredentialEnvironment(e.target.value as 'live' | 'test')}><option value="live">Live</option><option value="test">Test</option></select></label>
                <label>Traffic allocation (RPM)<input type="number" min={10} max={10000} required value={credentialRpm} disabled={busy} onChange={e => setCredentialRpm(e.target.value)} /></label>
                <label>Usage allocation (USD)<input type="number" min={0.01} step="0.01" required value={credentialCap} disabled={busy} onChange={e => setCredentialCap(e.target.value)} /></label>
                <label>Credential expiry<select value={credentialExpiry} disabled={busy} onChange={e => setCredentialExpiry(e.target.value)}><option value="30">30 days</option><option value="90">90 days</option><option value="730">730 days</option><option value="none">No expiry</option></select></label>
                <button className={styles.primary} disabled={busy}>{busy ? 'Provisioning…' : 'Generate credential'}</button>
              </form>}
              {secret && <div className={styles.notice}><strong>Store this credential now. It will not be shown again.</strong><div className={styles.line}><code className={styles.message}>{secret}</code><button type="button" className={styles.secondary} onClick={() => void copySecret()}><Copy size={15} aria-hidden="true" /> Copy</button></div></div>}
            </section>
            <section className={styles.detailSection}><h3>Private feedback <span className={styles.muted}>(latest 25)</span></h3>{detail.feedback.length ? detail.feedback.map(feedbackCard) : <p className={styles.muted}>No feedback from this participant yet.</p>}</section>
            <section className={styles.detailSection}><h3>Decision history <span className={styles.muted}>(latest 25)</span></h3><Activity items={detail.activity} /></section>
          </>}
        </section>}
      </div>
    </main>
  </div>;
}
