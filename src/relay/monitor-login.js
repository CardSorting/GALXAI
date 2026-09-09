'use strict';
const status = document.getElementById('status');
document.getElementById('copy').onclick = async () => {
  try { await navigator.clipboard.writeText('npm run relay:open'); status.textContent = 'Command copied. Paste it into your terminal in the GALX project.'; }
  catch { status.textContent = 'Select and copy the command above, then run it in your GALX project.'; }
};
let signingIn = false;
async function signIn() {
  const ticket = new URLSearchParams(location.hash.slice(1)).get('login');
  history.replaceState(null, '', location.pathname);
  if (!ticket || signingIn) return;
  signingIn = true;
  status.textContent = 'Signing you in…';
  try {
    const response = await fetch('/api/monitor/session', { method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket }), signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!response.ok) throw new Error('This sign-in link expired or was already used. Run the command above to open a new window.');
    location.replace('/federation');
  } catch (error) { status.textContent = error instanceof Error ? error.message : 'Could not connect. Run the command above to try again.'; signingIn = false; }
}
window.addEventListener('hashchange', () => { void signIn(); });
void signIn();
