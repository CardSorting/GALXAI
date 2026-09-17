'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeProfile, TRAFFIC_OPTIONS, validateApplication, type ApplicationDetails, type ApplicationErrors, type ApplicationInput } from '@/lib/developers/application';
import styles from './developer-preview.module.css';

type Status = 'loading' | 'not_requested' | 'pending' | 'approved' | 'revoked' | 'declined' | 'expired' | 'session_required' | 'error';
type Draft = Omit<ApplicationInput, 'cohort_interest'> & { cohort_interest: '' | ApplicationInput['cohort_interest'] };
const emptyDraft: Draft = { introduction: '', github_url: '', linkedin_url: '', use_case: '', expected_traffic: 'exploring', cohort_interest: '' };
const fieldIds = { introduction: 'preview-introduction', github_url: 'preview-github', linkedin_url: 'preview-linkedin', use_case: 'preview-project', expected_traffic: 'preview-traffic', cohort_interest: 'preview-next' };
const cohortLabel = (value: string | null) => value === 'next' ? 'Interested in the next cohort' : value === 'later' ? 'Interested in a future cohort' : 'Not provided yet';

function ApplicationSummary({ value }: { value: ApplicationDetails | Draft }) {
  return <dl className={styles.summary}>
    <div><dt>Introduction</dt><dd>{value.introduction || 'Not provided yet'}</dd></div>
    <div><dt>Profiles</dt><dd className={styles.profileLinks}>{(['github', 'linkedin'] as const).map(kind => {
      const url = normalizeProfile(value[`${kind}_url`], kind);
      return url ? <a key={kind} href={url} target="_blank" rel="noopener noreferrer">{url.replace('https://', '')}<span className={styles.srOnly}> (opens in a new tab)</span></a> : null;
    })}{!value.github_url && !value.linkedin_url && 'Not provided yet'}</dd></div>
    <div><dt>Your project</dt><dd>{value.use_case}</dd></div>
    <div><dt>Expected API requests</dt><dd>{TRAFFIC_OPTIONS[value.expected_traffic]}</dd></div>
    <div><dt>Cohort preference</dt><dd>{cohortLabel(value.cohort_interest)}</dd></div>
  </dl>;
}

export function DeveloperPreview() {
  const auth = useAuth();
  // Account changes unmount private drafts and cancel client requests immediately.
  return <PreviewFlow key={auth.user?.id ?? 'guest'} user={auth.user} isLoading={auth.isLoading} />;
}

function PreviewFlow({ user, isLoading }: Pick<ReturnType<typeof useAuth>, 'user' | 'isLoading'>) {
  const [status, setStatus] = useState<Status>('loading');
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [errors, setErrors] = useState<ApplicationErrors>({});
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [focusVersion, setFocusVersion] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  const mutation = useRef<AbortController | null>(null);
  const accountId = user?.id, token = user?.token;
  const focusHeading = () => setFocusVersion(value => value + 1);
  useEffect(() => { if (focusVersion) heading.current?.focus(); }, [focusVersion]);
  useEffect(() => { if (Object.keys(errors).length) errorSummary.current?.focus(); }, [errors]);
  useEffect(() => () => mutation.current?.abort(), []);

  function applySaved(data: { status: Status; application?: ApplicationDetails | null; expires_at?: string | null }) {
    setStatus(['not_requested', 'pending', 'approved', 'revoked', 'declined', 'expired', 'session_required'].includes(data.status) ? data.status : 'error');
    setApplication(data.application ?? null); setExpiresAt(data.expires_at ?? null);
  }
  useEffect(() => {
    if (isLoading) return;
    if (!accountId) { setStatus('not_requested'); return; }
    const controller = new AbortController(); setStatus('loading');
    fetch('/api/developer-access', { cache: 'no-store', signal: controller.signal, headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async response => { if (response.status === 401) return { status: 'session_required' as const }; if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { if (!controller.signal.aborted) applySaved(data); })
      .catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => controller.abort();
  }, [accountId, token, refresh, isLoading]);

  function startEditing() {
    if (application) setDraft({ introduction: application.introduction ?? '', github_url: application.github_url ?? '', linkedin_url: application.linkedin_url ?? '',
      use_case: application.use_case, expected_traffic: application.expected_traffic, cohort_interest: application.cohort_interest ?? '' });
    setEditing(true); setReviewing(false); setErrors({}); setNotice(''); focusHeading();
  }
  function update<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft(previous => ({ ...previous, [key]: value })); }
  function review(event: FormEvent) {
    event.preventDefault();
    const checked = validateApplication(draft); setErrors(checked.errors);
    if (Object.keys(checked.errors).length) return;
    setDraft(checked.value); setReviewing(true); setNotice(''); focusHeading();
  }
  async function save(kind: 'application' | 'feedback') {
    if (mutation.current) return;
    const controller = new AbortController(); mutation.current = controller; setBusy(true); setNotice('');
    try {
      const response = await fetch(`/api/developer-access${kind === 'feedback' ? '/feedback' : ''}`, {
        method: kind === 'application' && editing ? 'PATCH' : 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(kind === 'feedback' ? { message: feedback } : { ...draft, ...(editing ? { revision: application?.revision } : {}) }),
      });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        if (response.status === 401) { setStatus('session_required'); setDraft(emptyDraft); setApplication(null); setFeedback(''); setEditing(false); setReviewing(false); }
        if (response.status === 409) setConflict(true);
        if (response.status === 400 && data.error?.fields) { setErrors(validateApplication(draft).errors); setReviewing(false); }
        if (kind === 'feedback' && response.status === 403) setRefresh(n => n + 1);
        setNotice(data.error?.message || 'We couldn’t save that. Please try again.'); return;
      }
      if (kind === 'application') {
        applySaved(data); setEditing(false); setReviewing(false); setConflict(false);
        setNotice(editing ? 'Application updated. Your original place in the review queue is unchanged.' : 'Application received. You can check its status here.'); focusHeading();
      } else { setFeedback(''); setNotice('Feedback received. Thank you for helping shape GALX.'); }
    } catch { if (!controller.signal.aborted) setNotice('We couldn’t save that. Your draft is still here. Check your connection and try again.'); }
    finally { if (!controller.signal.aborted) { mutation.current = null; setBusy(false); } }
  }

  async function purchaseDeveloperTier() {
    if (mutation.current) return;
    const controller = new AbortController(); mutation.current = controller; setBusy(true); setNotice('');
    try {
      const requestId = crypto.randomUUID();
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST', credentials: 'same-origin', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ amount: 10, requestId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not start Developer Tier checkout.');
      const target = new URL(result.url);
      if (target.protocol !== 'https:' || target.hostname !== 'checkout.stripe.com') throw new Error('Could not open secure checkout.');
      window.location.assign(target.href);
    } catch (e: any) {
      if (!controller.signal.aborted) setNotice(e?.message || 'Could not start Developer Tier checkout. Please try again.');
    } finally {
      if (!controller.signal.aborted) { mutation.current = null; setBusy(false); }
    }
  }

  const fieldError = (key: keyof ApplicationInput) => errors[key] && <p id={`${fieldIds[key]}-error`} className={styles.fieldError}>{errors[key]}</p>;
  const describedBy = (key: keyof ApplicationInput, hint: string) => `${hint}${errors[key] ? ` ${fieldIds[key]}-error` : ''}`;
  const showForm = status === 'not_requested' || (status === 'pending' && editing);
  return <section className={styles.panel} aria-label="Developer application" aria-busy={busy}>
    {isLoading || status === 'loading' ? <p role="status">Checking your preview access…</p> : !user ? <>
      <div className={styles.tierCard}>
        <span className={styles.tierBadge}>Instant Access ⚡</span>
        <h3 className={styles.tierTitle}>Developer Tier ($10 USD)</h3>
        <p className={styles.tierDesc}>Instant API access for image generation and frontier OpenAI models. Micro-metered token and generation pricing with zero markup.</p>
        <ul className={styles.tierFeatures}>
          <li>Includes $20 total usable compute credit ($10 deposit + $5 welcome + $5 match)</li>
          <li>Instant API Key minting & full access to OpenAI Frontier models and Images API</li>
          <li>No waitlist application or review delay required</li>
        </ul>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/signup?next=/developers">Sign up to get instant Developer Tier <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
      <div className={styles.orDivider}>or apply for free preview</div>
      <h2>Apply for the private preview</h2><p>Start with a verified GALX account. Then share a short introduction, a profile, and what you’d like to build.</p>
      <p>We read each application and invite builders as space opens. Applying doesn’t grant API access.</p>
      <div className={styles.actions}><Link className={styles.secondary} href="/signup?next=/developers">Sign up to apply <ArrowRight size={16} aria-hidden="true" /></Link><Link className={styles.textLink} href="/login?next=/developers">Already have an account? Sign in</Link></div>
    </> : status === 'session_required' ? <>
      <h2>Sign in to check your access</h2><p>Use your verified account to apply or view your current status. Your saved application will be waiting for you.</p><Link className={styles.primary} href="/login?next=/developers">Sign in again</Link>
    </> : status === 'error' ? <>
      <h2>We couldn’t check your access</h2><p role="alert">Please try again. Your saved application is unchanged.</p><button className={styles.primary} onClick={() => setRefresh(n => n + 1)}>Try again</button>
    </> : showForm ? <>
      {!editing && <div className={styles.tierCard}>
        <span className={styles.tierBadge}>Instant Access ⚡</span>
        <h3 className={styles.tierTitle}>Get Instant Developer Tier ($10)</h3>
        <p className={styles.tierDesc}>Skip the waitlist and unlock pay-as-you-go API access immediately for Images and Frontier OpenAI Models.</p>
        <ul className={styles.tierFeatures}>
          <li>Includes $20 total usable credit ($10 deposit + $5 welcome + $5 match)</li>
          <li>Instant API Key minting (`/keys`) and drop-in OpenAI compatible endpoints</li>
          <li>Instant activation without manual review</li>
        </ul>
        <button className={styles.primary} disabled={busy} onClick={() => void purchaseDeveloperTier()}>
          {busy ? 'Opening checkout…' : 'Purchase Developer Tier ($10)'} <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>}
      {!editing && <div className={styles.orDivider}>or apply for free waitlist</div>}
      <div className={styles.formHeading}><h2 ref={heading} tabIndex={-1}>{reviewing ? 'Review your application' : editing ? 'Update your application' : 'Tell us a little about yourself'}</h2><p>{reviewing ? 'Check your details before sharing them with the GALX team.' : 'A short introduction is enough. We’re interested in the builder and the project.'}</p></div>
      <p className={styles.account}>Applying as <strong>{user.email}</strong></p>
      {reviewing ? <>
        <ApplicationSummary value={draft} /><p className={styles.helper}>Your application is private to you and the GALX team. An invitation and API access require review.</p>
        <div className={styles.actions}><button className={styles.primary} disabled={busy || conflict} onClick={() => void save('application')}>{busy ? 'Saving application…' : editing ? 'Save changes' : 'Submit application'}<ArrowRight size={16} aria-hidden="true" /></button><button className={styles.secondary} disabled={busy} onClick={() => { setReviewing(false); focusHeading(); }}><ArrowLeft size={16} aria-hidden="true" /> Edit answers</button></div>
      </> : <form noValidate onSubmit={review} className={styles.form}>
        {Object.keys(errors).length > 0 && <div ref={errorSummary} tabIndex={-1} role="alert" className={styles.errorSummary}><h3>Check your application</h3><ul>{Object.entries(errors).map(([key, error]) => <li key={key}><a href={`#${fieldIds[key as keyof ApplicationInput]}`}>{error}</a></li>)}</ul></div>}
        <fieldset className={styles.group}><legend>About you</legend>
          <div className={styles.field}><label htmlFor="preview-introduction">A short introduction</label><p id="introduction-hint" className={styles.helper}>What’s your background, and what do you enjoy building? A sentence or two, 20–1,000 characters.</p><textarea id="preview-introduction" name="introduction" rows={3} minLength={20} maxLength={1000} required value={draft.introduction} onChange={e => update('introduction', e.target.value)} aria-invalid={Boolean(errors.introduction)} aria-describedby={describedBy('introduction', 'introduction-hint')} />{fieldError('introduction')}</div>
          <div><p id="profiles-hint" className={styles.helper}>Add GitHub or LinkedIn so we can get to know your work. One profile is enough; both are welcome.</p><div className={styles.profileFields}>{(['github', 'linkedin'] as const).map(kind => {
            const key = `${kind}_url` as const;
            return <div className={styles.field} key={kind}><label htmlFor={fieldIds[key]}>{kind === 'github' ? 'GitHub profile' : 'LinkedIn profile'}</label><input id={fieldIds[key]} name={key} type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={300} placeholder={kind === 'github' ? 'github.com/yourname' : 'linkedin.com/in/yourname'} value={draft[key] ?? ''} onChange={e => update(key, e.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={describedBy(key, 'profiles-hint')} />{fieldError(key)}</div>;
          })}</div></div>
        </fieldset>
        <fieldset className={styles.group}><legend>Your project</legend>
          <div className={styles.field}><label htmlFor="preview-project">What would you use the API for?</label><p id="project-hint" className={styles.helper}>Describe your idea, who it’s for, and what you’d like to try. An early idea is welcome. 20–2,000 characters.</p><textarea id="preview-project" name="use_case" rows={4} minLength={20} maxLength={2000} required value={draft.use_case} onChange={e => update('use_case', e.target.value)} aria-invalid={Boolean(errors.use_case)} aria-describedby={describedBy('use_case', 'project-hint')} />{fieldError('use_case')}</div>
          <div className={styles.field}><label htmlFor="preview-traffic">Expected API requests</label><p id="traffic-hint" className={styles.helper}>A rough estimate helps us plan the cohort. It’s fine if you’re still exploring.</p><select id="preview-traffic" name="expected_traffic" value={draft.expected_traffic} onChange={e => update('expected_traffic', e.target.value as Draft['expected_traffic'])} aria-invalid={Boolean(errors.expected_traffic)} aria-describedby={describedBy('expected_traffic', 'traffic-hint')}>{Object.entries(TRAFFIC_OPTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{fieldError('expected_traffic')}</div>
        </fieldset>
        <fieldset className={styles.group} aria-describedby={describedBy('cohort_interest', 'cohort-hint')}><legend>Would you join the next private cohort?</legend><p id="cohort-hint" className={styles.helper}>Participants try the API with a real project and share candid, private feedback as we improve it.</p><div className={styles.choices}>{(['next', 'later'] as const).map(value => <label className={styles.choice} key={value}><input id={`preview-${value}`} type="radio" name="cohort_interest" value={value} required checked={draft.cohort_interest === value} onChange={() => update('cohort_interest', value)} /><span><strong>{value === 'next' ? 'Yes, I’d like to participate' : 'I’m interested, but a future cohort is better'}</strong><span>{value === 'next' ? 'I’m willing to test and share feedback.' : 'Keep my application for a later group.'}</span></span></label>)}</div>{fieldError('cohort_interest')}</fieldset>
        <p className={styles.helper}>Only share information you’re comfortable sending to GALX. Leave out passwords, API keys, and sensitive customer data. <Link href="/privacy">Privacy policy</Link></p>
        <div className={styles.actions}><button className={styles.primary}>Review application <ArrowRight size={16} aria-hidden="true" /></button>{editing && <button className={styles.secondary} type="button" onClick={() => { setEditing(false); setErrors({}); setNotice(''); focusHeading(); }}>Cancel</button>}</div>
      </form>}
    </> : status === 'approved' ? <>
      <h2 ref={heading} tabIndex={-1}>Your Developer Tier access is active</h2>{expiresAt && <p>Your access is available until {new Date(expiresAt).toLocaleString()}.</p>}<p>Your account is unlocked for pay-as-you-go API usage across Images generation and OpenAI GPT-5.6 Luna.</p>
      <div className={styles.actions}><Link className={styles.primary} href="/keys">Manage API keys</Link><Link className={styles.textLink} href="/docs">Read the API docs</Link><Link className={styles.textLink} href="/playground">Open playground</Link></div>
      <form className={styles.feedbackForm} onSubmit={e => { e.preventDefault(); void save('feedback'); }}><label htmlFor="preview-feedback">Share private feedback</label><p id="feedback-hint" className={styles.helper}>Tell us what happened and what you expected. Only the GALX team can read your feedback. Leave out credentials and sensitive data.</p><textarea id="preview-feedback" aria-describedby="feedback-hint" rows={5} minLength={10} maxLength={4000} required value={feedback} onChange={e => setFeedback(e.target.value)} /><button className={styles.primary} disabled={busy}>{busy ? 'Sending…' : 'Send private feedback'}</button></form>
    </> : <>
      {status === 'pending' && <Check className={styles.received} size={28} aria-hidden="true" />}
      <div className={styles.tierCard}>
        <span className={styles.tierBadge}>Skip the Waitlist ⚡</span>
        <h3 className={styles.tierTitle}>Get Instant Developer Tier ($10)</h3>
        <p className={styles.tierDesc}>Unlock pay-as-you-go API access immediately for Images and OpenAI GPT-5.6 Luna without waiting for manual cohort review.</p>
        <button className={styles.primary} disabled={busy} onClick={() => void purchaseDeveloperTier()}>
          {busy ? 'Opening checkout…' : 'Purchase Developer Tier ($10)'} <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
      <div className={styles.orDivider}>current waitlist status</div>
      <h2 ref={heading} tabIndex={-1}>{status === 'pending' ? 'You’re on the developer waitlist' : status === 'expired' ? 'Your preview access period has ended' : status === 'declined' ? 'Your request was reviewed' : 'Your developer access is paused'}</h2>
      <p>{status === 'pending' ? 'Your application is saved. We review each project and open access as we make room for another small group. Check your status here; there’s no guaranteed invitation date.' : status === 'declined' ? 'We’re unable to open developer access for your project at this stage. Your application remains on file for future review. Images and Sites are still available.' : 'Developer API calls are unavailable for your account. Your original application is saved for review. Images and Sites are still available.'}</p>
      {status === 'pending' && application && <><p className={styles.preference}>{cohortLabel(application.cohort_interest)}</p>{!application.introduction && <p>Help us get to know you: add an introduction, a profile, and your cohort preference to your existing application.</p>}<details className={styles.savedDetails}><summary>Your saved application</summary><ApplicationSummary value={application} /></details></>}
      <div className={styles.actions}>{status === 'pending' && application && <button className={styles.primary} onClick={startEditing}>{application.introduction ? 'Update application' : 'Complete application'}</button>}<button className={styles.secondary} onClick={() => { setNotice(''); setRefresh(n => n + 1); }}>Check access status</button></div>
    </>}
    <div role="status" aria-live="polite" className={notice ? styles.notice : styles.silent}>{notice}</div>
    {conflict && <button className={styles.secondary} disabled={busy} onClick={() => { setConflict(false); setEditing(false); setReviewing(false); setDraft(emptyDraft); setNotice(''); setRefresh(n => n + 1); }}>Discard edits and reload</button>}
  </section>;
}
