'use strict';
const $ = id => document.getElementById(id);
let key = '', snapshot, selected, busy = false, epoch = 0, timer;
const text = (tag, value, className) => { const node = document.createElement(tag); node.textContent = value; if (className) node.className = className; return node; };
const age = ms => ms ? `${Math.max(0, Math.floor((Date.now() - ms) / 1000))} s` : 'Not established';
function render() {
  if (!snapshot) return;
  const query = $('filter').value.trim().toLowerCase();
  const rows = snapshot.models.filter(m => m.model.toLowerCase().includes(query) || m.shardIds.some(id => id.toLowerCase().includes(query)));
  const focused = document.activeElement?.dataset.model;
  $('models').replaceChildren(...rows.map(m => {
    const row = document.createElement('tr'), cell = document.createElement('td'), button = text('button', m.model);
    button.dataset.model = m.model; button.setAttribute('aria-pressed', String(selected === m.model));
    button.onclick = () => { selected = m.model; render(); }; cell.append(button);
    row.append(cell, text('td', m.eligibleShardCount, 'numeric'), text('td', m.state, m.state)); return row;
  }));
  if (focused) [...$('models').querySelectorAll('button')].find(b => b.dataset.model === focused)?.focus({ preventScroll: true });
  $('empty').hidden = rows.length > 0;
  $('empty').textContent = snapshot.models.length ? 'No matching models. Clear the filter to see every pool.' : 'No capability inventory established yet. Shards may still be discovering models.';
  const model = snapshot.models.find(m => m.model === selected);
  if (model) {
    $('detail').replaceChildren(text('h2', model.model), text('p', `${model.eligibleShardCount} eligible shards · ${model.redundancy === 'NONE' ? 'No redundancy' : 'Redundancy available'}`));
    for (const s of snapshot.shards.filter(s => s.models.some(m => m.model === selected))) {
      const capability = s.models.find(m => m.model === selected), entry = document.createElement('article');
      entry.append(text('strong', s.shardId), text('small', s.relayId), text('p', `Capability: ${capability.state}`, capability.state), text('p', `Relay health: ${s.health}`), text('p', `Active streams: ${s.activeStreams}/${s.capacity}`), text('small', `Evidence age ${age(capability.observedAtMs)} · ${capability.expiresAtMs > Date.now() ? 'Fresh' : 'Expired'}`));
      $('detail').append(entry);
    }
  }
  if (selected && !model) $('detail').replaceChildren(text('h2', selected), text('p', 'This model is no longer reported in the latest snapshot. Select another model to inspect its current shards.'));
  $('shards').replaceChildren(...snapshot.shards.filter(s => [s.shardId, s.relayId, ...s.models.map(m => m.model)].some(v => v.toLowerCase().includes(query))).map(s => {
    const row = document.createElement('tr'), cell = document.createElement('td'); cell.append(text('strong', s.shardId), text('small', s.relayId));
    row.append(cell, text('td', s.lifecycle, s.lifecycle), text('td', s.health), text('td', `${s.activeStreams}/${s.capacity}`, 'numeric'), text('td', age(s.lastCapabilityRefreshMs), 'numeric')); return row;
  }));
}
async function refresh() {
  if (busy || !key) return;
  busy = true; $('refresh').disabled = true; const captured = epoch;
  try {
    const response = await fetch('/api/capabilities', { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Administrator authentication failed. Reconnect with a valid key.' : `Snapshot unavailable (HTTP ${response.status}). Retry shortly.`);
    const next = await response.json(); if (captured !== epoch) return;
    snapshot = next; render();
    $('notice').textContent = next.registryFresh ? 'Ownership is current. Eligibility requires fresh model evidence and a healthy relay.' : 'Ownership is stale. New admissions are paused until the registry recovers.';
    $('status').textContent = `Snapshot received ${new Date().toLocaleTimeString()} · refreshes every 10 seconds while this page is visible`;
  } catch (error) { if (captured === epoch) { $('notice').textContent = `${error.message} ${snapshot ? 'Displayed values are from the last snapshot.' : ''}`; $('status').textContent = 'Snapshot is not current.'; } }
  finally { busy = false; $('refresh').disabled = !key; }
}
$('connect').onsubmit = event => { event.preventDefault(); epoch++; key = $('key').value.trim(); $('key').value = ''; $('disconnect').hidden = false; clearInterval(timer); timer = setInterval(() => { if (!document.hidden) void refresh(); }, 10000); void refresh(); };
$('disconnect').onclick = () => { epoch++; key = ''; clearInterval(timer); snapshot = undefined; selected = undefined; $('models').replaceChildren(); $('shards').replaceChildren(); $('detail').replaceChildren(text('h2', 'Select a model')); $('notice').textContent = 'Disconnected. Enter an administrator key to reconnect.'; $('status').textContent = 'Automatic refresh stopped.'; $('refresh').disabled = true; $('disconnect').hidden = true; $('empty').hidden = false; $('empty').textContent = 'No snapshot loaded.'; };
$('refresh').onclick = refresh; $('filter').oninput = render;
