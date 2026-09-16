// Presentation only; authorization and account classification remain server-owned.
export function relayFresh(state, now = Date.now()) {
  const age = now - Date.parse(state.lastSeenAt);
  return Number.isFinite(age) && age >= 0 && age < 45000;
}
export function accountApplied(account, state, now = Date.now()) {
  return relayFresh(state, now) && account.acknowledgedRevision === account.revision && account.acknowledgedEpoch === state.epoch;
}
export function needsSignIn(account, now = Date.now()) {
  return account.connectionState === 'sign_in_required' || !(Number(account.credentialExpiresAt) > now);
}
export function executionStatus(state, now = Date.now()) {
  if (state.executionAllowed) return { label: 'Allowed', detail: '' };
  if (!state.automaticActivation) return { label: 'Paused', detail: 'Execution is paused for this relay. An operator must resume it before accounts can serve requests.' };
  const accounts = (state.accounts ?? []).filter(a => !a.removedAt && a.state !== 'revoked');
  if (!accounts.length) return { label: 'Waiting for account', detail: 'Connect an account. Execution starts automatically after access is verified and the relay is ready.' };
  if (!accounts.some(a => !needsSignIn(a, now))) return { label: 'Reconnect required', detail: 'Reconnect an account to restore access. Activation continues automatically after verification.' };
  if (!accounts.some(a => a.state === 'enabled' && !needsSignIn(a, now))) return { label: 'Accounts paused', detail: 'Accounts are paused. Enable one in Accounts when you want it to serve requests.' };
  if (!relayFresh(state, now)) return { label: 'Waiting for relay', detail: 'Your account is saved. Activation continues automatically when the relay reconnects.' };
  return { label: 'Activating', detail: 'Your account is saved. The relay is checking readiness automatically. Refresh if this status does not update.' };
}
export function registrationStep(registration, desktop) {
  if (registration.state === 'registered') return 3;
  if (registration.state === 'reviewed') return 2;
  return desktop?.login?.state === 'saved' ? 2 : 1;
}

const health = (code, label, detail, attention = false, rank = 5) => ({ code, label, detail, attention, rank });
export function accountHealth(account, state, connected = true, now = Date.now()) {
  if (account.removedAt) return health('removed', 'Removed', 'Access revoked. History retained.', false, 9);
  if (account.state === 'revoked') return health('revoked', 'Revoked', 'This account can no longer be enabled.', false, 8);
  if (!connected) return health('unknown', 'Status unavailable', 'Reconnect to check the current account health.', false, 3);
  if (needsSignIn(account, now)) return health('signin', 'Reconnect required', account.connectionState === 'sign_in_required' ? 'The saved sign-in was rejected. Reconnect this account to restore access.' : 'The saved sign-in has expired. Reconnect this account to restore access.', true, 0);
  if (account.healthSignal === 'unavailable') return health('failures', 'Access unavailable', 'The account reported unavailable access. Review its sign-in.', true, 0);
  if (Number(account.cooldownUntilMs) > now || account.healthSignal === 'cooldown') return health('cooldown', 'Cooling down', Number(account.cooldownUntilMs) > now ? 'Requests are paused until ' + new Date(Number(account.cooldownUntilMs)).toLocaleString() + '.' : 'The account reported a temporary limit. Refresh before enabling it.', true, 1);
  if (Number(account.consecutiveFailures) >= 3) return health('failures', 'Repeated failures', account.consecutiveFailures + ' consecutive failures reported. Review the account before enabling it.', true, 1);
  if (!relayFresh(state, now)) return health('unknown', 'Awaiting relay', 'Account confirmation is unavailable until the relay reconnects.', false, 3);
  if (state.executionAllowed && !accountApplied(account, state, now)) {
    const elapsed = now - Date.parse(account.updatedAt);
    const overdue = Number.isFinite(elapsed) && elapsed >= 90000;
    return health('confirmation', overdue ? 'Update not confirmed' : 'Applying change', overdue ? 'The saved change has not been confirmed for over 90 seconds. Refresh or inspect the relay.' : 'The change is saved. Waiting for the relay to apply it.', overdue, overdue ? 2 : 4);
  }
  return health('ok', 'No issues detected', account.state === 'paused' ? 'Sign-in is current. The account is intentionally paused.' : 'Sign-in and the latest account state are current.', false, 6);
}
export function registrationHealth(registration, state, connected = true, now = Date.now()) {
  const desktop = state.desktops?.find(d => d.id === registration.desktopId);
  if (registration.removedAt) {
    if (connected && desktop && ['running', 'unhealthy', 'starting', 'creating'].includes(desktop.state)) return health('cleanup', 'Desktop still running', 'Removal is saved. Stop the desktop to finish cleanup.', true, 0);
    return health('removed', 'Removed', 'History and desktop files are retained.', false, 9);
  }
  if (!connected) return health('unknown', 'Status unavailable', 'Reconnect to check registration health.', false, 3);
  const account = state.accounts?.find(a => a.id === registration.accountId);
  if (account) return accountHealth(account, state, connected, now);
  if (!state.desktopAvailable || desktop?.state === 'unknown') return health('unknown', 'Desktop unavailable', 'Restore the desktop service, then refresh.', false, 3);
  if (!desktop || ['stopped', 'missing', 'error', 'unhealthy'].includes(desktop.state)) return health('desktop', !desktop ? 'Desktop needed' : desktop.state === 'stopped' ? 'Desktop stopped' : 'Desktop needs attention', 'Create or start this registration’s desktop to continue.', true, 1);
  if (['failed', 'expired', 'cancelled'].includes(desktop.login?.state)) return health('signin', 'Sign-in incomplete', 'Start a new sign-in, then connect this account.', true, 0);
  if (!desktop.canConnect) return health('progress', 'Starting desktop', 'The desktop is getting ready. This page updates automatically.', false, 4);
  if (registration.state === 'reviewed' || desktop.login?.state === 'saved') return health('reviewed', 'Ready to connect', 'Sign-in is saved. Connect to verify access and save the account.', false, 4);
  return health('progress', desktop.login?.state === 'waiting' ? 'Waiting for sign-in' : 'Sign-in needed', 'Complete manual sign-in, then connect this account.', false, 5);
}
export function filterAccounts(accounts, query, filter, now = Date.now(), options = {}) {
  const needle = query.trim().toLocaleLowerCase();
  const result = accounts.filter(account => {
    if (!!account.removedAt !== (filter === 'removed')) return false;
    const condition = accountHealth(account, options.state ?? {}, options.connected ?? true, now);
    return account.name.toLocaleLowerCase().includes(needle) &&
      (filter === 'all' || filter === 'removed' || (filter === 'attention' ? account.state !== 'revoked' && needsSignIn(account, now) : account.state === filter)) &&
      (!options.health || options.health === 'all' || (options.health === 'attention' ? condition.attention : condition.code === options.health));
  });
  return result.sort((a, b) => options.sort === 'name' ? a.name.localeCompare(b.name) :
    accountHealth(a, options.state ?? {}, options.connected ?? true, now).rank - accountHealth(b, options.state ?? {}, options.connected ?? true, now).rank || a.name.localeCompare(b.name));
}
export function filterRegistrations(registrations, query, filter, state, connected = true, now = Date.now()) {
  const needle = query.trim().toLocaleLowerCase();
  return registrations.filter(registration => {
    if (!!registration.removedAt !== (filter === 'removed')) return false;
    const condition = registrationHealth(registration, state, connected, now);
    return registration.name.toLocaleLowerCase().includes(needle) && (filter === 'all' || filter === 'removed' ||
      (filter === 'attention' ? condition.attention : filter === 'registered' ? registration.state === 'registered' :
        filter === 'progress' ? registration.state !== 'registered' : filter === 'unknown' ? condition.code === 'unknown' : condition.code === filter));
  }).sort((a,b) => registrationHealth(a,state,connected,now).rank - registrationHealth(b,state,connected,now).rank || a.name.localeCompare(b.name));
}
