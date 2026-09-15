// Shared bootstrap also consumes fresh tickets when a previous session exists.
async function connectMonitor() {
  const parameters = new URLSearchParams(location.hash.slice(1));
  const ticket = parameters.get('ticket'), role = parameters.get('role');
  const reason = new URLSearchParams(location.search).get('reason');
  const status = document.querySelector('#status'), heading = document.querySelector('#heading');
  const launcher = document.querySelector('#launcher');
  const hasTicket = parameters.has('ticket');
  if (hasTicket || reason) history.replaceState(null, '', location.pathname);
  const recover = message => {
    if (!status) { location.replace('/'); return; }
    heading.textContent = 'Reconnect to your monitor'; status.textContent = message;
    launcher.removeAttribute('aria-disabled');
  };
  if (!hasTicket) {
    if (reason === 'expired') recover('Your session ended. Open the monitor again to reconnect. Your saved accounts are unchanged.');
    if (reason === 'signed-out' && status) { heading.textContent = 'You’re signed out'; status.textContent = 'Open the app when you’re ready to return. Your accounts stay saved.'; }
    return true;
  }
  if (!/^[a-f0-9]{64}$/.test(ticket ?? '') || !['operator', 'viewer'].includes(role)) {
    recover('This sign-in link is invalid. Open a fresh connection from the app.'); return false;
  }
  if (status) { heading.textContent = 'Connecting…'; status.textContent = 'Opening your monitor securely.'; launcher.setAttribute('aria-disabled', 'true'); }
  try {
    const response = await fetch('/session', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket, role }) });
    if (!response.ok) throw Error();
    location.replace('/'); return false;
  } catch { recover('This connection could not be completed. Open the monitor again for a fresh sign-in link.'); return false; }
}
window.monitorConnection = connectMonitor();
window.addEventListener('hashchange', () => { window.monitorConnection = connectMonitor(); });
