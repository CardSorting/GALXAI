import { DesktopActivityView } from '/desktops/assets/activity.js';
import RFB from '/desktops/assets/novnc/core/rfb.js';
import keysyms from '/desktops/assets/novnc/core/input/keysymdef.js';
const $ = id => document.getElementById(id);
$('commands').querySelector('kbd').textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';
const pendingActions = new Map(), workspaceErrors = new Map();
let librarySignature = '', selectionEpoch = 0, dismissedNotice = '';
let snapshot, selected, rfb, displayId, connected = false, suspended = false, refreshing, creating = false, retryTimer, retries = 0, createIntent, failure = '';
const labels = { running: 'Running', starting: 'Starting', creating: 'Creating', stopped: 'Stopped', stopping: 'Stopping', deleting: 'Deleting', error: 'Needs attention', missing: 'Not created', unknown: 'Status unknown', queued: 'Queued', unhealthy: 'Needs restart' };
const selection = new URLSearchParams(location.hash.slice(1)).get('desktop');
const requestedShard = new URLSearchParams(location.hash.slice(1)).get('shard');
let initialShard = /^[\w.:-]{1,128}$/.test(requestedShard || '') ? requestedShard : undefined;
if (/^[a-f0-9-]{36}$/.test(selection || '')) selected = selection;
if (location.hash.includes('login=')) history.replaceState(null, '', location.pathname);
window.addEventListener('hashchange', () => {
  if (location.hash.includes('login=')) { history.replaceState(null, '', location.pathname); return; }
  const fragment = new URLSearchParams(location.hash.slice(1)), id = fragment.get('desktop'), shard = fragment.get('shard');
  if (/^[a-f0-9-]{36}$/.test(id || '')) { if (snapshot) choose(id); else selected = id; }
  else if (/^[\w.:-]{1,128}$/.test(shard || '')) { initialShard = shard; void refresh(); }
});
const n = (tag, value, className) => { const el = document.createElement(tag); if (value !== undefined) el.textContent = value; if (className) el.className = className; return el; };
const current = () => snapshot?.desktops.find(d => d.id === selected);
function tell(message) { if ($('announce').textContent !== message) $('announce').textContent = message; }
function notice(message) { $('notice').hidden = !message || message === dismissedNotice; if ($('notice-text').textContent !== message) $('notice-text').textContent = message; }
async function api(route, body) {
  const response = await fetch('/api/desktops/' + route, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), signal: AbortSignal.timeout(body === undefined ? 15000 : 65000) });
  if (response.status === 401 || response.status === 403) { disconnect(); location.replace('/desktops'); throw Error('Your desktop session ended. Open the host launcher to reconnect.'); }
  let result; try { result = await response.json(); } catch { throw Error('The controller returned an incomplete response. Refresh to check the operation.'); }
  if (!response.ok) throw Object.assign(Error(result.error?.message || 'The desktop operation could not finish. Refresh and retry.'), { code: result.error?.code });
  return result;
}
function disconnect() {
  hideKeyboard();
  clearTimeout(retryTimer); retryTimer = undefined;
  const previous = rfb; rfb = undefined; displayId = undefined; connected = false;
  previous?.disconnect(); $('screen').replaceChildren(); $('screen').hidden = true; $('connection-bar').hidden = true;
  $('clipboard-text').value = ''; $('clipboard-panel').hidden = true; $('clipboard').setAttribute('aria-expanded', 'false');
}
function choose(id) {
  if (selected !== id) { disconnect(); retries = 0; suspended = false; }
  dismissedNotice = ''; selectionEpoch++; selected = id; history.replaceState(null, '', location.pathname + '#desktop=' + id);
  document.body.classList.remove('sidebar-open'); $('sidebar-toggle').setAttribute('aria-expanded', 'false'); render();
}
function showCreate() { document.body.classList.remove('zen'); $('zen').setAttribute('aria-pressed', 'false'); $('zen').textContent = 'Zen view'; $('create-panel').hidden = false; $('desktop-name').focus(); document.body.classList.remove('sidebar-open'); $('sidebar-toggle').setAttribute('aria-expanded', 'false'); }
function status(message) { $('connection').textContent = message; }
function connect() {
  const desktop = current(); if (!desktop?.canConnect || suspended || rfb || retryTimer) return;
  displayId = desktop.id; const id = displayId;
  $('empty').hidden = true; $('screen').hidden = false; $('connection-bar').hidden = false;
  status('Connecting to desktop…');
  try {
    const client = new RFB($('screen'), `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/desktops/${id}/display`, { shared: true });
    rfb = client; client.scaleViewport = $('fit').getAttribute('aria-pressed') === 'true'; client.resizeSession = false; client.background = '#050610'; client.qualityLevel = 7; client.compressionLevel = 3;
    client.addEventListener('connect', () => { if (rfb !== client) return; connected = true; retries = 0; status('Connected · mouse and keyboard active'); tell('Connected to ' + desktop.name); renderControls(); });
    client.addEventListener('credentialsrequired', () => { failure = 'This desktop requested unexpected display credentials. Restart its display service from the host.'; client.disconnect(); });
    client.addEventListener('securityfailure', () => { failure = 'The display handshake failed. Refresh the workspace state before reconnecting.'; });
    client.addEventListener('disconnect', () => {
      if (rfb !== client) return; rfb = undefined; connected = false; displayId = undefined; $('screen').replaceChildren();
      if (!suspended && current()?.id === id && current()?.canConnect && retries < 5) {
        const delay = Math.min(10000, 1000 * 2 ** retries++); status(`Display interrupted · reconnecting in ${delay / 1000} s`);
        retryTimer = setTimeout(() => { retryTimer = undefined; void refresh().then(connect); }, delay);
      } else { suspended = true; render(); }
      renderControls();
    });
  } catch { rfb = undefined; displayId = undefined; suspended = true; failure = 'The display could not start. Use Reconnect to try again.'; render(); }
}
function renderLibrary() {
  const signature = JSON.stringify([snapshot.desktops.map(d => [d.id, d.name, d.relayId, d.state, d.credentialSync?.state === 'error']), [...pendingActions.keys()], snapshot.runningCount, snapshot.reservedCount, selected, $('search').value, snapshot.relays.map(r => [r.id, r.name, r.health, r.paused])]);
  if (signature === librarySignature) return; librarySignature = signature;
  const query = $('search').value.toLowerCase().trim(), focused = document.activeElement?.dataset.desktop;
  const items = snapshot.desktops.filter(d => [d.name, d.relayId || ''].some(v => v.toLowerCase().includes(query)));
  $('workspace-list').replaceChildren(...items.map(d => {
    const b = n('button', undefined, 'workspace-item'); b.type = 'button'; b.dataset.desktop = d.id; b.setAttribute('aria-pressed', String(d.id === selected));
    const icon = n('span', undefined, 'icon'); icon.setAttribute('aria-hidden', 'true');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.6');
    const rect = document.createElementNS(svg.namespaceURI, 'rect'); for (const [key, value] of Object.entries({ x: 2, y: 3, width: 20, height: 14, rx: 2 })) rect.setAttribute(key, String(value));
    const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', 'M8 22h8M12 17v5'); svg.append(rect, path); icon.append(svg);
    const linked = snapshot.relays.find(r => r.id === d.relayId);
    const meta = n('small'); meta.append(n('span', pendingActions.has(d.id) ? 'Working…' : labels[d.state] || 'Unknown', d.state));
    if (d.relayId) meta.append(n('span', ` · ${linked?.paused ? 'Work paused' : healthLabels[linked?.health] || 'Shard unknown'}`, linked?.paused ? 'unknown' : linked?.health === 'healthy' ? 'running' : linked?.health === 'rejected' ? 'error' : 'unknown'));
    if (d.credentialSync?.state === 'error') meta.append(n('span', ' · Sign-in needs attention', 'error'));
    const text = n('span', undefined, 'text'); text.append(n('strong', d.name), meta); b.append(icon, text); b.onclick = () => choose(d.id); return b;
  }));
  if (!items.length) $('workspace-list').append(n('p', query ? 'No matching workspaces.' : 'No desktops yet. Create one to begin.', 'muted'));
  if (focused) [...$('workspace-list').querySelectorAll('button')].find(b => b.dataset.desktop === focused)?.focus({ preventScroll: true });
  $('capacity').textContent = `${snapshot.runningCount} of ${snapshot.maxRunning} running · ${snapshot.desktops.length} of ${snapshot.maxDesktops} saved`;
  const link = $('relay-link'), selectedRelay = link.value;
  const options = [{ id: '', name: 'Unlinked workspace' }, ...snapshot.relays.map(r => ({ id: r.id, name: `${r.id} · ${r.paused ? 'Work paused' : healthLabels[r.health] || 'Unknown'}` }))];
  if (link.dataset.options !== JSON.stringify(options)) { link.replaceChildren(...options.map(r => { const o = n('option', r.name); o.value = r.id; return o; })); link.dataset.options = JSON.stringify(options); if (options.some(r => r.id === selectedRelay)) link.value = selectedRelay; }
}
function renderControls() {
  const d = current(), acting = !!d && pendingActions.has(d.id), busy = !!d?.operation || !!d?.ioBusy || acting || !!d && ['starting', 'creating', 'stopping', 'deleting', 'queued'].includes(d.state);
  $('toolstrip').hidden = !d?.canConnect; $('desktop-state').hidden = !d;
  $('stop-desktop').hidden = !d || !['running', 'starting', 'unhealthy'].includes(d.state); $('stop-desktop').disabled = busy || !!d?.credentialSync?.busy || !snapshot?.inventoryFresh;
  $('start-desktop').hidden = !d || !['stopped', 'error', 'missing'].includes(d.state); $('start-desktop').disabled = busy || !snapshot?.available;
  $('delete-desktop').hidden = !d; $('delete-desktop').disabled = busy || !!d?.credentialSync?.busy || !snapshot?.inventoryFresh;
  for (const id of ['launch-terminal', 'launch-chrome', 'keyboard', 'clipboard', 'fit', 'fullscreen']) $(id).disabled = !connected || acting || id.startsWith('launch-') && !!d?.busyApps?.includes(id.slice(7));
  $('create-submit').disabled = creating || !snapshot?.available || snapshot.runningCount + (snapshot.reservedCount || 0) >= snapshot.maxRunning || snapshot.desktops.length >= snapshot.maxDesktops;
  $('new-desktop').disabled = creating; $('empty-action').disabled = acting || !!d?.operation;
  $('create-capacity').textContent = snapshot?.desktops.length >= snapshot?.maxDesktops ? 'Saved workspace limit reached. Delete an unused desktop to make room.' : snapshot?.runningCount + (snapshot?.reservedCount || 0) >= snapshot?.maxRunning ? 'All running slots are occupied or reserved. Stop a workspace to free a slot; saved files remain.' : 'Starts in the background. You can keep working in another desktop.';
  $('activity-toggle').textContent = snapshot?.activeOperations || snapshot?.queuedOperations ? `Activity · ${snapshot.activeOperations || 0} running${snapshot.queuedOperations ? ` · ${snapshot.queuedOperations} queued` : ''}` : 'Activity';
  $('zen').disabled = !d;
}
function render() {
  if (!snapshot) return;
  renderLibrary(); const d = current(); renderControls(); renderActivity(); renderRelationship();
  $('zen-workspace').textContent = d?.name || 'Relay Desktops';
  const issues = [failure, workspaceErrors.get(selected)];
  if (!snapshot.journalHealthy) issues.push('Desktop records could not be read. Restore the local desktop journal on the host before making changes.');
  if (!snapshot.imageReady) issues.push('The desktop image is not installed. Run npm run relay:desktops:build on the host, then refresh.');
  if (!snapshot.inventoryFresh) issues.push('Docker status is unconfirmed. Retained workspace names do not prove the desktops are running.');
  if (d?.error && !workspaceErrors.has(selected)) issues.push('The last operation did not finish. The workspace record is retained; refresh and retry.');
  notice(issues.filter(Boolean).join(' '));
  if (d) {
    $('desktop-title').textContent = d.name; $('desktop-subtitle').textContent = 'Independent setup environment · persistent files and Chrome profile';
    $('desktop-state').textContent = labels[d.state] || d.state; $('desktop-state').className = `badge ${d.state}`;
    if (!snapshot.inventoryFresh && connected && displayId === d.id) { status('Display connected · workspace status delayed'); return; }
    if (!d.canConnect) { if (rfb) disconnect(); $('empty').hidden = false; $('screen').hidden = true; $('connection-bar').hidden = true;
      $('empty-title').textContent = d.state === 'queued' ? 'Waiting for an operation slot' : d.state === 'unhealthy' ? 'The desktop needs a restart' : ['starting', 'creating'].includes(d.state) ? 'Starting your desktop…' : d.state === 'stopped' ? 'Your desktop is stopped' : d.state === 'unknown' ? 'Desktop status is unconfirmed' : 'Desktop needs attention';
      $('empty-message').textContent = d.state === 'queued' ? 'Other desktop operations are finishing. This task will start automatically; you can use another workspace.' : d.state === 'unhealthy' ? 'The display health check failed. Stop this desktop, then start it again. Saved files will remain.' : ['starting', 'creating'].includes(d.state) ? 'The browser, terminal and window manager are getting ready. This page will connect automatically.' : d.state === 'stopped' ? 'Your files and browser profile are saved. Start the desktop to continue working.' : 'Refresh the workspace state, then start it again if needed.';
      $('empty-action').hidden = !['stopped', 'error', 'missing'].includes(d.state); $('empty-action').textContent = 'Start desktop'; $('empty-action').onclick = () => void action('start');
    } else if (suspended) {
      $('empty').hidden = false; $('screen').hidden = true; $('connection-bar').hidden = true;
      $('empty-title').textContent = 'Your desktop is still running'; $('empty-message').textContent = 'The display is disconnected. Reconnect to return to your open apps.'; $('empty-action').hidden = false; $('empty-action').textContent = 'Reconnect'; $('empty-action').onclick = () => { suspended = false; retries = 0; failure = ''; render(); };
    } else { $('empty').hidden = true; connect(); }
  } else {
    if (rfb) disconnect(); $('desktop-title').textContent = 'Your isolated desktops'; $('desktop-subtitle').textContent = 'A browser and a terminal for each setup environment.';
    $('empty').hidden = false; $('empty-title').textContent = snapshot.desktops.length ? 'Choose a desktop to continue' : 'A desktop for every relay'; $('empty-message').textContent = 'Open a real browser, use the terminal, and configure your shards in an environment of their own.';
    $('empty-action').hidden = false; $('empty-action').textContent = snapshot.desktops.length ? 'Create another desktop' : 'Create your first desktop'; $('empty-action').onclick = showCreate;
  }
}
function refresh() {
  if (refreshing) return refreshing;
  $('refresh').disabled = true;
  refreshing = (async () => {
    try { snapshot = await api('state'); failure = ''; render(); if (initialShard) { const id = initialShard; initialShard = undefined; const linked = snapshot.desktops.find(d => d.relayId === id); if (linked) choose(linked.id); else if (snapshot.relays.some(r => r.id === id)) { showCreate(); $('relay-link').value = id; } } if (snapshot.inventoryFresh && connected) status('Connected · mouse and keyboard active'); }
    catch (e) {
      failure = 'Workspace status is delayed. Refresh to retry. A connected display stays available.';
      if (snapshot) { snapshot.inventoryFresh = false; snapshot.available = false; render(); } else notice(e.message);
    } finally { refreshing = undefined; $('refresh').disabled = false; }
  })();
  return refreshing;
}
async function action(name, extra = {}) {
  if (!current()) return; const id = selected;
  if (pendingActions.has(id)) return;
  pendingActions.set(id, name); workspaceErrors.delete(id); dismissedNotice = ''; librarySignature = ''; renderControls();
  if (name === 'stop' || name === 'delete') { suspended = true; disconnect(); }
  try {
    await api(`${id}/${name}`, extra);
    if (selected === id) {
      if (name === 'delete') { selected = undefined; history.replaceState(null, '', location.pathname); }
      if (name === 'start') { suspended = false; retries = 0; }
    }
    await refresh(); tell(name === 'delete' ? 'Desktop deleted.' : name === 'stop' ? 'Desktop stopped. Files are saved.' : 'Desktop started.');
  } catch (e) { workspaceErrors.set(id, e.message); await refresh(); }
  finally { pendingActions.delete(id); librarySignature = ''; render(); }
}
$('new-desktop').onclick = showCreate; $('empty-action').onclick = showCreate; $('cancel-create').onclick = () => { $('create-panel').hidden = true; $('new-desktop').focus(); };
$('create-form').onsubmit = async e => {
  e.preventDefault(); if (creating || !$('create-form').reportValidity()) return;
  const values = { name: $('desktop-name').value.trim(), ...($('relay-link').value ? { relayId: $('relay-link').value } : {}) };
  if (!createIntent || JSON.stringify(createIntent.values) !== JSON.stringify(values)) createIntent = { id: crypto.randomUUID(), values };
  creating = true; const epoch = selectionEpoch, intent = createIntent; $('create-submit').textContent = 'Creating…'; renderControls();
  try { const result = await api('create', { id: intent.id, ...values }); $('create-panel').hidden = true; $('desktop-name').value = ''; createIntent = undefined; await refresh(); if (selectionEpoch === epoch) { suspended = false; retries = 0; choose(result.id); } tell('Desktop created. Waiting for its display.'); }
  catch (e) { workspaceErrors.set(selected, e.message); await refresh(); }
  finally { creating = false; $('create-submit').textContent = 'Create desktop'; renderControls(); }
};
$('start-desktop').onclick = () => void action('start'); $('stop-desktop').onclick = () => { $('stop-dialog').dataset.desktop = selected; $('stop-dialog').showModal(); $('cancel-stop').focus(); };
$('cancel-stop').onclick = () => $('stop-dialog').close();
$('confirm-stop').onclick = () => { if ($('stop-dialog').dataset.desktop !== selected) return; $('stop-dialog').close(); void action('stop'); };
$('delete-desktop').onclick = () => { $('delete-confirmation').value = ''; $('confirm-delete').disabled = true; $('delete-dialog').showModal(); $('delete-dialog').dataset.desktop = selected; $('delete-description').textContent = `This permanently deletes “${current().name}”, including its files, Chrome profile and saved setup. A linked serving relay is not deleted.`; $('delete-confirmation').focus(); };
$('cancel-delete').onclick = () => $('delete-dialog').close(); $('delete-confirmation').oninput = () => { $('confirm-delete').disabled = $('delete-confirmation').value !== current()?.name; };
$('delete-form').onsubmit = e => { e.preventDefault(); if ($('delete-dialog').dataset.desktop !== selected || $('delete-confirmation').value !== current()?.name) return; const confirmation = $('delete-confirmation').value; $('delete-dialog').close(); void action('delete', { confirmation }); };
for (const app of ['terminal', 'chrome']) $(`launch-${app}`).onclick = async () => { if (!selected || pendingActions.has(selected)) return; const id = selected; const b = $(`launch-${app}`); b.disabled = true; try { await api(`${id}/launch`, { app }); if (selected === id) rfb?.focus(); tell(`${app === 'chrome' ? 'Chrome' : 'Terminal'} opened in this desktop.`); } catch (e) { workspaceErrors.set(id, e.message); render(); } finally { renderControls(); } };
$('disconnect-display').onclick = () => { suspended = true; disconnect(); render(); tell('Display disconnected. Apps keep running.'); };
$('fit').onclick = () => { const fit = $('fit').getAttribute('aria-pressed') !== 'true'; $('fit').setAttribute('aria-pressed', String(fit)); $('fit').textContent = fit ? 'Fit screen' : 'Actual size'; if (rfb) rfb.scaleViewport = fit; };
$('fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('viewer-shell').requestFullscreen(); rfb?.focus(); } catch { notice('Full screen is unavailable in this browser. The desktop can still be used here.'); } };
document.addEventListener('fullscreenchange', () => { $('fullscreen').textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen'; });
$('clipboard').onclick = () => { const open = $('clipboard-panel').hidden; $('clipboard-panel').hidden = !open; $('clipboard').setAttribute('aria-expanded', String(open)); if (open) { hideKeyboard(); rfb?.blur(); $('clipboard-text').focus(); } };
$('close-clipboard').onclick = () => { $('clipboard-panel').hidden = true; $('clipboard').setAttribute('aria-expanded', 'false'); $('clipboard').focus(); };
$('send-clipboard').onclick = async () => {
  if (!connected || !selected) return;
  const id = selected, button = $('send-clipboard'); button.disabled = true;
  try { await api(`${id}/clipboard`, { text: $('clipboard-text').value.slice(0, 65536) });
    if (id !== selected || !connected) return;
    $('clipboard-status').textContent = 'Sent to this desktop. Click the target app, then paste with Ctrl+V in Chrome or Ctrl+Shift+V in Terminal.'; tell('Text sent to desktop clipboard.');
  } catch { $('clipboard-status').textContent = 'Text could not be sent. Check the desktop connection and retry.'; }
  finally { button.disabled = false; }
};
$('receive-clipboard').onclick = async () => {
  if (!connected || !selected) return;
  const id = selected, button = $('receive-clipboard'); button.disabled = true;
  try {
    const { text } = await api(`${id}/clipboard`, {});
    if (id !== selected || !connected) return;
    $('clipboard-text').value = text;
    if (!text) { $('clipboard-status').textContent = 'Nothing copied yet. Copy text inside the desktop first, then try again.'; return; }
    try { await navigator.clipboard.writeText(text); $('clipboard-status').textContent = 'Copied to your host clipboard.'; }
    catch { $('clipboard-status').textContent = 'Select and copy the text shown above.'; }
  } catch { $('clipboard-status').textContent = 'The desktop clipboard did not respond. Copy the text again and retry.'; }
  finally { button.disabled = false; }
};
$('search').oninput = () => { if (snapshot) renderLibrary(); }; $('refresh').onclick = () => void refresh(); $('sidebar-toggle').onclick = () => { document.body.classList.toggle('sidebar-open'); $('sidebar-toggle').setAttribute('aria-expanded', String(document.body.classList.contains('sidebar-open'))); };
$('sign-out').onclick = async () => { try { const response = await fetch('/api/desktops/session', { method: 'DELETE', credentials: 'same-origin', signal: AbortSignal.timeout(5000) }); if (!response.ok) throw Error('Sign out failed.'); suspended = true; disconnect(); location.replace('/desktops'); } catch { notice('Could not sign out. Check the controller connection and retry.'); } };
document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
window.addEventListener('pagehide', disconnect);
setInterval(() => { if (!document.hidden) void refresh(); }, 3000);
void refresh();

document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) { document.body.classList.remove('sidebar-open'); $('sidebar-toggle').setAttribute('aria-expanded', 'false'); $('sidebar-toggle').focus(); } });

// Text-input diff follows noVNC's mobile keyboard pattern, with Unicode code points
// and composition handling. The buffer is ephemeral and cleared when hidden.
let keyboardValue = '', composing = false, controlKey = false;
const remoteKeys = { Enter: 0xff0d, Backspace: 0xff08, Tab: 0xff09, Escape: 0xff1b };
function resetKeyboard() { keyboardValue = ' '.repeat(16); $('remote-keyboard-input').value = keyboardValue; $('remote-keyboard-input').setSelectionRange(16, 16); }
function hideKeyboard() {
  $('keyboard-panel').hidden = true; $('keyboard').setAttribute('aria-expanded', 'false');
  $('remote-keyboard-input').blur(); $('remote-keyboard-input').value = ''; keyboardValue = ''; composing = false;
  $('remote-composer').value = ''; $('compose-panel').open = false;
  controlKey = false; $('key-control').setAttribute('aria-pressed', 'false'); if (rfb) rfb.focusOnClick = true;
}
function remoteKey(key, code) {
  if (!rfb || !connected) return;
  if (controlKey) rfb.sendKey(0xffe3, 'ControlLeft', true);
  rfb.sendKey(key, code);
  if (controlKey) { rfb.sendKey(0xffe3, 'ControlLeft', false); controlKey = false; $('key-control').setAttribute('aria-pressed', 'false'); }
}
function keyboardInput() {
  if (composing || !rfb || !connected) return;
  const input = $('remote-keyboard-input'), next = [...input.value], previous = [...keyboardValue];
  let common = 0; while (common < Math.min(next.length, previous.length) && next[common] === previous[common]) common++;
  for (let i = common; i < previous.length; i++) remoteKey(remoteKeys.Backspace, 'Backspace');
  for (const char of next.slice(common, common + 2048)) remoteKey(char === '\n' ? remoteKeys.Enter : keysyms.lookup(char.codePointAt(0)));
  keyboardValue = input.value;
  if (!next.length || next.length > 256) resetKeyboard();
}
$('keyboard').onclick = () => {
  if (!$('keyboard-panel').hidden) { hideKeyboard(); return; }
  if (!connected || !rfb) return;
  $('clipboard-panel').hidden = true; $('clipboard').setAttribute('aria-expanded', 'false');
  $('keyboard-panel').hidden = false; $('keyboard').setAttribute('aria-expanded', 'true'); rfb.blur(); rfb.focusOnClick = false;
  resetKeyboard(); $('remote-keyboard-input').focus({ preventScroll: true });
};
$('close-keyboard').onclick = () => { hideKeyboard(); $('keyboard').focus(); };
$('remote-keyboard-input').oninput = keyboardInput;
$('remote-keyboard-input').oncompositionstart = () => { composing = true; };
$('remote-keyboard-input').oncompositionend = () => { composing = false; keyboardInput(); };
$('remote-keyboard-input').onkeydown = e => {
  if (e.isComposing) return;
  if (e.key === 'Escape') { e.preventDefault(); hideKeyboard(); $('keyboard').focus(); return; }
  if (e.key === 'Enter') { e.preventDefault(); remoteKey(remoteKeys[e.key], e.code); resetKeyboard(); }
};
$('send-composed').onclick = () => {
  const input = $('remote-composer');
  if (!connected || !rfb) { tell('Reconnect the display before sending text.'); return; }
  if (!input.value || input.value.length > 2048) { tell('Enter up to 2,048 characters.'); return; }
  controlKey = false; $('key-control').setAttribute('aria-pressed', 'false');
  for (const char of input.value.replace(/\r\n?/g, '\n')) remoteKey(char === '\n' ? remoteKeys.Enter : keysyms.lookup(char.codePointAt(0)));
  input.value = ''; input.focus(); tell('Text sent to the focused app.');
};
$('key-control').onclick = () => { controlKey = !controlKey; $('key-control').setAttribute('aria-pressed', String(controlKey)); $('remote-keyboard-input').focus({ preventScroll: true }); };
for (const button of $('keyboard-panel').querySelectorAll('[data-remote-key]')) button.onclick = () => { remoteKey(remoteKeys[button.dataset.remoteKey], button.dataset.remoteKey); resetKeyboard(); $('remote-keyboard-input').focus({ preventScroll: true }); };
$('keyboard-panel').addEventListener('pointerdown', e => { if (e.target.closest('button') && e.target.id !== 'close-keyboard') e.preventDefault(); });

const eventTime = timestamp => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
const activityView = new DesktopActivityView({ openWorkspace: id => { choose(id); toggleActivity(false); }, announce: tell });
function renderActivity() {
  $('freshness').textContent = snapshot.inventoryFresh ? `Checked ${eventTime(snapshot.capturedAt)}` : 'Workspace status delayed';
  activityView.update(snapshot, selected);
}
function toggleActivity(open = $('activity-panel').hidden) { activityView.toggle(open); }
$('activity-toggle').onclick = () => toggleActivity(); $('close-activity').onclick = () => { toggleActivity(false); $('activity-toggle').focus(); };
$('dismiss-notice').onclick = () => { dismissedNotice = $('notice-text').textContent; $('notice').hidden = true; };
function toggleZen() { document.body.classList.toggle('zen'); const zen = document.body.classList.contains('zen'); $('zen').setAttribute('aria-pressed', String(zen)); $('zen').textContent = zen ? 'Exit Zen' : 'Zen view'; if (zen) { $('create-panel').hidden = true; toggleActivity(false); } }
$('zen').onclick = toggleZen;
let commands = [], commandIndex = 0, commandFocus, ranCommand = false;
function commandItems() {
  const d = current(), ready = !!d?.canConnect && connected, busy = !!d?.operation || pendingActions.has(selected);
  return [
    ...(snapshot?.desktops || []).map(item => ({ label: item.name, detail: labels[item.state] || item.state, run: () => choose(item.id) })),
    { label: 'New desktop', detail: 'Workspace', run: showCreate, disabled: creating },
    { label: 'Inspect linked shard', detail: 'Health & traffic', run: () => toggleRelationship(true), disabled: !d },
    { label: 'Open Terminal', detail: 'App', run: () => $('launch-terminal').click(), disabled: !ready || busy },
    { label: 'Open Chrome', detail: 'App', run: () => $('launch-chrome').click(), disabled: !ready || busy },
    { label: 'Open this workspace in a new tab', detail: 'Workspace', run: () => window.open('/desktops#desktop=' + selected, '_blank', 'noopener'), disabled: !d },
    { label: 'Start this desktop', detail: 'Power', run: () => $('start-desktop').click(), disabled: !d || !['stopped', 'error', 'missing'].includes(d.state) || busy || !snapshot?.available },
    { label: 'Stop this desktop…', detail: 'Power', run: () => $('stop-desktop').click(), disabled: !d || !['running', 'unhealthy'].includes(d.state) || busy || !snapshot?.inventoryFresh },
    { label: document.body.classList.contains('zen') ? 'Exit Zen view' : 'Enter Zen view', detail: 'View', run: toggleZen, disabled: !d },
    { label: 'Show workspace activity', detail: 'View', run: () => { document.body.classList.remove('zen'); $('zen').setAttribute('aria-pressed', 'false'); $('zen').textContent = 'Zen view'; toggleActivity(true); } },
    { label: 'Open clipboard', detail: 'Input', run: () => $('clipboard').click(), disabled: !ready },
    { label: 'Refresh workspace status', detail: 'Recovery', run: () => void refresh() },
  ].filter(item => !item.disabled);
}
function renderCommands() {
  const query = $('command-query').value.trim().toLowerCase(); commands = commandItems().filter(c => `${c.label} ${c.detail}`.toLowerCase().includes(query)); commandIndex = Math.min(commandIndex, Math.max(0, commands.length - 1));
  $('command-results').replaceChildren(...commands.map((c, i) => { const button = n('button', undefined, 'command-option'); button.type = 'button'; button.id = 'command-' + i; button.tabIndex = -1; button.setAttribute('role', 'option'); button.setAttribute('aria-selected', String(i === commandIndex)); button.append(n('span', c.label), n('small', c.detail)); button.onclick = () => runCommand(i); return button; }));
  if (commands.length) $('command-query').setAttribute('aria-activedescendant', 'command-' + commandIndex);
  else { $('command-query').removeAttribute('aria-activedescendant'); $('command-results').append(n('p', 'No matching workspaces or actions.', 'muted')); }
}
function runCommand(i) { const command = commands[i]; if (!command) return; ranCommand = true; $('command-dialog').close(); command.run(); }
function openCommands() { if ($('command-dialog').open) return; ranCommand = false; commandFocus = document.activeElement; rfb?.blur(); commandIndex = 0; $('command-query').value = ''; renderCommands(); $('command-dialog').showModal(); $('command-query').focus(); }
$('commands').onclick = openCommands; $('zen-commands').onclick = openCommands;
$('command-dialog').addEventListener('close', () => { if (!ranCommand && commandFocus?.isConnected) commandFocus.focus({ preventScroll: true }); });
$('command-query').oninput = () => { commandIndex = 0; renderCommands(); };
$('command-query').onkeydown = e => { if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); commandIndex = (commandIndex + (e.key === 'ArrowDown' ? 1 : -1) + commands.length) % Math.max(1, commands.length); renderCommands(); $('command-' + commandIndex)?.scrollIntoView({ block: 'nearest' }); } else if (e.key === 'Enter') { e.preventDefault(); runCommand(commandIndex); } };
document.addEventListener('keydown', e => {
  const inGuest = $('screen').contains(e.target) || e.target === $('remote-keyboard-input');
  if (!inGuest && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCommands(); }
});

const healthLabels = { healthy: 'Healthy', degraded: 'Degraded', unavailable: 'Unavailable', expired: 'Sign-in expired', rejected: 'Credential rejected', cooldown: 'Cooling down', stale: 'Health unconfirmed', offline: 'Worker offline' };
const shardEventLabels = { manual_work_paused: 'New work paused by an administrator', manual_work_resumed: 'Manual hold released', credential_rejected: 'Credential rejected', credential_rotated: 'Credential changed', worker_adopted: 'Existing worker connected', worker_started: 'Worker started', worker_starting: 'Worker startup requested', worker_models_changed: 'Available models changed', worker_retry_scheduled: 'Health check failed; retry scheduled', worker_recovered: 'Health check recovered', worker_health_healthy: 'Worker health recovered', worker_health_degraded: 'Worker health degraded', worker_health_unavailable: 'Worker reported unavailable', worker_removed: 'Worker removed', worker_disappeared: 'Worker no longer found' };
const linkPending = new Set(), trafficPending = new Set(), linkMessages = new Map();
let linkSelection, shardEventSignature = '', trafficIntent;
const linkedShard = () => snapshot?.relays.find(r => r.id === current()?.relayId);
function toggleRelationship(open = $('relationship-panel').hidden) {
  if (open && document.body.classList.contains('zen')) toggleZen();
  $('relationship-panel').hidden = !open; $('relationship-toggle').setAttribute('aria-expanded', String(open));
  if (open) { renderRelationship(); (current()?.relayId ? $('relationship-title') : $('shard-link')).focus({ preventScroll: true }); }
}
function renderRelationship() {
  const d = current(), r = linkedShard(); $('relationship').hidden = !d; if (!d) return;
  const stale = !!failure || !r?.registryFresh;
  const summary = !d.relayId ? 'Link a shard to see its health and traffic.' : !r ? 'This shard is no longer registered. Choose a current shard.' : stale ? 'Shard status delayed · refresh before changing traffic' : `${healthLabels[r.health]} · ${r.paused ? 'New work paused' : r.eligibleModels ? `${r.eligibleModels} models eligible` : 'No new work'}${r.activeStreams === null ? '' : ` · ${r.activeStreams} active`}`;
  $('relationship-label').textContent = d.relayId ? `Shard · ${d.relayId}` : 'No linked shard'; $('relationship-summary').textContent = summary;
  $('relationship-toggle').textContent = d.credentialSync?.state === 'error' ? 'Review sign-in' : d.relayId ? 'Inspect shard' : 'Link shard';
  $('zen-shard').textContent = r ? `${r.paused ? 'Work paused' : stale ? 'Status delayed' : healthLabels[r.health]} · Shard` : 'Link shard';
  const select = $('shard-link'), previous = select.value, changed = linkSelection !== d.id; linkSelection = d.id;
  if (changed) $('link-editor').open = !d.relayId;
  const options = [{ id: '', label: 'Unlinked workspace' }, ...snapshot.relays.map(s => ({ id: s.id, label: `${s.id} · ${s.paused ? 'Work paused' : healthLabels[s.health]}` }))];
  if (d.relayId && !r) options.push({ id: d.relayId, label: d.relayId + ' · No longer registered' });
  const signature = JSON.stringify(options);
  if (signature !== select.dataset.options || changed) {
    select.replaceChildren(...options.map(o => { const el = n('option', o.label); el.value = o.id; return el; })); select.dataset.options = signature;
    select.value = changed ? d.relayId || '' : options.some(o => o.id === previous) ? previous : d.relayId || '';
  }
  $('save-link').disabled = linkPending.has(d.id) || credentialPending.has(d.id) || !!failure || !!d.operation || !!d.credentialSync?.busy || !snapshot.journalHealthy || select.value === (d.relayId || '');
  $('find-shard').disabled = !d.credentialSync?.canMatch || !d.canConnect || !snapshot.inventoryFresh || !!failure || !!d.operation || !!d.credentialSync?.busy || credentialPending.has(d.id) || linkPending.has(d.id);
  $('find-shard').textContent = credentialPending.get(d.id) === 'match' ? 'Finding match…' : 'Find matching shard';
  $('link-feedback').textContent = linkMessages.get(d.id) || '';
  $('shard-details').hidden = !r; renderCredentialSync(d, r); if (!r) return;
  $('relation-desktop').textContent = d.name; $('relation-desktop-state').textContent = `${labels[d.state]} · independent environment`;
  $('relation-shard').textContent = r.id; $('relation-health').textContent = stale ? 'Status unconfirmed' : healthLabels[r.health];
  $('relation-worker').textContent = r.relayId || 'No worker';
  $('relation-worker-state').textContent = stale ? 'Status unconfirmed' : ({ running: 'Running', stopped: 'Stopped', missing: 'No container currently retained', retiring: 'Cleanup already in progress', unknown: 'Container status unconfirmed' })[r.workerState];
  $('traffic-state').textContent = r.paused ? 'New work paused' : stale ? 'Traffic status unconfirmed' : r.eligibleModels ? r.activeStreams + r.queueDepth >= r.capacity ? 'At capacity' : 'Accepting eligible work' : 'Not accepting new work';
  $('traffic-reason').textContent = r.paused ? `Manual hold since ${new Date(r.pausedAt).toLocaleString()}. ${r.workerState === 'running' ? 'Worker retained; accepted jobs can finish.' : 'No replacement worker will start during this hold.'}` : r.eligibleModels && !stale ? 'Health and model evidence determine which requests this worker can accept.' : 'Fresh health, credentials and model evidence are required before new work can be assigned.';
  $('shard-load').textContent = !stale && r.activeStreams !== null ? `${r.activeStreams} active · ${r.queueDepth} queued · ${r.capacity} concurrent slots` : 'Current workload is unconfirmed; missing data does not mean idle.';
  $('change-traffic').textContent = trafficPending.has(r.id) ? 'Saving…' : r.paused ? 'Resume new work' : 'Pause new work'; $('change-traffic').disabled = trafficPending.has(r.id) || stale || !r.canManage;
  $('shard-guidance').textContent = r.health === 'expired' ? 'The registered sign-in expired. If you have signed in again in this desktop, choose Check now to verify and save it. New work stays blocked until fresh credentials and worker health are confirmed.' : r.health === 'rejected' ? 'Sign in to the linked account in Terminal. Automatic sync verifies and saves the refreshed credential; health updates after the worker reloads.' : r.health === 'cooldown' ? `Quota cooldown ends ${new Date(r.cooldownUntil).toLocaleString()}. Keep the desktop open while it recovers.` : r.retryAt ? `The next automatic worker check is scheduled for ${new Date(r.retryAt).toLocaleTimeString()}. You can continue working here.` : r.paused ? 'Use this workspace for manual investigation. Resume releases the hold; fresh eligibility checks still apply. Credential rotation or removal can retire an old worker.' : 'Pause new work before maintenance to keep the current worker available. Closing this viewer leaves both environments running.';
  $('shard-monitor').href = '/federation#shard=' + encodeURIComponent(r.id);
  $('shard-observed').textContent = r.healthObservedAt ? `Health observed ${eventTime(r.healthObservedAt)}${r.health === 'stale' || stale ? ' · stale' : ''}` : 'No worker health sample';
  const eventSignature = JSON.stringify([r.id, r.events]); if (eventSignature === shardEventSignature) return; shardEventSignature = eventSignature;
  $('shard-events').replaceChildren(...r.events.map(e => { const row = n('li'), at = n('time', eventTime(e.at)); at.dateTime = new Date(e.at).toISOString(); at.title = new Date(e.at).toLocaleString(); const body = n('div', shardEventLabels[e.code] || (e.code.startsWith('drain_') ? 'Worker cleanup started' : 'Worker state changed')); body.append(n('small', e.code)); row.append(at, body); return row; }));
  if (!r.events.length) $('shard-events').append(n('li', 'No shard events retained since controller start.'));
}
$('relationship-toggle').onclick = () => toggleRelationship(); $('close-relationship').onclick = () => { toggleRelationship(false); $('relationship-toggle').focus(); }; $('zen-shard').onclick = () => toggleRelationship(true);
$('shard-link').onchange = renderRelationship;
$('link-form').onsubmit = async e => {
  e.preventDefault(); const d = current(); if (!d || linkPending.has(d.id)) return;
  const id = d.id, body = { shardId: $('shard-link').value || null, expectedShardId: d.relayId || null }; linkPending.add(id); linkMessages.delete(id); renderRelationship();
  try { await api(`${id}/link`, body); linkMessages.set(id, body.shardId ? 'Shard linked. Desktop and worker keep running independently.' : 'Link removed. Shard traffic and any manual hold are unchanged.'); await refresh(); if (selected === id && body.shardId) { $('link-editor').open = false; $('relationship-panel').scrollTop = 0; } }
  catch (error) { linkMessages.set(id, error.message); }
  finally { linkPending.delete(id); renderRelationship(); }
};
$('change-traffic').onclick = () => {
  const d = current(), r = linkedShard(); if (!d || !r || trafficPending.has(r.id) || failure) return;
  trafficIntent = { desktopId: d.id, shardId: r.id, generation: r.generation, paused: !r.paused };
  $('traffic-title').textContent = r.paused ? 'Resume new work?' : 'Pause new work?'; $('confirm-traffic').textContent = r.paused ? 'Resume new work' : 'Pause new work';
  $('traffic-description').textContent = r.paused ? `Release the manual hold for ${r.id}. Only fresh, healthy model capacity can receive new requests. A still-rejected worker may be retired by normal cleanup.` : `Pause new assignments to ${r.id}. Accepted jobs can finish and the current worker stays available. The hold remains until you resume, including after a controller restart.`;
  $('traffic-impact').textContent = !r.paused && r.uncoveredModels ? `${r.uncoveredModels} models currently have no other eligible worker. New requests for those models will have no capacity while paused.` : !r.paused ? 'Other eligible workers remain available. This action does not start, stop or delete your desktop.' : 'Resuming does not clear credential rejection or quota cooldown.';
  $('traffic-dialog').showModal(); $('cancel-traffic').focus();
};
$('cancel-traffic').onclick = () => $('traffic-dialog').close();
$('confirm-traffic').onclick = async () => {
  const intent = trafficIntent; if (!intent || trafficPending.has(intent.shardId)) return;
  $('traffic-dialog').close(); trafficPending.add(intent.shardId); workspaceErrors.delete(intent.desktopId); dismissedNotice = ''; renderRelationship();
  try { await api(`${intent.desktopId}/traffic`, { shardId: intent.shardId, paused: intent.paused, generation: intent.generation }); await refresh(); tell(intent.paused ? 'New work paused. Accepted jobs can finish.' : 'Manual hold released. Eligibility checks remain active.'); }
  catch (error) { workspaceErrors.set(intent.desktopId, error.message); await refresh(); }
  finally { trafficPending.delete(intent.shardId); render(); }
};


const credentialPending = new Map();
const credentialMessages = {
  credential_missing: 'No saved sign-in yet. Sign in to the linked account in this desktop’s Terminal.',
  credential_invalid: 'The saved sign-in is incomplete or unsupported. Complete an OAuth login, then check again.',
  credential_expired: 'The saved login is expired or about to expire. Sign in again in Terminal.',
  credential_account_mismatch: 'This login belongs to a different account. Sign in to the account already assigned to the linked shard.',
  credential_older: 'The registry already has a newer login. Complete a fresh sign-in before trying again.',
  credential_rejected: 'The provider rejected this login. Sign in again; the serving credential has been kept.',
  credential_check_unavailable: 'The login could not be verified. Check again when the provider is available.',
  credential_registry_unavailable: 'The credential registry could not confirm the update. Check again when it is available.',
  credential_conflict: 'The workspace or credential changed during this check. Refresh before trying again.',
  credential_superseded: 'Another sign-in updated this account. Its credential is preserved; this desktop’s older saved login will not replace it. Sign in here again when you want to update the account.',
  credential_checkpoint_unavailable: 'Sync could not save its recovery record. Check the controller’s storage, then retry. An interrupted update will be reconciled before another write.',
  credential_account_unregistered: 'This saved account has no eligible registered shard. Enroll it separately as an administrator, then return here to link it. The current shard is unchanged.',
  credential_account_ambiguous: 'More than one eligible shard uses this account. Review the registered shards and choose the intended link.',
  credential_not_allowed: 'The linked shard is unavailable or its permission was withdrawn. Review its registry status first.'
};
function renderCredentialSync(d, r) {
  const sync = d.credentialSync, pending = credentialPending.has(d.id) || sync?.busy;
  $('credential-panel').hidden = !r;
  if (!r) return;
  renderDeviceLogin(d);
  const saved = ['updated', 'current'].includes(sync?.state), fresh = r.registryFresh && !failure;
  const awaitingProvider = !saved && ['starting', 'waiting'].includes(d.login?.state);
  const ready = saved && sync.applied && fresh && !r.paused && r.health === 'healthy' && r.workerState === 'running' && r.eligibleModels > 0;
  const opening = credentialPending.get(d.id) === 'signin' || sync?.operation === 'signin', checking = sync?.state === 'checking' || credentialPending.get(d.id) === 'check';
  const retrying = sync?.state === 'error' && sync.enabled && sync.retryAt > Date.now();
  const stateLabel = !sync?.available ? 'Sync unavailable' : opening ? 'Opening sign-in…' : checking ? 'Checking sign-in…' : awaitingProvider ? 'Complete provider sign-in' : sync.code === 'credential_superseded' ? 'Updated elsewhere' : retrying ? 'Retry scheduled' : sync.state === 'error' ? 'Needs attention' : ready ? 'Ready for work' : saved ? !fresh ? 'Sign-in saved · status delayed' : r.paused ? 'Sign-in saved · work paused' : r.cooldownUntil ? 'Sign-in saved · cooldown active' : !sync.applied ? 'Sign-in saved · worker reloading' : 'Sign-in saved · checking health' : 'Waiting for sign-in';
  if ($('credential-state').textContent !== stateLabel) $('credential-state').textContent = stateLabel;
  $('credential-state').className = sync?.state === 'error' ? 'error' : ready ? 'running' : 'muted';
  $('credential-guidance').textContent = !sync?.available ? 'Terminal credential sync is not configured on this controller.' : awaitingProvider ? 'Use the code and provider page below. This desktop stays open while you finish.' : sync.code ? credentialMessages[sync.code] || 'Check the saved sign-in and try again.' : ready ? 'The serving worker has loaded this login and has eligible capacity. Done closes setup; your apps and shard keep running.' : saved ? r.paused ? 'Your login is saved. The manual traffic hold remains in place. Resume new work when you are ready; Done keeps the hold.' : !fresh ? 'The login is saved, but current serving status is unconfirmed. Wait for fresh health before treating setup as ready.' : 'The login is saved. Watch shard health while the worker reloads or finishes its recovery checks. Your desktop stays open.' : 'Choose Sign in and complete the linked account’s login in this desktop’s Chrome.';
  $('credential-observed').textContent = `${sync?.source ? (sync.source === 'codex' ? 'Codex login. ' : 'Manual setup. ') : ''}${sync?.checkedAt ? `Checked ${eventTime(sync.checkedAt)}${sync.syncedAt ? ' · refreshed ' + eventTime(sync.syncedAt) : ''}. ` : ''}${!sync?.enabled ? 'Automatic sync is off. Use Check now to apply a saved login.' : !['running', 'unhealthy'].includes(d.state) ? 'Automatic checks resume when this desktop starts.' : retrying ? `Next retry ${eventTime(sync.retryAt)}. Check now retries immediately.` : saved ? 'New logins are detected automatically; saved logins are rechecked every minute.' : 'New saved logins are detected automatically. Check now rechecks this login.'}`;
  $('credential-signin').disabled = pending || !sync?.available || !d.canConnect || !!failure || ['starting', 'waiting'].includes(d.login?.state);
  $('credential-signin').textContent = opening ? 'Opening…' : saved ? 'Sign in again' : 'Sign in';
  $('credential-done').hidden = !(saved && (ready || fresh && r.paused));
  $('credential-done').disabled = pending;
  $('credential-check').disabled = pending || !sync?.available || !snapshot.inventoryFresh || !!d.operation || !['running', 'unhealthy'].includes(d.state);
  $('credential-check').textContent = pending ? 'Checking…' : 'Check now';
  $('credential-auto').disabled = pending || !sync?.available || !!d.operation || !snapshot.journalHealthy;
  $('credential-auto').textContent = sync?.enabled ? 'Automatic sync on' : 'Automatic sync off'; $('credential-auto').setAttribute('aria-pressed', String(!!sync?.enabled));
}
async function credentialAction(toggle) {
  const d = current(); if (!d?.relayId || credentialPending.has(d.id)) return;
  const id = d.id; credentialPending.set(id, toggle ? 'toggle' : 'check'); workspaceErrors.delete(id); renderRelationship();
  try { await api(`${id}/credential-sync`, { shardId: d.relayId, ...(toggle ? { enabled: !d.credentialSync.enabled } : {}) }); await refresh(); }
  catch (error) { workspaceErrors.set(id, error.message); }
  finally { credentialPending.delete(id); render(); }
}
$('credential-check').onclick = () => void credentialAction(false);
$('credential-auto').onclick = () => void credentialAction(true);
async function openSignIn(method) {
  const d = current(); if (!d?.relayId || credentialPending.has(d.id)) return;
  const id = d.id; credentialPending.set(id, 'signin'); workspaceErrors.delete(id); renderRelationship();
  try {
    await api(`${id}/signin`, { shardId: d.relayId, method });
    if (method === 'browser') {
      if (selected === id) { toggleRelationship(false); rfb?.focus(); }
      tell('Sign-in window opened. Complete the account login in this desktop’s Chrome, then inspect the shard for verification.');
    } else tell('Device sign-in opened. Its code will appear here when the provider responds.');
  } catch (error) { workspaceErrors.set(id, error.message); }
  finally { credentialPending.delete(id); await refresh(); render(); }
}
$('credential-signin').onclick = () => void openSignIn('browser');
$('credential-device').onclick = () => void openSignIn('device');
function renderDeviceLogin(d) {
  const login = d.login || {}, active = ['starting', 'waiting'].includes(login.state), waiting = login.state === 'waiting' && login.expiresAt > Date.now();
  $('credential-device').hidden = !login.available;
  $('credential-device').disabled = active || credentialPending.has(d.id) || d.credentialSync?.busy || !d.canConnect || !!failure;
  $('credential-match').hidden = !d.credentialSync?.canMatch || d.credentialSync?.code !== 'credential_account_mismatch';
  $('credential-match').disabled = credentialPending.has(d.id) || !d.canConnect || !!failure;
  $('device-challenge').hidden = !waiting;
  $('device-cancel').hidden = !active;
  $('device-code').value = waiting ? login.userCode : '';
  const messages = { idle: '', starting: 'Requesting a sign-in code…', waiting: waiting ? `Waiting for you · code expires by ${eventTime(login.expiresAt)}.` : 'This code expired. Start a new sign-in.', saved: 'Provider sign-in finished. Follow the verification status above.', failed: 'Device sign-in did not finish. Close any existing sign-in window and retry, or use Sign in to continue in the desktop’s Chrome. Your provider may require device-code login to be enabled.', cancelled: 'Device sign-in cancelled. Saved credentials and current work are unchanged.', expired: 'The sign-in attempt ended or expired. Start again for a new code.', unavailable: 'Device sign-in status is unavailable. Refresh, or use the desktop’s Chrome.' };
  const message = login.available ? messages[login.state] || '' : '';
  if ($('device-status').textContent !== message) $('device-status').textContent = message;
}
$('device-copy').onclick = async () => {
  const code = $('device-code');
  if ($('device-challenge').hidden) return;
  try { await navigator.clipboard.writeText(code.value); tell('Sign-in code copied.'); }
  catch { code.focus(); code.select(); tell('Copy the selected sign-in code.'); }
};
$('device-cancel').onclick = async () => {
  const d = current(); if (!d?.relayId) return;
  try { await api(`${d.id}/signin-cancel`, { shardId: d.relayId }); tell('Cancellation requested.'); await refresh(); }
  catch (error) { workspaceErrors.set(d.id, error.message); render(); }
};
async function matchSavedAccount() {
  const d = current(); if (!d || credentialPending.has(d.id) || linkPending.has(d.id) || failure) return;
  credentialPending.set(d.id, 'match'); workspaceErrors.delete(d.id); linkMessages.delete(d.id); renderRelationship();
  try {
    const result = await api(`${d.id}/credential-match`, { shardId: d.relayId || null });
    await refresh();
    if (selected !== d.id) return;
    if (failure || !snapshot.relays.some(s => s.id === result.shardId && s.registryFresh)) throw Error('The matching account is not available in the current registry. Refresh and find the match again.');
    if (current()?.relayId !== d.relayId) throw Error('The desktop link changed during this check. Review the current link and try again.');
    $('link-editor').open = true; $('shard-link').value = result.shardId;
    linkMessages.set(d.id, 'Matching shard selected. Review it, then choose Save link. The current link has not changed.');
    renderRelationship(); $('shard-link').focus();
  } catch (error) { workspaceErrors.set(d.id, credentialMessages[error.code] || error.message); }
  finally { credentialPending.delete(d.id); render(); }
}
$('credential-match').onclick = matchSavedAccount;
$('find-shard').onclick = matchSavedAccount;
$('credential-done').onclick = () => { toggleRelationship(false); $('relationship-toggle').focus(); tell('Setup closed. Desktop apps and shard traffic are unchanged.'); };
