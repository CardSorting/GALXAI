import { accountHealth, accountCanEnable, registrationHealth, filterRegistrations, accountApplied, filterAccounts, needsSignIn, registrationStep, relayFresh, executionStatus } from '/assets/monitor-model.js';

const $ = id => document.getElementById(id);
const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};
const busy = new Set();
const errors = new Map();
const errorMeta = new Map();
let state, loading = false, connected = false, lastUpdated, view = 'accounts';
let refreshPromise = null, recoveryPromise = null, refreshRetryTimer = null, refreshRetryAttempt = 0, pollTimer = null;
let noticeKind = '', draft, preserveViewFocus = false;
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const date = value => {
  const parsed = new Date(Number.isFinite(Number(value)) ? Number(value) : value);
  return value && Number.isFinite(parsed.getTime()) ? parsed.toLocaleString() : 'Not confirmed';
};
const errorLanguage = {
  action_in_progress: {
    title: 'Another connection check is running',
    message: 'This connection is already being checked. Nothing was duplicated.',
    next: 'Refresh status to see the result.'
  },
  control_unavailable: {
    title: 'We could not confirm that change',
    message: 'Your saved sign-in is safe. The connection service is taking longer than expected.',
    next: 'Refresh status in a moment. Retry only if the connection still needs action.'
  },
  credential_registry_unavailable: {
    title: 'We could not finish the connection',
    message: 'Your saved sign-in is safe. The connection was not confirmed yet.',
    next: 'Refresh status before trying again.'
  },
  credential_check_unavailable: {
    title: 'Access could not be checked',
    message: 'Your saved sign-in is safe, but access could not be verified right now.',
    next: 'Refresh status later, then connect again if needed.'
  },
  credential_missing: {
    title: 'Sign-in is not saved yet',
    message: 'Complete sign-in in the desktop before connecting this account.',
    next: 'Open Connections and choose Start sign-in.'
  },
  credential_invalid: {
    title: 'Sign-in needs to be completed again',
    message: 'The saved sign-in could not be read. Your account settings are still safe.',
    next: 'Start sign-in again, then connect this account.'
  },
  credential_expired: {
    title: 'Sign-in has expired',
    message: 'Your account is still saved, but its sign-in is no longer current.',
    next: 'Start sign-in again, then reconnect this account.'
  },
  credential_account_mismatch: {
    title: 'This is a different account',
    message: 'The sign-in in this desktop does not match the saved account.',
    next: 'Sign in to the intended account, then connect again.'
  },
  credential_rejected: {
    title: 'Sign-in was not accepted',
    message: 'The account did not accept this saved sign-in. Your account settings are still safe.',
    next: 'Start sign-in again, then reconnect this account.'
  },
  credential_older: {
    title: 'A newer sign-in is already saved',
    message: 'This connection was not changed because a newer sign-in is already in place.',
    next: 'Refresh status to see the current connection.'
  },
  credential_conflict: {
    title: 'The sign-in changed during the check',
    message: 'This connection was not changed because its saved sign-in changed while it was being checked.',
    next: 'Refresh status and review the current connection.'
  },
  credential_not_allowed: {
    title: 'This account cannot be connected here',
    message: 'The account is already reserved or no longer available for this connection.',
    next: 'Refresh status, then ask an operator to review the connection.'
  },
  credential_account_ambiguous: {
    title: 'The account needs review',
    message: 'More than one saved connection matches this sign-in, so nothing was changed.',
    next: 'Ask an operator to review the existing connections.'
  },
  desktop_busy: {
    title: 'The desktop is busy',
    message: 'The desktop is finishing another action before it can continue.',
    next: 'Wait a moment, then refresh status.'
  },
  desktop_not_running: {
    title: 'The desktop is not ready',
    message: 'The sign-in desktop needs to be running before this connection can continue.',
    next: 'Open Connections and choose Start desktop.'
  },
  registration_removed: {
    title: 'This connection was removed',
    message: 'The saved connection was not changed.',
    next: 'Refresh status and choose Restore if you want to set it up again.'
  },
  record_changed: {
    title: 'This connection changed elsewhere',
    message: 'The saved connection was updated in another window, so this change was not applied.',
    next: 'Refresh status and review the latest connection before trying again.'
  },
  desktop_changed: {
    title: 'The sign-in desktop changed',
    message: 'The connection was not changed because its sign-in desktop is no longer the same.',
    next: 'Review the connection and complete sign-in in its current desktop.'
  },
  registration_not_found: {
    title: 'Connection not found',
    message: 'This connection is no longer available in the current list.',
    next: 'Refresh status to load the latest connections.'
  },
  invalid_request: {
    title: 'That action could not be completed',
    message: 'The connection details are no longer current.',
    next: 'Refresh status and try again from the current connection.'
  }
};
function errorDetail(error) {
  const known = typeof error?.code === 'string' && Object.hasOwn(errorLanguage, error.code) ? errorLanguage[error.code] : undefined;
  if (known) return known;
  return {
    title: 'We could not confirm that change',
    message: 'Your saved sign-in is safe, but the latest change was not confirmed.',
    next: 'Refresh status before trying again.'
  };
}
function notice(text, kind = 'action') {
  noticeKind = kind;
  $('notice').textContent = text;
  $('notice').hidden = !text;
}
function remember(key, value) {
  try {
    if (value) sessionStorage.setItem(key, JSON.stringify(value));
    else sessionStorage.removeItem(key);
  } catch {}
}
function recalled(key) {
  try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
}
async function api(route, body, method = body ? 'POST' : 'GET') {
  if (method === 'GET' && navigator.onLine === false) throw Error('You’re offline. Showing the last confirmed state.');
  let response;
  try {
    response = await fetch(route, {
      method, headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000)
    });
  } catch {
    const error = Error(method === 'GET' ? 'Could not reach this monitor. Refresh to reconnect.' :
      'The result could not be confirmed. Refresh and check the saved state before trying again.');
    error.code = 'network_unavailable';
    throw error;
  }
  if (response.status === 401) {
    location.replace('/?reason=expired');
    const error = Error('Your session expired. Open this monitor again.');
    error.code = 'session_expired';
    throw error;
  }
  let data;
  try { data = await response.json(); } catch {
    const error = Error('The monitor returned an incomplete response. Refresh to check the saved state.');
    error.code = 'incomplete_response';
    throw error;
  }
  if (!response.ok) {
    const code = typeof data?.error?.code === 'string' ? data.error.code : 'control_unavailable';
    const known = Object.hasOwn(errorLanguage, code) ? errorLanguage[code] : undefined;
    const message = known?.message || 'The action could not be confirmed. Refresh to check its status.';
    const error = Error(message);
    error.code = code;
    error.status = response.status;
    throw error;
  }
  return data;
}
function clearRefreshRetry() {
  if (refreshRetryTimer) clearTimeout(refreshRetryTimer);
  refreshRetryTimer = null;
}
function scheduleRefreshRetry() {
  if (refreshRetryTimer || document.hidden || navigator.onLine === false) return;
  const base = Math.min(30000, 1000 * 2 ** Math.min(refreshRetryAttempt, 5));
  const delay = Math.round(base * (0.8 + Math.random() * 0.4));
  refreshRetryAttempt++;
  refreshRetryTimer = setTimeout(() => { refreshRetryTimer = null; void refresh(); }, delay);
}
function clearPollTimer() {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = null;
}
function schedulePoll() {
  clearPollTimer();
  if (document.hidden || navigator.onLine === false) return;
  const delay = Math.round(10000 * (0.8 + Math.random() * 0.4));
  pollTimer = setTimeout(() => {
    pollTimer = null;
    if (document.hidden || navigator.onLine === false) return schedulePoll();
    void refresh().finally(schedulePoll);
  }, delay);
}
function connectionIntentKey(registrationId) { return 'registration-connect:' + registrationId; }
async function recoverPendingConnections() {
  if (recoveryPromise) return recoveryPromise;
  const work = (async () => {
    const pending = (state?.registrations ?? []).filter(registration => {
      const intent = recalled(connectionIntentKey(registration.id));
      return intent?.action === 'connect' && registration.state !== 'registered';
    });
    for (const registration of pending) {
      if (await reconcileConnection(registration.id, 'connect')) {
        remember(connectionIntentKey(registration.id), null);
        errors.delete(registration.id);
        errorMeta.delete(registration.id);
        notice('Account connected. The saved state is confirmed.');
      } else notice('The previous connection is still not confirmed. Your saved sign-in was not duplicated; retry when the relay is available.', 'action');
    }
  })();
  const settled = work.finally(() => { if (recoveryPromise === settled) recoveryPromise = null; });
  recoveryPromise = settled;
  return settled;
}
function button(label, key, action, primary = false, disabled = false) {
  const element = node('button', busy.has(key) ? 'Working…' : label, primary ? '' : 'quiet');
  element.type = 'button';
  element.dataset.action = label;
  element.dataset.busy = key;
  element.disabled = disabled || !connected || busy.has(key);
  element.addEventListener('click', () => void run(key, action));
  return element;
}
async function run(key, action) {
  if (busy.has(key) || !connected) return;
  if (noticeKind === 'action') notice('');
  busy.add(key);
  errors.delete(key);
  errorMeta.delete(key);
  // Keep the original node mounted through the user gesture (desktop popup permission).
  document.querySelectorAll('[data-busy]').forEach(element => {
    if (element.dataset.busy === key) { element.disabled = true; }
  });
  try {
    await action();
  } catch (error) {
    const detail = errorDetail(error);
    errors.set(key, detail.message);
    errorMeta.set(key, detail);
    if (key === 'prepare') notice(detail.message);
  } finally {
    busy.delete(key);
    await refresh();
  }
}
function chooseView(focus = false) {
  const hash = location.hash.slice(1);
  view = ['accounts', 'registrations', 'activity'].includes(hash) ? hash : 'accounts';
  document.querySelectorAll('[data-view]').forEach(element => { element.hidden = element.id !== view; });
  document.querySelectorAll('nav a').forEach(link => {
    if (link.hash === '#' + view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const titles = { accounts: 'Accounts', registrations: 'Connections', activity: 'Activity' };
  $('page-title').textContent = titles[view];
  if (state) {
    document.title = $('pool').textContent + ' — ' + titles[view];
    $('summary').textContent = view === 'accounts'
      ? state.accounts.filter(a => !a.removedAt).length + ' registered · ' + state.accounts.filter(a => !a.removedAt && a.state === 'enabled').length + ' enabled'
      : view === 'registrations' ? 'Sign in on the desktop, then connect here. Reconnect here when access expires.'
      : 'A history of saved account changes.';
    $('new').textContent = 'Connect account';
    $('gate-note').hidden = state.executionAllowed || view !== 'accounts';
    $('new').hidden = state.role !== 'operator' || (!state.accounts.length && view === 'accounts');
  }
  if (focus) $('page-title').focus({ preventScroll: true });
}
function goToRegistration(accountId) {
  preserveViewFocus = location.hash !== '#registrations';
  location.hash = 'registrations';
  chooseView();
  const registration = state.registrations.find(r => r.accountId === accountId);
  if (registration) {
    $('registration-search').value = ''; $('registration-filter').value = registration.removedAt ? 'removed' : 'all'; renderRegistrations();
    $('completed').open = registration.state === 'registered';
    const row = [...document.querySelectorAll('[data-record]')].find(el => el.dataset.record === registration.id);
    row?.scrollIntoView({ block: 'center', behavior: 'instant' });
    row?.querySelector('button,summary')?.focus({ preventScroll: true });
  }
}
function startDraft() {
  preserveViewFocus = location.hash !== '#registrations';
  location.hash = 'registrations';
  chooseView();
  $('prepare').hidden = false;
  $('name').focus();
}
async function accountAction(account, command) {
  let intent = recalled('account-action');
  if (!intent || intent.accountId !== account.id || intent.command !== command || intent.expectedRevision !== account.revision) {
    intent = { id: crypto.randomUUID(), accountId: account.id, expectedRevision: account.revision, command };
  }
  remember('account-action', intent);
  await api('/api/accounts/action', intent);
  remember('account-action', null);
  notice('Change saved. The relay’s confirmation appears in Accounts.');
}
function renderAccounts() {
  const accounts = filterAccounts(state.accounts, $('search').value, $('filter').value, Date.now(), { state, connected, health: $('health-filter').value, sort: $('sort').value });
  const issues = state.accounts.filter(a => !a.removedAt && accountHealth(a,state,connected).attention).length;
  $('account-attention').hidden = !issues;
  $('account-attention-copy').textContent = issues + (issues === 1 ? ' account needs attention' : ' accounts need attention');
  $('filters').hidden = !state.accounts.length;
  $('rows').closest('.table-wrap').hidden = !accounts.length;
  $('empty').hidden = state.accounts.length > 0;
  $('no-results').hidden = !state.accounts.length || accounts.length > 0;
  const total = state.accounts.filter(a => Boolean(a.removedAt) === ($('filter').value === 'removed')).length;
  const count = accounts.length + ' of ' + total + ' accounts';
  if ($('result-count').textContent !== count) $('result-count').textContent = count;
  const operator = state.role === 'operator';
  $('first-account').hidden = !operator;
  $('first-account').disabled = !connected || !state.registrationAllowed;
  $('empty-copy').textContent = operator
    ? 'Connect a ' + (state.pool === 'premium' ? 'paid' : 'free') + ' account to get started. ' + (state.automaticActivation ? 'We’ll verify its access and enable it automatically.' : 'New accounts stay paused until execution is resumed.')
    : 'An operator can register accounts here. You can review account status and recent changes.';
  $('rows').replaceChildren();
  for (const account of accounts) {
    const row = node('tr'), identity = node('td', account.name), actions = node('td');
    row.dataset.record = account.id;
    identity.append(node('small', (account.accountClass === 'paid' ? 'Paid' : 'Free') + ' account · ' +
      account.models.filter(model => !model.startsWith('image:')).length + ' text models'));
    const saved = node('td');
    saved.append(node('span', account.removedAt ? 'Removed' : account.state[0].toUpperCase() + account.state.slice(1), 'badge'));
    const applied = connected && accountApplied(account, state);
    const confirmation = node('td', applied ? 'Applied' : 'Awaiting confirmation', applied ? 'ok' : 'waiting');
    confirmation.append(node('small', applied ? date(account.acknowledgedAt) : 'Saved centrally'));
    const expired = needsSignIn(account), signIn = node('td'), condition = accountHealth(account,state,connected);
    row.dataset.health = condition.code;
    signIn.append(healthBadge(condition), node('small', condition.detail));
    if (!expired && !account.removedAt && account.state !== 'revoked') signIn.append(node('small', 'Sign-in expires ' + date(account.credentialExpiresAt)));
    if (operator && !account.removedAt && account.state !== 'revoked') {
      const enabled = account.state === 'enabled';
      const toggle = button(enabled ? 'Pause' : 'Enable', account.id, () => accountAction(account, enabled ? 'paused' : 'enabled'),
        false, !enabled && !accountCanEnable(account, state, connected));
      if (!enabled && toggle.disabled) toggle.title = !state.executionAllowed && !state.automaticActivation ? 'Execution is paused for this relay.' :
        expired ? 'Update the sign-in before enabling this account.' : !relayFresh(state) ? 'Wait for the relay to reconnect.' : 'Current access or capacity is unavailable.';
      actions.append(toggle);
      if (state.registrations.some(r => r.accountId === account.id)) {
        actions.append(button(expired ? 'Reconnect' : 'Connection settings', account.id, () => goToRegistration(account.id)));
      }
    }
    if (operator && !account.removedAt) actions.append(managementActions('account', account));
    if (operator && account.removedAt && state.registrations.some(r => r.accountId === account.id)) actions.append(button('View registration',account.id,()=>goToRegistration(account.id)));
    if (errors.has(account.id)) { const error = node('p', errors.get(account.id), 'inline-error'); error.setAttribute('role','alert'); actions.append(error); }
    row.append(identity, saved, confirmation, signIn, actions);
    $('rows').append(row);
  }
}
async function openDesktop(registration) {
  const tab = window.open('about:blank', '_blank');
  if (!tab) throw Error('Your browser blocked the desktop window. Allow pop-ups for this monitor, then open the desktop again.');
  tab.opener = null;
  try {
    const result = await api('/api/desktops/access', {});
    tab.location = '/desktops?id=' + encodeURIComponent(registration.desktopId) + '#ticket=' + encodeURIComponent(result.ticket);
  } catch (error) { tab.close(); throw error; }
}
async function reconcileConnection(registrationId, action, previousCheckedAt) {
  notice('Checking whether the connection finished…', 'action');
  const delays = [0, 350, 900, 1800];
  for (const delay of delays) {
    if (delay) await wait(delay);
    await refresh();
    const registration = state?.registrations.find(item => item.id === registrationId);
    const account = registration?.accountId ? state?.accounts.find(item => item.id === registration.accountId) : null;
    if (action === 'connect' && registration?.state === 'registered') return true;
    if (action === 'refresh' && account?.connectionState === 'connected' && account.connectionCheckedAt && account.connectionCheckedAt !== previousCheckedAt) return true;
  }
  return false;
}
function registrationRow(registration) {
  const desktop = state.desktops.find(d => d.id === registration.desktopId);
  const step = registrationStep(registration, desktop), saved = step === 3;
  const account = state.accounts.find(a => a.id === registration.accountId);
  const reconnect = account && needsSignIn(account);
  const row = node('article', undefined, 'registration-row');
  row.dataset.record = registration.id;
  const heading = node('div', undefined, 'registration-heading');
  heading.append(node('h3', registration.name), node('span', saved ? (reconnect ? 'Action required' : 'Connected') : 'Step ' + step + ' of 2', 'badge'));
  row.append(heading);
  const condition = registrationHealth(registration,state,connected);
  const conditionLine = node('div',undefined,'registration-health');
  conditionLine.append(healthBadge(condition), node('p',condition.detail,'hint'));
  row.append(conditionLine);
  if (account?.connectionCheckedAt) row.append(node('p', 'Last verified ' + date(account.connectionCheckedAt), 'hint'));
  const actions = node('div', undefined, 'actions');
  const call = async (action, message) => {
    const intentKey = connectionIntentKey(registration.id);
    const previousCheckedAt = account?.connectionCheckedAt;
    if (action === 'connect' || action === 'refresh') remember(intentKey, { registrationId: registration.id, action, startedAt: Date.now() });
    try {
      const result = await api('/api/registrations/' + action, { id: registration.id });
      if (action === 'connect' || action === 'refresh') remember(intentKey, null);
      if (message) notice(message);
      return result;
    } catch (error) {
      // A timed-out or interrupted mutation is deliberately not replayed. The
      // persisted registration is the source of truth, so reconcile it first.
      if ((action === 'connect' || action === 'refresh') && await reconcileConnection(registration.id, action, previousCheckedAt)) {
        remember(intentKey, null);
        notice(action === 'connect' ? 'Account connected. The saved state is confirmed.' : 'Connection verified. The latest sign-in is saved.');
        return { reconciled: true };
      }
      throw error;
    }
  };
  if (registration.removedAt || condition.code === 'revoked') {
    heading.querySelector('.badge').textContent = registration.removedAt ? 'Removed' : 'Revoked';
    if (state.role === 'operator') {
      if (condition.code === 'cleanup') actions.append(button('Stop desktop',registration.id,()=>call('stop'),true));
      if (!registration.accountId || !registration.removedAt) actions.append(managementActions('registration',registration));
    }
  } else {
    if (!saved) {
      const steps = node('ol', undefined, 'steps');
      steps.setAttribute('aria-label', 'Connection progress');
      ['Sign in', 'Connect'].forEach((label, index) => {
        const item = node('li', label, index + 1 < step ? 'done' : index + 1 === step ? 'current' : '');
        if (index + 1 === step) item.setAttribute('aria-current', 'step');
        steps.append(item);
      });
      row.append(steps);
    }
    if (registration.models?.length && !saved) {
      const details = node('details', undefined, 'models'), summary = node('summary', 'Verified models (' + registration.models.length + ')');
      summary.dataset.action = 'models';
      const list = node('ul');
      for (const model of registration.models) list.append(node('li', model));
      details.append(summary, list); row.append(details);
    }
    if (state.role === 'operator') {
      const closed = !state.registrationAllowed;
      if (!desktop && state.desktopAvailable) {
        actions.append(button('Create desktop', registration.id, () => api('/api/registrations/prepare',
          { id: registration.id, desktopId: registration.desktopId, name: registration.name }), true, closed));
      } else if (desktop && !desktop.canConnect && state.desktopAvailable && ['stopped','missing','error','unhealthy'].includes(desktop.state)) {
        actions.append(button('Start desktop', registration.id, () => call('start'), true, closed));
      } else if (desktop?.canConnect) {
        if (!saved) {
          // Always available after manual login, even if the desktop's launcher status is stale.
          actions.append(button('Connect account', registration.id, async () => {
            await call('connect', state.automaticActivation ? 'Account connected. Activation is automatic; confirmation appears in Accounts.' : 'Account connected and paused. View it in Accounts.');
            location.hash = 'accounts';
          }, step === 2, closed));
          if (step === 1 && desktop.login?.state !== 'waiting') actions.append(button('Start sign-in', registration.id,
            () => call('signin', 'Sign-in started. Open the desktop to finish, then choose Connect account.'), true, closed || desktop.login?.state === 'starting'));
          row.append(node('p', 'Already signed in? Choose Connect account. GALX will check this desktop and save the connection.', 'hint'));
        }
        actions.append(button('Open desktop', registration.id, () => openDesktop(registration), !saved && step === 1 && desktop.login?.state === 'waiting'));
        const tools = node('details', undefined, 'registration-tools'), summary = node('summary', saved ? 'Reconnect' : 'Sign-in options');
        summary.dataset.action = 'registration-options';
        tools.open = Boolean(reconnect);
        tools.append(summary, node('p', saved ? 'Sign in to the same account in this desktop, then reconnect it. Your account and settings stay in place.' : 'Use this desktop to complete sign-in. Connect here when you are finished.', 'hint'));
        const secondary = node('div', undefined, 'actions');
        secondary.append(button('Start sign-in again', registration.id, () => call('signin', 'Sign-in started. Open the desktop to finish.'), false, closed || desktop.login?.state === 'starting'));
        if (saved) secondary.append(button('Reconnect account', registration.id, () => call('refresh', 'Connection verified. Check Accounts for its current status.'), true, closed));
        secondary.append(button('Stop desktop', registration.id, async () => {
          if (confirm('Stop the desktop for ' + registration.name + '? Any open sign-in will disconnect. Saved account access is retained.')) await call('stop', 'Desktop stopped. Start it again here when needed.');
        }));
        tools.append(secondary); actions.append(tools);
      }
      if (closed) row.append(node('p', 'New connections and sign-in changes are temporarily closed.', 'hint'));
      actions.append(managementActions('registration',registration));
    }
  }
  row.append(actions);
  if (errors.has(registration.id)) {
    const error = node('p', errors.get(registration.id), 'inline-error'); error.setAttribute('role','alert'); row.append(error);
  }
  return row;
}
function renderRegistrations() {
  $('pending').replaceChildren();
  $('completed-rows').replaceChildren();
  const matches = filterRegistrations(state.registrations,$('registration-search').value,$('registration-filter').value,state,connected);
  $('registration-filters').hidden = !state.registrations.length;
  const issues = state.registrations.filter(r => !r.removedAt && registrationHealth(r,state,connected).attention).length;
  $('registration-attention').hidden = !issues;
  $('registration-attention-copy').textContent = issues + (issues === 1 ? ' registration needs attention' : ' registrations need attention');
  $('registration-result-count').textContent = matches.length + ' of ' + state.registrations.filter(r => Boolean(r.removedAt) === ($('registration-filter').value === 'removed')).length + ' connections';
  $('registration-no-results').hidden = !state.registrations.length || matches.length > 0;
  const inProgress = r => r.state !== 'registered' || r.removedAt || $('registration-filter').value !== 'all' || registrationHealth(r,state,connected).attention;
  const pending = matches.filter(inProgress);
  const completed = matches.filter(r => !inProgress(r));
  for (const registration of pending) $('pending').append(registrationRow(registration));
  for (const registration of completed) $('completed-rows').append(registrationRow(registration));
  $('completed').hidden = !completed.length;
  $('completed-label').textContent = 'Connected accounts (' + completed.length + ')';
  if (!state.registrations.length && $('prepare').hidden) {
    const empty = node('div', undefined, 'empty');
    empty.append(node('h3', 'No registrations in progress'),
      node('p', state.role === 'operator' ? 'Register an account when you’re ready. Each account gets its own sign-in desktop.' : 'Registrations started by an operator will appear here.'));
    $('pending').append(empty);
  }
}
function recoveryCandidate() {
  if (!state) return null;
  const registration = state.registrations.find(item => errorMeta.has(item.id) || errors.has(item.id));
  if (registration) return {
    registration,
    account: registration.accountId ? state.accounts.find(item => item.id === registration.accountId) : null,
    detail: errorMeta.get(registration.id) ?? errorDetail()
  };
  const account = state.accounts.find(item => errorMeta.has(item.id) || errors.has(item.id));
  if (account) return { account, detail: errorMeta.get(account.id) ?? errorDetail() };
  if (errorMeta.has('prepare') || errors.has('prepare')) return { detail: errorMeta.get('prepare') ?? errorDetail() };
  return null;
}
function renderRecovery() {
  const panel = $('recovery');
  const candidate = recoveryCandidate();
  panel.hidden = !candidate;
  if (!candidate) return;
  $('recovery-title').textContent = candidate.detail.title;
  $('recovery-message').textContent = candidate.detail.message;
  $('recovery-next').textContent = candidate.detail.next;
  $('recovery-refresh').disabled = !connected || loading || busy.has('recovery-refresh');
  const canOpen = Boolean(candidate.registration || candidate.account);
  $('recovery-open').hidden = !canOpen;
  $('recovery-open').disabled = !connected;
}
function render() {
  const focused = document.activeElement;
  const focusedRecord = focused?.closest('[data-record]')?.dataset.record;
  const focusedAction = focused?.dataset.action;
  const expanded = [...document.querySelectorAll('[data-record] details[open]')].map(d => [d.closest('[data-record]').dataset.record, d.querySelector('summary')?.dataset.action]);
  const operator = state.role === 'operator';
  $('pool').textContent = 'Premium relay';
  $('scope').textContent = 'Paid accounts · Text, sites and images';
  $('role').textContent = operator ? 'Operator access' : 'Read-only access';
  $('new').disabled = !connected || !state.registrationAllowed;
  $('prepare-copy').textContent = 'Use a paid account for this relay. ' + (state.automaticActivation ? 'Connecting verifies access and enables the account automatically. You can pause it in Accounts.' : 'New connections stay paused while execution is paused for this relay.');
  $('prepare').querySelector('[type=submit]').disabled = !connected || !state.registrationAllowed || busy.has('prepare');
  if (!operator) $('prepare').hidden = true;
  $('connection').textContent = connected ? (relayFresh(state) ? 'Connected' : 'Awaiting relay') : navigator.onLine === false ? 'Offline' : refreshRetryTimer ? 'Reconnecting…' : 'Connection interrupted';
  $('connection').className = connected && relayFresh(state) ? 'ok' : 'waiting';
  const execution = executionStatus(state);
  $('execution').textContent = execution.label;
  $('registration').textContent = state.registrationAllowed ? 'Open' : 'Closed';
  $('updated').textContent = connected ? 'Updated ' + lastUpdated.toLocaleTimeString() : lastUpdated ? 'Last confirmed ' + lastUpdated.toLocaleTimeString() : 'No confirmed update yet';
  $('gate-note').hidden = state.executionAllowed;
  $('gate-note').textContent = execution.detail;
  $('account-count').textContent = state.accounts.filter(a => !a.removedAt).length;
  $('registration-count').textContent = state.registrations.filter(r => !r.removedAt && r.state !== 'registered').length || '';
  chooseView();
  renderRecovery();
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed && selection.anchorNode?.parentElement?.closest('#rows,#pending,#completed-rows')) return;
  renderAccounts();
  renderRegistrations();
  $('events').replaceChildren();
  for (const event of state.activity) {
    const account = state.accounts.find(a => a.id === event.accountId);
    const row = node('li'), info = node('div'), time = node('time', date(event.at));
    info.append(node('strong', account?.name ?? event.name ?? 'Registration'), node('span', ({ enabled: 'Enable', paused: 'Pause', revoked: 'Revoke', rename: 'Rename', remove: 'Removal', restore: 'Restore' }[event.command] ?? 'Change') + ' saved', 'muted'));
    if (Number.isFinite(Date.parse(event.at))) time.dateTime = event.at;
    row.append(info, time);
    $('events').append(row);
  }
  if (!state.activity.length) {
    const row = node('li');
    row.append(node('div', 'No account changes yet. Saved changes will appear here.'));
    $('events').append(row);
  }
  for (const [record, action] of expanded) {
    const parent = [...document.querySelectorAll('[data-record]')].find(el => el.dataset.record === record);
    const summary = [...(parent?.querySelectorAll('summary') ?? [])].find(el => el.dataset.action === action);
    if (summary) summary.parentElement.open = true;
  }
  if (focusedRecord && focusedAction) {
    const record = [...document.querySelectorAll('[data-record]')].find(el => el.dataset.record === focusedRecord);
    const replacement = [...(record?.querySelectorAll('[data-action]') ?? [])].find(el => el.dataset.action === focusedAction);
    if (replacement && !replacement.disabled) replacement.focus({ preventScroll: true });
    else if (!document.activeElement || document.activeElement === document.body) $('page-title').focus({ preventScroll: true });
  }
}
async function refresh() {
  if (refreshPromise) return refreshPromise;
  const work = (async () => {
    const wasConnected = connected;
    loading = true;
    $('refresh').disabled = true;
    $('main').setAttribute('aria-busy', 'true');
    try {
      const next = await api('/api/status');
      for (const registration of next.registrations) {
        const previous = state?.registrations.find(r => r.id === registration.id);
        const account = next.accounts.find(a => a.id === registration.accountId);
        const oldAccount = state?.accounts.find(a => a.id === registration.accountId);
        const connectedNow = registration.state === 'registered' && previous?.state !== 'registered';
        const refreshedNow = account?.connectionState === 'connected' && account.connectionCheckedAt && account.connectionCheckedAt !== oldAccount?.connectionCheckedAt;
        if (errors.has(registration.id) && (connectedNow || refreshedNow)) {
          errors.delete(registration.id);
          errorMeta.delete(registration.id);
          notice(connectedNow ? 'Account connected. View its current state in Accounts.' : 'Connection verified. The latest sign-in is saved.');
        }
        const intent = recalled(connectionIntentKey(registration.id));
        if (intent && ((intent.action === 'connect' && registration.state === 'registered') || (intent.action === 'refresh' && refreshedNow))) remember(connectionIntentKey(registration.id), null);
      }
      state = next;
      connected = true;
      lastUpdated = new Date();
      refreshRetryAttempt = 0;
      clearRefreshRetry();
      if (wasConnected === false && state && noticeKind === 'connection') notice('Relay reconnected. The latest status is confirmed.');
      else if (noticeKind === 'connection') notice('');
      render();
      // Let the refresh promise settle before the read-only reconciliation starts;
      // otherwise reconciliation would await this same in-flight refresh.
      if (!wasConnected) setTimeout(() => void recoverPendingConnections(), 0);
    } catch (error) {
      connected = false;
      scheduleRefreshRetry();
      if (state) render();
      else {
        $('connection').textContent = navigator.onLine === false ? 'Offline' : refreshRetryTimer ? 'Reconnecting…' : 'Connection interrupted';
        $('updated').textContent = 'No confirmed update yet';
      }
      document.querySelectorAll('#rows button,#pending button,#completed-rows button,#new,#first-account,#prepare [type=submit]').forEach(el => { el.disabled = true; });
      notice(navigator.onLine === false ? 'You’re offline. Showing the last confirmed state.' : error.message, 'connection');
    } finally {
      loading = false;
      $('refresh').disabled = false;
      $('main').removeAttribute('aria-busy');
    }
  })();
  refreshPromise = work;
  try { return await work; } finally { if (refreshPromise === work) refreshPromise = null; }
}

function healthBadge(condition) {
  const label = node('span', condition.label, 'health-label ' + (condition.attention ? 'waiting' : condition.code === 'ok' ? 'ok' : 'muted'));
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 20 20'); icon.setAttribute('aria-hidden', 'true');
  const shape = document.createElementNS(icon.namespaceURI, 'path');
  shape.setAttribute('d', condition.attention ? 'M10 2 19 18H1Z M10 7v5 M10 15h.01' :
    condition.code === 'ok' ? 'M6 10l3 3 5-6 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0' :
    'M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0 M10 6v5 M10 14h.01');
  icon.append(shape); label.prepend(icon); return label;
}
let management, managing = false;
function openManagement(kind, record, command) {
  const linked = kind === 'registration' && record.accountId ? state.accounts.find(a => a.id === record.accountId) : null;
  if (linked) { kind = 'account'; record = linked; }
  management = { kind, record: { ...record }, command };
  const label = kind === 'account' ? 'account' : 'registration';
  const rename = command === 'rename', remove = command === 'remove';
  $('manage-title').textContent = (rename ? 'Rename ' : remove ? 'Remove ' : 'Restore ') + label;
  $('manage-description').textContent = rename ? 'Change the name of “' + record.name + '”. Sign-in and access stay the same.' :
    remove ? (kind === 'account' ? 'Remove “' + record.name + '”? Its access will be revoked and it cannot be enabled again. Its registration moves to Removed and its desktop will stop. History and desktop files are retained.' :
      'Remove “' + record.name + '” from active registrations? Its desktop will stop and any pending review is cancelled. History and desktop files are retained. You can restore this unfinished registration later.') :
      'Restore “' + record.name + '” to active registrations. You will review its sign-in again before registering.';
  $('manage-name-field').hidden = !rename;
  $('manage-name').required = rename;
  $('manage-name').value = record.name;
  $('manage-submit').textContent = rename ? 'Save name' : remove ? 'Remove ' + label : 'Restore registration';
  $('manage-submit').className = remove ? 'danger' : '';
  $('manage-submit').disabled = false;
  $('manage-cancel').disabled = false;
  $('manage-error').hidden = true;
  $('manage-name').setAttribute('aria-invalid', 'false');
  $('manage-dialog').setAttribute('role', remove ? 'alertdialog' : 'dialog');
  $('manage-dialog').showModal();
  (rename ? $('manage-name') : $('manage-cancel')).focus();
  if (rename) $('manage-name').select();
}
function finishManagement() {
  if (managing) return;
  $('manage-dialog').close();
  const record = [...document.querySelectorAll('[data-record]')].find(el => el.dataset.record === management?.record.id);
  const target = record?.querySelector('summary,button') ?? $('page-title');
  target.focus({ preventScroll: true });
  management = null;
}
$('manage-cancel').onclick = finishManagement;
$('manage-dialog').addEventListener('cancel', event => { event.preventDefault(); finishManagement(); });
$('manage-form').onsubmit = async event => {
  event.preventDefault();
  if (!management || managing || !connected) return;
  const { kind, record, command } = management;
  const name = $('manage-name').value.trim();
  if (command === 'rename' && (!name || /[\u0000-\u001f\u007f]/.test(name))) {
    $('manage-name').setAttribute('aria-invalid', 'true');
    $('manage-error').textContent = 'Enter a name of 1–64 characters without control characters.';
    $('manage-error').hidden = false; $('manage-name').focus(); return;
  }
  const request = { [kind === 'account' ? 'accountId' : 'registrationId']: record.id, expectedRevision: record.revision, command,
    ...(command === 'rename' ? { name } : {}) };
  let intent = recalled('management-intent');
  const fingerprint = JSON.stringify(request);
  if (!intent || intent.fingerprint !== fingerprint) intent = { fingerprint, body: { id: crypto.randomUUID(), ...request } };
  remember('management-intent', intent);
  managing = true; busy.add(record.id);
  $('manage-submit').disabled = true; $('manage-cancel').disabled = true;
  $('manage-error').hidden = true;
  try {
    const saved = await api(kind === 'account' ? '/api/accounts/action' : '/api/registrations/manage', intent.body);
    remember('management-intent', null);
    notice(command === 'rename' ? 'Name updated.' : command === 'restore' ? 'Registration restored. Review its sign-in to continue.' :
      saved.desktopStopped === false ? 'Removed. The desktop could not stop. In Registration, filter by Removed and choose Stop desktop.' :
      kind === 'account' ? 'Account removed and access revoked. Its history is available under Removed.' : 'Registration removed. You can restore it from Removed.');
    managing = false; busy.delete(record.id);
    await refresh();
    finishManagement();
  } catch (error) {
    if (command === 'rename') $('manage-name').setAttribute('aria-invalid', 'true');
    $('manage-error').textContent = error.message;
    $('manage-error').hidden = false;
    managing = false; busy.delete(record.id);
    await refresh();
  } finally {
    managing = false; busy.delete(record.id);
    $('manage-submit').disabled = !connected;
    $('manage-cancel').disabled = false;
  }
};
function managementActions(kind, record) {
  const details = node('details', undefined, 'record-menu'), summary = node('summary', 'Manage');
  summary.dataset.action = 'Manage';
  details.append(summary);
  const linked = kind === 'registration' && record.accountId ? state.accounts.find(a => a.id === record.accountId) : record;
  if (!record.removedAt && linked?.state !== 'revoked') details.append(button('Rename', record.id, () => openManagement(kind, record, 'rename')));
  if (!record.removedAt) {
    const remove = button('Remove ' + (kind === 'account' || record.accountId ? 'account' : 'registration'), record.id, () => openManagement(kind, record, 'remove'));
    remove.classList.add('danger-quiet'); details.append(remove);
  } else if (kind === 'registration' && !record.accountId) {
    details.append(button('Restore registration', record.id, () => openManagement(kind, record, 'restore'), false, !state.registrationAllowed));
  }
  return details;
}

$('recovery-refresh').onclick = async () => {
  if (busy.has('recovery-refresh') || !connected) return;
  busy.add('recovery-refresh');
  renderRecovery();
  try { await refresh(); }
  finally { busy.delete('recovery-refresh'); renderRecovery(); }
};
$('recovery-open').onclick = () => {
  const candidate = recoveryCandidate();
  if (!candidate) return;
  if (candidate.account) { goToRegistration(candidate.account.id); return; }
  location.hash = 'registrations';
  chooseView(true);
  $('registration-search').value = '';
  $('registration-filter').value = 'all';
  renderRegistrations();
  const row = candidate.registration && [...document.querySelectorAll('[data-record]')].find(el => el.dataset.record === candidate.registration.id);
  row?.scrollIntoView({ block: 'center', behavior: 'instant' });
  row?.querySelector('button,summary')?.focus({ preventScroll: true });
};
$('new').onclick = startDraft;
$('first-account').onclick = startDraft;
$('cancel').onclick = () => { $('prepare').hidden = true; renderRegistrations(); $('new').focus(); };
$('search').addEventListener('input', () => { if (state) renderAccounts(); });
$('filter').addEventListener('change', () => { if (state) renderAccounts(); });
$('clear-filters').onclick = () => { $('search').value = ''; $('filter').value = 'all'; $('health-filter').value = 'all'; renderAccounts(); $('search').focus(); };
$('health-filter').onchange = $('sort').onchange = () => { if(state)renderAccounts(); };
$('show-account-issues').onclick = () => { $('filter').value='all'; $('health-filter').value='attention'; $('search').value=''; renderAccounts(); $('health-filter').focus(); };
$('registration-search').oninput = $('registration-filter').onchange = () => { if(state)renderRegistrations(); };
$('clear-registration-filters').onclick = () => { $('registration-search').value=''; $('registration-filter').value='all'; renderRegistrations(); $('registration-search').focus(); };
$('show-registration-issues').onclick = () => { $('registration-search').value=''; $('registration-filter').value='attention'; renderRegistrations(); $('registration-filter').focus(); };
$('prepare').onsubmit = event => {
  event.preventDefault();
  const name = $('name').value.trim();
  if (!name || busy.has('prepare')) return;
  draft = recalled('registration-intent');
  if (!draft || draft.name !== name) draft = { id: crypto.randomUUID(), desktopId: crypto.randomUUID(), name };
  remember('registration-intent', draft);
  void run('prepare', async () => {
    $('prepare').querySelector('[type=submit]').disabled = true;
    await api('/api/registrations/prepare', draft);
    remember('registration-intent', null);
    $('prepare').hidden = true;
    $('name').value = '';
    notice('Desktop created. Continue with the sign-in step below.');
    $('page-title').focus();
  });
};
$('refresh').onclick = () => void refresh();
$('logout').onclick = async () => {
  $('logout').disabled = true;
  try { await api('/session', undefined, 'DELETE'); location.replace('/?reason=signed-out'); }
  catch (error) { notice(error.message); $('logout').disabled = false; }
};
window.addEventListener('online', () => { refreshRetryAttempt = 0; notice('Back online. Checking the relay…', 'connection'); void refresh(); schedulePoll(); });
window.addEventListener('offline', () => {
  clearPollTimer(); clearRefreshRetry();
  connected = false;
  if (state) render();
  notice('You’re offline. Showing the last confirmed state.', 'connection');
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { clearPollTimer(); clearRefreshRetry(); }
  else { void refresh(); schedulePoll(); }
});
window.addEventListener('focus', () => { if (!document.hidden) { void refresh(); schedulePoll(); } });
window.addEventListener('hashchange', () => {
  chooseView(!preserveViewFocus);
  preserveViewFocus = false;
});
chooseView();
void (window.monitorConnection ?? Promise.resolve(true)).then(ready => {
  if (!ready) return;
  void refresh();
  schedulePoll();
});
