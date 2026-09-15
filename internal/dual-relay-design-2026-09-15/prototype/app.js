/* Synthetic interaction client. No provider credentials, SDKs or external requests. */
const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let state, busy = false, paused = false, disconnected = false, uncertain = false, reading = false, renderedRoute, changeSequence = 0;
const title = () => state?.profile === 'premium' ? 'Premium' : 'Standard';
const type = () => state?.profile === 'premium' ? 'paid' : 'free';
const route = () => location.hash.slice(1) || 'overview';
const time = value => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(value);
const badge = (label, tone = '') => `<span class="badge ${tone}">${escape(label)}</span>`;
const locked = () => busy || paused || disconnected || uncertain || state?.mode !== 'operator';
const disabled = () => locked() ? 'disabled' : '';
const linkAccount = (account, label) => `<a class="button compact" href="#account/${encodeURIComponent(account.id)}">${escape(label)}</a>`;
const applied = account => account.desiredGeneration === account.appliedGeneration;
const ready = account => !disconnected && state.relayOnline && account.phase === 'complete' && !account.paused && applied(account);
const issue = account => !ready(account) || Object.values(account.capabilities).some(value => value !== 'ready');
const nextAction = account => account.phase === 'sign_in' ? 'Continue sign-in' : account.phase === 'review' ? 'Review account' : account.phase === 'verify' ? 'Verify account' : account.paused ? 'Review paused account' : issue(account) ? 'Review verification' : 'View account';
const accountStatus = account => disconnected ? badge('Status unconfirmed', 'warning') : !applied(account) ? badge(account.paused ? 'Pause saved · awaiting relay' : 'Saved · awaiting relay', 'warning') : !state.relayOnline && account.phase === 'complete' ? badge('Relay offline', 'warning') : account.paused ? badge('New work paused', 'warning') : account.phase === 'sign_in' ? badge('Sign-in needed', 'warning') : account.phase === 'review' ? badge('Awaiting registration', 'warning') : account.phase === 'verify' ? badge('Registered · verification needed', 'warning') : issue(account) ? badge('Partially ready', 'warning') : badge('Ready', 'good');
function notice(message = '', recover = false) {
  $('notice').hidden = !message;
  $('notice').innerHTML = message ? `<p>${escape(message)}</p>${recover ? '<button id="recover">Check saved result</button>' : ''}` : '';
  if ($('recover')) $('recover').onclick = recoverOperation;
}
function announce(message) { $('announcement').textContent = message; }
function header(name, description, action = '') {
  return `<div class="page-head"><div><h1 id="page-title" tabindex="-1">${escape(name)}</h1><p>${escape(description)}</p></div>${action}</div>`;
}
function registerLink() { return `<a class="button primary" href="#register">Register ${type()} account</a>`; }
function workloadRows(account) {
  return ['text', 'sites', 'images'].map(workload => {
    const label = workload === 'text' ? 'Text models' : workload === 'sites' ? 'Sites' : 'Images';
    const enabled = state.profile === 'premium' || workload === 'text';
    const eligible = account ? ready(account) && account.capabilities[workload] === 'ready' ? 1 : 0 : state.accounts.filter(a => ready(a) && a.capabilities[workload] === 'ready').length;
    const status = !enabled ? badge('Not enabled') : eligible ? badge('Ready', 'good') : badge(disconnected ? 'Status unconfirmed' : !state.relayOnline ? 'Relay offline' : account && !applied(account) ? 'Awaiting relay' : account?.paused ? 'Paused' : account?.capabilities[workload] === 'unavailable' ? 'Unavailable' : account ? 'Not verified' : 'Not ready', 'warning');
    const detail = !enabled ? 'Not permitted in this console' : eligible ? account ? 'Ready for new work' : `${eligible} ${eligible === 1 ? 'account' : 'accounts'} ready for new work` : disconnected ? 'Reconnect account management to confirm readiness' : !state.relayOnline ? 'Reconnect this relay; accounts remain saved centrally' : account && !applied(account) ? 'Saved changes need relay acknowledgement' : account?.paused ? 'Resume new work when ready' : account?.capabilities[workload] === 'unavailable' ? 'Review access before checking again' : account ? 'Run verification to check access' : state.accounts.length ? 'Open an account to review the next step' : 'Register an account to begin';
    return `<div class="workload"><strong>${label}</strong>${status}<small>${detail}</small></div>`;
  }).join('');
}
function eventList(limit = 6, accountId) {
  const events = accountId ? state.events.filter(event => event.accountId === accountId) : state.events;
  return events.length ? `<ol class="events">${events.slice(0, limit).map(event => `<li><time datetime="${new Date(event.at).toISOString()}">${time(event.at)} · ${title()} relay</time><p>${escape(event.text)}</p></li>`).join('')}</ol>` : '<p class="muted">No actions recorded in this prototype session. Registration and traffic changes will appear here.</p>';
}
function overview() {
  const issues = state.accounts.filter(issue);
  return header(`${title()} relay`, `${type() === 'paid' ? 'Paid' : 'Free'} upstream accounts · ${state.profile === 'premium' ? 'Text, Sites and Images' : 'Text models'}`, registerLink()) +
    `<section class="connection-summary" aria-label="Connections"><div><strong>Account management</strong>${badge(disconnected ? 'Unavailable' : 'Connected', disconnected ? 'warning' : 'good')}<small>Central account record · fixed ${title()} assignment</small></div><div><strong>${title()} execution</strong>${badge(disconnected ? 'Last status unconfirmed' : state.relayOnline ? 'Connected' : 'Offline', !disconnected && state.relayOnline ? 'good' : 'warning')}<small>${state.relayOnline ? 'Relay acknowledgement available' : 'Registration stays saved. Verification waits for reconnection.'}</small></div></section><section aria-labelledby="workload-title"><div class="section-head"><h2 id="workload-title">Workload readiness</h2><span class="muted">Example state</span></div><div class="workloads">${workloadRows()}</div></section>
    <div class="two-col"><section class="section" aria-labelledby="attention-title"><div class="section-head"><h2 id="attention-title">Needs attention <span class="muted">(${issues.length})</span></h2><a href="#accounts">All accounts</a></div>${issues.length ? issues.map(a => `<div class="attention-row"><div><strong>${escape(a.name)}</strong><p>${a.phase === 'sign_in' ? 'Workspace saved. Complete sign-in to continue.' : disconnected ? 'Reconnect account management to confirm the current status.' : !applied(a) ? 'Change saved centrally. Relay acknowledgement is pending.' : !state.relayOnline ? 'Relay offline. Saved account setup is retained.' : a.paused ? 'New work is paused. Existing work may finish.' : a.phase === 'review' ? 'Sign-in saved. Review and register this account.' : a.phase === 'verify' ? 'Registration saved. Verify permitted workloads.' : 'Text and Sites are ready. Image verification needs attention.'}</p></div>${linkAccount(a, nextAction(a))}</div>`).join('') : `<div class="empty"><h3>${state.accounts.length ? 'No accounts need attention' : 'Register your first account'}</h3><p>${state.accounts.length ? 'Open an account to inspect its individual workloads.' : 'Prepare a workspace, complete sign-in, then explicitly register the account in this relay.'}</p>${state.accounts.length ? '' : registerLink()}</div>`}</section>
    <section class="section" aria-labelledby="recent-title"><div class="section-head"><h2 id="recent-title">Recent activity</h2><a href="#activity">View all</a></div>${eventList(4)}</section></div>`;
}
function accounts() {
  return header('Accounts', `Only accounts assigned to ${title()} relay appear here.`, registerLink()) +
    `<div class="toolbar"><label>Search accounts<input id="account-search" type="search" placeholder="Search by account name"></label><label>Show<select id="account-filter"><option value="all">All accounts</option><option value="attention">Needs attention</option><option value="ready">Ready for work</option></select></label></div><div id="account-results"></div>`;
}
function accountRows() {
  if (!$('account-results')) return;
  const query = $('account-search').value.toLowerCase(), filter = $('account-filter').value;
  const rows = state.accounts.filter(a => a.name.toLowerCase().includes(query) && (filter === 'all' || filter === 'attention' && issue(a) || filter === 'ready' && ready(a)));
  $('account-results').innerHTML = rows.length ? `<p class="table-hint helper" id="table-hint">Scroll the table sideways to see all columns and actions.</p><div class="scroll" role="region" aria-label="Account table" aria-describedby="table-hint" tabindex="0"><table><caption class="sr-only">${title()} relay accounts</caption><thead><tr><th scope="col">Account</th><th scope="col">Status</th><th scope="col">Workloads ready</th><th scope="col">Next action</th></tr></thead><tbody>${rows.map(a => `<tr><td><a href="#account/${encodeURIComponent(a.id)}">${escape(a.name)}</a><small>${title()} · ${type()} account</small></td><td>${accountStatus(a)}</td><td>${!ready(a) ? 'None accepting new work' : Object.entries(a.capabilities).filter(([, v]) => v === 'ready').map(([k]) => k === 'text' ? 'Text' : k === 'sites' ? 'Sites' : 'Images').join(', ') || 'Not verified'}</td><td>${linkAccount(a, nextAction(a))}</td></tr>`).join('')}</tbody></table></div><p class="helper">${rows.length} ${rows.length === 1 ? 'account' : 'accounts'}. Status is separate from workload readiness.</p>` : `<div class="empty"><h2>${state.accounts.length ? 'No matching accounts' : 'No accounts registered yet'}</h2><p>${state.accounts.length ? 'Change the search or filter to see more accounts.' : `Register a ${type()} upstream account to begin.`}</p>${state.accounts.length ? '<button id="clear-filter">Clear filters</button>' : registerLink()}</div>`;
  if ($('clear-filter')) $('clear-filter').onclick = () => { $('account-search').value = ''; $('account-filter').value = 'all'; accountRows(); $('account-search').focus(); };
}
function stepList(phase) {
  const index = { prepare: 0, sign_in: 1, review: 2, verify: 3, complete: 4 }[phase];
  return `<ol class="steps" aria-label="Registration progress">${['Workspace', 'Sign in', 'Register', 'Verify'].map((name, i) => `<li class="${i === index ? 'current' : ''}" ${i === index ? 'aria-current="step"' : ''}><span class="step-number">${i + 1}</span><div>${name}<small>${i < index ? 'Complete' : i === index ? 'Current step' : 'Not started'}</small></div></li>`).join('')}</ol>`;
}
function accountView(account) {
  const phase = account?.phase || 'prepare';
  const frame = `<a class="breadcrumb" href="#accounts">Back to accounts</a>${header(account?.name || `Register ${type()} account`, `Managed centrally · assigned to ${title()} relay. This assignment stays fixed.`)}`;
  let body;
  if (phase === 'prepare') body = `<h2>Prepare an account workspace</h2><p class="muted">Give the account a name you will recognize later. Its workspace and setup progress will be saved in central account management.</p><form id="create-form"><label class="field" for="account-name">Account name<input id="account-name" name="name" type="text" maxlength="64" required autocomplete="off" placeholder="For example, Studio account" ${disabled()}></label><div class="subtle-panel"><strong>${title()} relay · ${type()} upstream accounts</strong><p>${state.profile === 'premium' ? 'Can serve text, Sites and images after verification.' : 'Serves text models. Sites and images are not permitted in this console.'}</p></div><div class="form-actions"><button class="primary mutate" type="submit" ${disabled()}>Prepare workspace</button><a href="#accounts">Cancel</a></div></form>`;
  if (phase === 'sign_in') body = `<h2>Sign in to this account</h2><p class="muted">The workspace is saved. Complete provider sign-in in its isolated desktop, then return to review the account.</p><div class="subtle-panel"><strong>Prototype sign-in</strong><p>No login window or provider connection is opened. The button below simulates a completed sign-in using a fictional account.</p></div><div class="form-actions"><button class="primary mutate" id="signin" ${disabled()}>Simulate completed sign-in</button><a href="#accounts">Save and exit</a></div><p class="helper">Closing this page keeps the workspace. You can continue from Accounts.</p>`;
  if (phase === 'review') body = `<h2>Review before registration</h2><p class="muted">A saved sign-in does not register an account. Confirm the destination and account type before proceeding.</p><dl class="summary-list"><div><dt>Account</dt><dd>${escape(account.name)} <span class="muted">(simulated)</span></dd></div><div><dt>Destination</dt><dd>${title()} relay</dd></div><div><dt>Account type</dt><dd>${type() === 'paid' ? 'Paid' : 'Free'} upstream account</dd></div><div><dt>Verification</dt><dd>${state.profile === 'premium' ? 'Text, Sites, Images' : 'Text only'}</dd></div></dl><form id="register-form"><label class="checkbox"><input id="confirm-type" type="checkbox" required ${disabled()}><span>I confirm this is a ${type()} upstream account for ${title()} relay.</span></label><p class="helper">This is your classification. Workload verification is a separate check.</p><div class="form-actions"><button class="primary mutate" type="submit" ${disabled()}>Register account</button><a href="#accounts">Save and exit</a></div></form>`;
  if (phase === 'verify' || phase === 'complete') {
    const pending = phase === 'verify' || Object.values(account.capabilities).some(v => v !== 'ready');
    body = `<h2>${phase === 'verify' ? 'Account registered' : disconnected ? 'Saved account; current status unconfirmed' : !applied(account) ? 'Change saved; relay acknowledgement pending' : !state.relayOnline ? 'Account saved; relay offline' : account.paused ? 'New work is paused' : pending ? 'Account partially ready' : 'Account ready for work'}</h2><p class="muted">${phase === 'verify' ? 'Registration is saved centrally. Verify permitted workloads before this account receives work.' : disconnected ? 'Last observed values are shown. Reconnect central account management before making changes.' : !applied(account) ? 'The requested change is saved centrally. Relay acknowledgement is still pending. Existing work is not confirmed stopped.' : !state.relayOnline ? 'Saved verification results are retained. This relay must reconnect before the account is shown ready.' : account.paused ? 'Accepted work may finish. Resume removes the pause; readiness still applies.' : pending ? 'Working capabilities remain available. Review the failed workload without repeating successful checks.' : 'This account can receive work for the verified capabilities below.'}</p><div class="workloads">${workloadRows(account)}</div>${phase === 'complete' && pending ? '<div class="subtle-panel"><strong>Image verification was denied</strong><p>The account remains registered. Text and Sites verification passed. Check image access before verifying images again.</p></div>' : ''}${pending ? `<p class="helper">Verification is simulated here. In the real console, generation checks use provider allowance and must be clearly disclosed.</p>` : ''}<div class="form-actions">${pending ? `<button id="verify" class="primary mutate" ${locked() || !state.relayOnline ? 'disabled' : ''}>${phase === 'verify' ? 'Run simulated verification' : 'Recheck unavailable workload'}</button>` : ''}${phase === 'complete' ? `<button id="traffic" class="mutate ${pending ? '' : 'primary'}" ${disabled()}>${account.paused ? 'Resume new work' : 'Pause new work'}</button>` : ''}<a href="#accounts">Back to accounts</a></div><p class="helper">${account.verifiedAt ? `Last verification: ${time(account.verifiedAt)}. ` : ''}All values in this prototype are illustrative.</p>`;
  }
  const progress = phase === 'complete' && Object.values(account.capabilities).some(v => v !== 'ready') ? 'verify' : phase;
  return frame + `<div class="registration">${stepList(progress)}<section class="form" aria-label="Account setup">${body}${account ? `<details class="account-activity"><summary id="account-activity-toggle">Account activity</summary>${eventList(12, account.id)}</details>` : ''}</section></div>`;
}
function settings() {
  return header('Relay settings', 'Identity and workload rules stay visible and predictable.') + `<div class="settings-list"><dl class="summary-list"><div><dt>Relay</dt><dd>${title()} relay</dd></div><div><dt>Upstream account type</dt><dd>${type() === 'paid' ? 'Paid' : 'Free'}</dd></div><div><dt>Permitted workloads</dt><dd>${state.profile === 'premium' ? 'Text, Sites, Images' : 'Text only'}</dd></div><div><dt>Account management</dt><dd>Central account authority</dd></div><div><dt>Execution assignment</dt><dd>Fixed to this console</dd></div><div><dt>Current preview role</dt><dd>${state.mode === 'operator' ? 'Operator' : 'Read only'}</dd></div></dl><h2>Recovery behavior</h2><p>Saved registrations resume after refresh. If a save response is interrupted, check its saved result before repeating the action.</p><p>Pausing new work preserves the account and its registration. Pausing live updates only freezes this view.</p><p class="settings-note">This loopback prototype uses one central account store and two scoped consoles in a single test harness. It demonstrates interaction behavior; process and network isolation require separate production validation. It does not authenticate real operators, register real accounts, run models or change production settings.</p></div>`;
}
function render() {
  if (!state) return;
  const sameRoute = renderedRoute === route();
  const focused = sameRoute ? document.activeElement?.id : undefined;
  const activityOpen = sameRoute && $('view').querySelector('.account-activity')?.open;
  const tableScroll = sameRoute ? $('view').querySelector('.scroll')?.scrollLeft : 0;
  const values = sameRoute ? Object.fromEntries([...$('view').querySelectorAll('input,select')].map(el => [el.id, { value: el.value, checked: el.checked }])) : {};
  const path = route();
  let accountId;
  try { if (path.startsWith('account/')) accountId = decodeURIComponent(path.slice(8)); } catch { /* Treat malformed account links as missing. */ }
  const account = state.accounts.find(a => a.id === accountId);
  $('view').innerHTML = path === 'overview' ? overview() : path === 'accounts' ? accounts() : path === 'activity' ? header('Activity', `Changes recorded in ${title()} relay. Example data only.`) + eventList(100) : path === 'settings' ? settings() : path === 'register' ? accountView() : account ? accountView(account) : header('Account not found', 'This account is not in this relay.') + '<a class="button" href="#accounts">Back to accounts</a>';
  renderedRoute = path;
  const flowHeading = $('view').querySelector('.form h2');
  if (flowHeading) { flowHeading.id = 'flow-title'; flowHeading.tabIndex = -1; }
  if (state.mode === 'viewer') $('view').insertAdjacentHTML('afterbegin', '<p class="helper">Read-only preview. Choose Operator in Prototype controls to explore registration and traffic actions.</p>');
  document.querySelectorAll('[data-nav]').forEach(el => { if (el.dataset.nav === (path.startsWith('account/') || path === 'register' ? 'accounts' : path)) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
  for (const [id, value] of Object.entries(values)) if ($(id)) { $(id).value = value.value; $(id).checked = value.checked; }
  if ($('account-search')) { $('account-search').oninput = accountRows; $('account-filter').onchange = accountRows; accountRows(); }
  if ($('create-form')) $('create-form').onsubmit = async event => { event.preventDefault(); const next = await action('create', { name: $('account-name').value }); if (next) location.hash = `account/${next.operation.accountId}`; };
  if ($('signin')) $('signin').onclick = () => action('signin', { id: account.id, duplicateFixture: $('demo-duplicate').checked });
  if ($('register-form')) $('register-form').onsubmit = event => { event.preventDefault(); void action('register', { id: account.id, confirmed: $('confirm-type').checked }, $('demo-lost').checked); };
  if ($('verify')) $('verify').onclick = () => action('verify', { id: account.id, outcome: state.profile === 'standard' ? 'success' : $('demo-result').value });
  if ($('traffic')) $('traffic').onclick = () => action('set_paused', { id: account.id, paused: !account.paused });
  if (activityOpen && $('view').querySelector('.account-activity')) $('view').querySelector('.account-activity').open = true;
  if (tableScroll && $('view').querySelector('.scroll')) $('view').querySelector('.scroll').scrollLeft = tableScroll;
  if (focused && $(focused)) $(focused).focus({ preventScroll: true });
}
const pendingKey = 'galx-demo-pending-v2';
let pending;
try { pending = JSON.parse(sessionStorage.getItem(pendingKey) || 'null'); uncertain = !!pending; } catch { uncertain = false; }
function clearPending() { sessionStorage.removeItem(pendingKey); pending = null; uncertain = false; }
function connectionLabel() {
  if (!state) return;
  $('connection').textContent = `${disconnected ? 'Account management unavailable' : paused ? 'Live updates paused' : 'Account management connected'} · ${uncertain ? 'action outcome unconfirmed · ' : ''}last checked ${time(state.capturedAt)}`;
}
function apply(next) {
  if (state && next.revision < state.revision) return;
  const changed = !state || state.revision !== next.revision;
  state = next;
  document.body.classList.toggle('standard', state.profile === 'standard');
  document.title = `${title()} relay · GALX interaction prototype`;
  $('instance-name').textContent = `${title()} relay`; $('relay-label').textContent = `${title()} relay`;
  $('account-type').textContent = `${type() === 'paid' ? 'Paid' : 'Free'} upstream accounts`;
  document.querySelector('.instance-mark').textContent = title()[0];
  $('role-label').textContent = state.mode === 'operator' ? 'Operator' : 'Read only';
  $('account-count').textContent = state.accounts.length;
  $('demo-role').value = state.mode;
  $('demo-relay').checked = !state.relayOnline;
  $('demo-result').querySelector('[value="images-denied"]').disabled = state.profile === 'standard';
  if (state.profile === 'standard') $('demo-result').value = 'success';
  connectionLabel(); if (changed) render();
}
async function refresh(manual = false) {
  if (reading || busy || (paused || uncertain) && !manual) return;
  reading = true;
  const sequence = changeSequence;
  try {
    const response = await fetch('/api/state', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw Error('Account management is unavailable. Saved progress is retained.');
    const next = await response.json();
    if (sequence !== changeSequence || busy || paused && !manual) return;
    const wasDisconnected = disconnected; disconnected = false;
    if (manual) { paused = false; $('pause-updates').textContent = 'Pause live updates'; }
    apply(next);
    if (uncertain) notice('An action needs confirmation. Check its saved result; refreshing the view does not resolve the operation.', true);
    else if (manual || wasDisconnected) notice();
    if (manual || wasDisconnected) { render(); announce('Saved state refreshed.'); }
  } catch {
    if (sequence !== changeSequence || busy || paused && !manual) return;
    disconnected = true; connectionLabel();
    notice('Account management is unavailable. Last observed values are shown. Saved progress is retained; changes are disabled.', uncertain); render();
    if (!state) $('view').innerHTML = header('Could not connect', 'Start central account management, then choose Refresh status.');
  } finally { reading = false; }
}
async function submit(command, lost = false) {
  changeSequence++; busy = true; notice(); render();
  let confirmedResponse = false, succeeded = false;
  try {
    // Persist the exact intent BEFORE dispatch. No credentials or provider identity are stored here.
    sessionStorage.setItem(pendingKey, JSON.stringify(command)); pending = command; uncertain = true;
    const response = await fetch('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(lost ? { 'x-demo-lost-reply': '1' } : {}) }, body: JSON.stringify(command), signal: AbortSignal.timeout(5000) });
    const next = await response.json(); confirmedResponse = response.status < 500;
    if (!response.ok) { if (confirmedResponse) clearPending(); throw Error(next.error || 'The action could not be confirmed.'); }
    clearPending(); disconnected = false; succeeded = true; apply(next); notice('Saved in central account management.'); announce('Saved.'); return next;
  } catch (error) {
    uncertain = !!pending && !confirmedResponse;
    notice(uncertain ? 'The action response was interrupted. Its original identity is retained in this tab. Check the saved result before continuing.' : error.message, uncertain);
  } finally {
    busy = false; connectionLabel(); render();
    if (uncertain) $('recover')?.focus({ preventScroll: true });
    else if (succeeded && !['mode', 'reset', 'create', 'relay'].includes(command.action)) $('flow-title')?.focus({ preventScroll: true });
  }
}
async function action(name, payload = {}, lost = false) {
  if (!state || busy || paused || disconnected || uncertain || locked() && !['reset', 'mode', 'relay'].includes(name)) return;
  const account = payload.id ? state.accounts.find(a => a.id === payload.id) : undefined;
  return submit({ action: name, operationId: crypto.randomUUID(), ...(account ? { expectedAccountRevision: account.revision } : { expectedRevision: state.revision }), ...payload }, lost);
}
async function recoverOperation() {
  if (!pending || busy) return;
  busy = true; changeSequence++; render();
  try {
    const response = await fetch(`/api/operations/${encodeURIComponent(pending.operationId)}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    const result = await response.json();
    if (response.status === 404) {
      notice('No saved result was found for this operation. Retry the original action with the same operation identity.');
      $('notice').insertAdjacentHTML('beforeend', '<button id="retry-original">Retry original action</button>');
      $('retry-original').onclick = async () => { const next = await submit(pending); if (next?.operation.accountId) location.hash = `account/${next.operation.accountId}`; };
      $('retry-original').focus(); return;
    }
    if (!response.ok) throw Error('The result cannot be checked while account management is unavailable. Keep this tab and try again.');
    const receipt = result.operation; clearPending(); disconnected = false; apply(result.state);
    notice(`Confirmed: the original ${receipt.action.replaceAll('_', ' ')} action was saved at ${time(receipt.savedAt)}. Current account status is shown below.`);
    if (receipt.accountId) location.hash = `account/${receipt.accountId}`;
    announce('Original action confirmed.');
  } catch (error) { notice(error.message, true); }
  finally { busy = false; connectionLabel(); render(); }
}
$('refresh').onclick = () => refresh(true);
$('pause-updates').onclick = () => { paused = !paused; $('pause-updates').textContent = paused ? 'Resume live updates' : 'Pause live updates'; if (paused) { connectionLabel(); notice('Live updates are paused. Resume updates or refresh status before making changes.', uncertain); render(); } else void refresh(true); };
$('demo-toggle').onclick = () => { const expanded = $('demo-toggle').getAttribute('aria-expanded') === 'true'; $('demo-toggle').setAttribute('aria-expanded', String(!expanded)); $('demo-controls').hidden = expanded; };
$('demo-role').onchange = () => action('mode', { mode: $('demo-role').value });
$('demo-relay').onchange = () => action('relay', { online: !$('demo-relay').checked });
$('demo-empty').onclick = async () => { const next = await action('reset', { empty: true }); if (next) location.hash = 'overview'; };
$('demo-reset').onclick = async () => { const next = await action('reset', { empty: false }); if (next) location.hash = 'overview'; };
async function availability(available) {
  try {
    const response = await fetch('/demo/availability', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ available }), signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw Error('Could not change the demo scenario.');
    await refresh(true);
  } catch (error) { notice(error.message, uncertain); }
}
$('demo-outage').onclick = () => availability(false);
$('demo-restore').onclick = () => availability(true);
window.addEventListener('hashchange', () => { render(); $('page-title')?.focus({ preventScroll: true }); });
document.addEventListener('keydown', event => { if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) && $('account-search')) { event.preventDefault(); $('account-search').focus(); } });
setInterval(() => { if (!document.hidden && !uncertain) void refresh(); }, 4000);
void refresh(true);
