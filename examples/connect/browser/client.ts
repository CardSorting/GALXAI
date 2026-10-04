import { GalxConnection } from '../../../src/sdk/connect';
declare const CONNECT_CONFIGURATION: { issuer: string; resource: string; clientId: string };
const connection = new GalxConnection({ ...CONNECT_CONFIGURATION, redirectUri: `${location.origin}/callback`, pendingStorage: sessionStorage });
const button = (id: string) => document.getElementById(id) as HTMLButtonElement;
const status = document.getElementById('status')!, result = document.getElementById('result')!, prompt = document.getElementById('prompt') as HTMLTextAreaElement;
(document.getElementById('manage') as HTMLAnchorElement).href = `${CONNECT_CONFIGURATION.issuer}/connect`;
prompt.value = sessionStorage.getItem('reference-draft') || '';
let task: AbortController | null = null;
function ready() { button('invoke').disabled = !connection.connected || !!task; button('disconnect').disabled = !connection.connected; button('connect').disabled = !!task; button('stop').disabled = !task; }
if (location.pathname === '/callback') {
  const callback = location.href; history.replaceState(null, '', '/');
  try { await connection.connect(callback); status.textContent = 'Connected. Your application is ready.'; }
  catch { status.textContent = 'Connection was not completed. Start again.'; }
  ready();
}
button('connect').onclick = async () => { sessionStorage.setItem('reference-draft', prompt.value); location.assign((await connection.connect())!); };
button('disconnect').onclick = async () => {
  try { await connection.disconnect(); status.textContent = 'Disconnected. Your account access has not changed.'; }
  catch { status.textContent = 'Disconnection is unconfirmed. Try again or use Manage connections.'; }
  ready();
};
button('stop').onclick = () => task?.abort();
document.querySelector('form')!.onsubmit = async event => {
  event.preventDefault(); if (task) return;
  task = new AbortController(); ready(); result.textContent = ''; status.textContent = 'Working…';
  try {
    const response = await connection.invoke([{ role: 'user', content: prompt.value }], { signal: task.signal });
    const data = await response.json();
    if (response.ok) { result.textContent = data.choices[0].message.content; status.textContent = 'Complete.'; }
    else status.textContent = data.error?.message || 'The request could not complete.';
  } catch { status.textContent = 'The outcome is unconfirmed. Work may have started; this task was not retried.'; }
  finally { task = null; ready(); }
};
