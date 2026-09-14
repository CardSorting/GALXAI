'use strict';
const $ = id => document.getElementById(id);
let snapshot, tab = 'events', selected, busy = false, paused = false, connected = true, limit = 100, failureMessage = '', version = 0, filtered = [];
const shardFragment = new URLSearchParams(location.hash.slice(1)).get('shard');
let initialShard = /^[\w.:-]{1,128}$/.test(shardFragment || '') ? shardFragment : undefined;
// Launch fragments contain one-use credentials and must never survive in browser history.
const stripLogin = () => { if (location.hash) history.replaceState(null, '', location.pathname); };
stripLogin(); window.addEventListener('hashchange', stripLogin);
const node = (tag, value, className) => { const n = document.createElement(tag); if (value !== undefined) n.textContent = String(value); if (className) n.className = className; return n; };
const button = (label, action, className) => { const b = node('button', label, className); b.type = 'button'; b.onclick = action; return b; };
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const time = at => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const date = at => at ? new Date(at).toLocaleString() : 'Not observed';
const duration = ms => ms === undefined ? 'Not observed' : ms < 1000 ? `${Math.round(ms)} ms` : ms < 60000 ? `${(ms / 1000).toFixed(1)} s` : `${(ms / 60000).toFixed(1)} min`;
const age = at => at ? `${duration(Math.max(0, Date.now() - at))} ago` : 'Not observed';
const explanations = {
  controller_started: ['Controller started', 'This event history begins here. Earlier fleet decisions are not retained across controller restarts.', 'New changes will appear automatically.'],
  rejections_restored: ['Rejected credentials kept offline', 'Previously rejected credential revisions were restored from the local journal. This is a restart marker, not a new rejection.', 'Replace the rejected credentials to make those workers eligible to start again.'],
  credential_rejected: ['Credential rejected', 'The worker reported an explicit credential rejection. This revision is excluded from new work; a manual hold retains its worker for inspection.', 'Replace this credential. The same rejected revision remains ineligible after a restart.'],
  manual_work_paused: ['New work paused manually', 'An administrator paused assignments to this shard. Its current worker is retained and accepted jobs can finish.', 'Investigate in the linked desktop, then explicitly resume new work.'],
  manual_work_resumed: ['Manual hold released', 'An administrator released the traffic hold. Credential, cooldown and health checks still govern eligibility.', 'Watch for fresh eligible capacity before submitting new work.'],
  credential_rotated: ['Credential changed', 'The stored credential revision changed. Its previous rejection no longer blocks a replacement worker.', 'Watch for the replacement worker and fresh model discovery.'],
  shard_removed: ['Credential removed from registry', 'The registry no longer authorizes a worker for this credential.', 'Its worker is retired while unrelated workers keep serving.'],
  worker_starting: ['Starting worker', 'An eligible credential has no retained worker, so the controller requested a start.', 'Wait for startup and model discovery.'],
  worker_started: ['Worker started', 'A new worker was created. Model discovery still determines what it can serve.', 'Inspect model availability to see when it becomes eligible.'],
  worker_adopted: ['Existing worker reconnected', 'The controller adopted an existing worker with the current ownership generation.', 'No additional worker was created by this event.'],
  worker_removed: ['Worker cleanup finished', 'The driver completed removal of this worker.', 'Check the preceding drain event for the reason.'],
  worker_disappeared: ['Worker no longer found', 'The worker disappeared from the container inventory. Its capabilities were withdrawn.', 'The next reconciliation can replace it if its credential is still eligible.'],
  worker_retry_scheduled: ['Worker check failed; retry scheduled', 'Startup or inspection did not finish successfully. New work cannot use unverified capacity.', 'The controller will retry at the time shown below.'],
  worker_restart_scheduled: ['Worker restart scheduled', 'The worker stopped or disappeared. New work remains blocked until the controller removes the old record and its bounded retry delay passes.', 'Wait for the scheduled retry. If the restart budget is exhausted, inspect the private worker diagnostics before changing anything.'],
  worker_restart_budget_exhausted: ['Worker restart budget exhausted', 'This worker repeatedly stopped within the restart window. Automatic restarts are paused to prevent a restart storm.', 'Inspect the worker and its local dependencies, then rotate or revalidate the credential, or clear the condition through the reviewed recovery procedure.'],
  worker_models_changed: ['Available models changed', 'The worker reported a change in its available model set. The count below is the number reported available in this observation.', 'Inspect model availability for current eligibility and failover.'],
  worker_health_healthy: ['Worker health recovered', 'The worker reported healthy status.', 'Current model evidence determines eligibility.'],
  worker_health_degraded: ['Worker health degraded', 'The worker reported degraded health.', 'Inspect worker and request details for the specific evidence.'],
  worker_health_unavailable: ['Worker reported unavailable', 'The worker reported unavailable health.', 'Inspect request failures and wait for a fresh healthy report.'],
  worker_recovered: ['Worker check recovered', 'A previously failing worker check completed.', 'Current model eligibility determines whether it can receive new work.'],
  registry_recovered: ['Registry access recovered', 'The controller can read ownership and container state again.', 'Fresh capability evidence is still required for each model.'],
  shard_registry_unavailable: ['Credential registry unavailable', 'Ownership could not be refreshed. Admission pauses when the previous ownership lease expires.', 'Check registry connectivity; do not create replacement workers from missing authority.'],
  shard_or_container_registry_unavailable: ['Container inventory unavailable', 'The controller could not read the current container inventory.', 'Check the Docker service. Existing workers are not treated as deleted by this failure.'],
  credential_rejection_journal_unavailable: ['Could not update rejection journal', 'The controller could not persist a change to remembered credential rejections.', 'Check the local journal file and directory permissions.'],
  relay_drain_failed: ['Worker cleanup failed', 'The driver could not finish draining or removing a worker.', 'Inspect Docker availability and the worker state before retrying cleanup.'],
  telemetry_unavailable: ['Worker telemetry unavailable', 'The monitor could not collect a fresh telemetry snapshot. This alone does not disable the worker.', 'Inspect worker health. Retained running traces are marked unconfirmed when stale.'],
  telemetry_recovered: ['Worker telemetry recovered', 'Fresh request telemetry is available again.', 'The collection gap may contain requests that are no longer retained.'],
  request_accepted: ['Request accepted · HTTP 202', 'The worker accepted asynchronous work. This response does not mean execution has completed.', 'Open its worker trace to inspect execution, or follow the job status URL from the client.'],
  response_completed: ['Response delivered', 'The controller finished sending a successful HTTP response. Replayed results can also produce this event.', 'Use the worker trace for execution timing. Response events are not additional executions.'],
  request_failed: ['Request returned an error', 'The worker returned an unsuccessful HTTP response.', 'Inspect the worker trace for the recorded failure code.'],
  response_interrupted: ['Response interrupted', 'The response connection closed before delivery finished. Execution may still be running.', 'Check the existing job or trace before submitting duplicate work.'],
  model_capacity_exhausted: ['Request refused · all slots busy', 'Eligible workers for this model had no free capacity at admission.', 'Wait for work to finish, then retry according to the client response.'],
  model_temporarily_unavailable: ['Request refused · model unavailable', 'No worker had fresh, eligible capability evidence for this model.', 'Inspect model availability and worker health.'],
  federation_unavailable: ['Request refused · ownership stale', 'The controller could not establish fresh shard ownership.', 'Wait for registry recovery.'],
  server_draining: ['New requests paused for shutdown', 'The controller is draining accepted work before stopping.', 'Wait for the controller to restart.'],
  relay_admission_unknown: ['Acceptance could not be confirmed', 'The acknowledgement was lost. Execution may have started.', 'Inspect existing work before submitting another request.'],
  quota_exhausted: ['Provider quota exhausted', 'The provider reported a quota or rate limit.', 'Wait for quota recovery or use another eligible credential.'],
  credential_rejected_trace: ['Provider rejected credential', 'The provider did not authorize this attempt.', 'Replace the rejected credential and inspect worker cleanup events.'],
  upstream_timeout_or_disconnect: ['Provider connection interrupted', 'The upstream connection timed out or disconnected. The trace cannot distinguish network delay from provider delay.', 'Inspect attempts and the last observed phase.'],
  unclassified_failure: ['Execution failed · cause unclassified', 'The recorded failure does not establish a more specific cause.', 'Use the trace ID to correlate with private server diagnostics.'],
  client_cancelled: ['Request cancelled by client', 'The client disconnected or explicitly cancelled the work.', 'Check client behavior before retrying.'],
};
function explain(code) {
  if (code?.startsWith('drain_')) { const reason = code.slice(6); const causes = { credential_rejected: 'its credential was rejected', credential_rotated: 'its credential changed', shard_removed: 'its credential left the registry', duplicate_worker: 'another worker already owns this credential', worker_stopped: 'its container stopped', ownership_changed: 'ownership changed during startup or inspection' }; return ['Worker cleanup started', `The controller is retiring this worker because ${causes[reason] || 'its ownership is no longer valid'}.`, 'Wait for the cleanup-finished marker.']; }
  return explanations[code] || ['Request could not complete', 'The recorded code is shown below. A more specific cause is not established by this marker.', 'Inspect the matching request and worker state.'];
}
function workerRows() {
  const a = snapshot.availability, f = snapshot.fleet;
  const ids = new Set([...a.shards.map(s => s.shardId), ...a.invalidShards, ...f.retries.map(s => s.shardId), ...f.draining, ...f.cooldowns.map(s => s.shardId), ...(f.maintenance || []).map(s => s.shardId)]);
  return [...ids].map(id => {
    const shard = a.shards.find(s => s.shardId === id), retry = f.retries.find(s => s.shardId === id), cooldown = f.cooldowns.find(s => s.shardId === id);
    const eligible = a.models.filter(m => m.shardIds.includes(id) && m.eligibleShardCount > 0);
    let state, reason, level = 'info';
    if (f.draining.includes(id)) { state = 'Removing'; reason = 'Cleanup is in progress. New work cannot use this worker.'; }
    else if (f.maintenance?.some(s => s.shardId === id)) { state = 'Work paused'; reason = `Manual hold. Accepted jobs can finish; the current worker is retained.${a.invalidShards.includes(id) ? ' Credential rejected; replace it before resuming.' : ''}`; level = 'warning'; }
    else if (a.invalidShards.includes(id)) { state = 'Kept offline'; reason = 'Credential rejected. This revision stays offline until it is replaced.'; level = 'warning'; }
    else if (retry) { state = 'Retry scheduled'; reason = `Startup or inspection failed. Retry scheduled for ${time(retry.retryAt)}.`; level = 'warning'; }
    else if (cooldown) { state = 'Cooling down'; reason = `The credential is temporarily unavailable until ${date(cooldown.until)}.`; level = 'warning'; }
    else if (!a.registryFresh) { state = 'Ownership stale'; reason = 'New admissions are paused until ownership can be refreshed.'; level = 'error'; }
    else if (eligible.length) { state = shard.activeStreams + shard.queueDepth >= shard.capacity ? 'Busy' : 'Ready'; reason = `${plural(eligible.length, 'model')} eligible. ${shard.activeStreams} active operations; ${shard.queueDepth} queued.`; }
    else { state = 'Not ready'; reason = shard?.heartbeatExpiresAtMs <= snapshot.capturedAt ? 'The worker heartbeat expired.' : 'No fresh, eligible model evidence is available yet.'; level = 'warning'; }
    return { key: id, id, state, reason, level, shard, retry, cooldown, eligible: eligible.map(m => m.model) };
  }).sort((a, b) => Number(!!b.shard) - Number(!!a.shard) || a.id.localeCompare(b.id));
}
function inWindow(at) { return at >= snapshot.capturedAt - Number($('range').value); }
function records() {
  const q = $('search').value.trim().toLowerCase(), outcome = $('outcome').value;
  return (tab === 'events' ? snapshot.activity.events : tab === 'requests' ? snapshot.telemetry.traces : workerRows()).filter(r => {
    if (tab !== 'workers' && !inWindow(tab === 'events' ? r.at : r.startedAt)) return false;
    if (tab === 'events' && outcome !== 'all' && (outcome === 'issues' ? r.level === 'info' : r.category !== outcome)) return false;
    if (tab === 'requests' && outcome !== 'all' && (outcome === 'issues' ? !['failed', 'cancelled'].includes(r.status) && !r.stale : r.status !== outcome)) return false;
    if (tab === 'workers' && outcome !== 'all' && (outcome === 'issues' ? r.level === 'info' : r.state !== outcome)) return false;
    const searchable = tab === 'events' ? [r.code, ...explain(r.code), r.shardId, r.requestId, r.traceId, r.model, r.category] : tab === 'requests' ? [r.id, r.jobId, r.taskId, r.operation, r.requestedModel, r.model, r.shardId, r.status, r.error, ...r.spans.map(s => s.name)] : [r.id, r.state, r.reason, r.shard?.relayId, ...(r.shard?.models.map(m => m.model) || []), ...r.eligible];
    return !q || searchable.some(v => v?.toLowerCase().includes(q));
  }).sort((a, b) => tab === 'workers' ? 0 : (b.at || b.startedAt) - (a.at || a.startedAt));
}
function renderSummary() {
  const { availability: a, fleet: f, telemetry: t } = snapshot;
  const models = a.models.filter(m => m.eligibleShardCount > 0), eligibleIds = new Set(models.flatMap(m => m.shardIds));
  const active = a.shards.filter(s => eligibleIds.has(s.shardId)), used = active.reduce((n, s) => n + s.activeStreams, 0), capacity = active.reduce((n, s) => n + s.capacity, 0);
  const slotsFull = active.length > 0 && active.every(s => s.activeStreams + s.queueDepth >= s.capacity);
  const old = Date.now() - snapshot.capturedAt >= 15000 && !paused;
  let heading = 'Ready to serve', tone = 'good', reason = `${plural(models.length, 'model')} eligible for new work across ${plural(eligibleIds.size, 'eligible worker')}.`, badge = 'Serving';
  if (old || failureMessage) { heading = 'Current status unconfirmed'; tone = 'warning'; badge = 'Stale data'; reason = 'The last snapshot is retained below. Refresh to confirm current capacity.'; }
  else if (snapshot.admission.draining || !a.registryFresh) { heading = 'New requests paused'; tone = 'error'; badge = 'Not accepting'; reason = snapshot.admission.draining ? 'The controller is shutting down while accepted work finishes.' : 'Shard ownership is stale. New work resumes after the registry recovers.'; }
  else if (!models.length) { heading = 'No models ready'; tone = 'warning'; badge = 'Not accepting'; reason = 'No model has fresh, eligible worker evidence. Inspect workers for startup, cooldown or failure reasons.'; }
  else if (slotsFull) { heading = 'Serving · capacity busy'; tone = 'warning'; badge = 'At capacity'; reason = 'Eligible workers are busy. New requests may be refused until slots become available.'; }
  else if (snapshot.admission.pending) { heading = 'Serving · admissions pending'; badge = 'Checking work'; reason += ' The controller is holding admission slots; some may await acknowledgement.'; }
  $('health-title').textContent = paused ? `${heading} · paused view` : heading;
  $('health-tag').textContent = badge; $('health-tag').className = `tag ${tone}`; $('health-reason').textContent = reason;
  $('issue').hidden = false;
  $('issue-text').textContent = (a.invalidShards.length ? `${plural(f.runningCount, 'running worker')} · ${plural(a.invalidShards.length, 'rejected credential')} excluded from new work. Rejected revisions will not respawn.` : `${plural(f.runningCount, 'running worker')} for ${plural(f.desiredCount, 'registered credential')}. ${eligibleIds.size === 1 ? 'Only one eligible worker; there is no worker failover.' : 'Inspect workers for capacity and recovery details.'}`) + (f.maintenance?.length ? ` ${plural(f.maintenance.length, 'manual hold')} awaiting explicit resume.` : '');
  $('slots').textContent = a.registryFresh ? `${used} / ${capacity}` : 'Unconfirmed';
  const traces = t.traces.filter(r => inWindow(r.startedAt));
  $('requests-count').textContent = `${traces.length}${t.partial ? ' · partial' : ''}`;
  $('request-window').textContent = `${plural(t.traces.filter(r => r.status === 'running' && !r.stale).length, 'running request')} confirmed across the fleet`;
  $('failed-count').textContent = traces.filter(r => r.status === 'failed').length;
  const times = traces.filter(r => r.status === 'completed').map(r => r.durationMs).sort((a, b) => a - b), middle = Math.floor(times.length / 2);
  $('latency').textContent = times.length ? duration(times.length % 2 ? times[middle] : (times[middle - 1] + times[middle]) / 2) : '—';
  $('latency-note').textContent = times.length ? `${plural(times.length, 'completed execution')} in this window` : 'No completed executions in this window';
  const notices = [];
  if (failureMessage) notices.push(failureMessage);
  if (paused) notices.push(`Updates paused at ${time(snapshot.capturedAt)}. The time window and values are frozen.`);
  if (t.partial) notices.push(`Telemetry incomplete: ${t.sources.filter(s => s.fresh).length} of ${t.sources.length} worker sources are fresh. Missing data does not mean zero traffic.`);
  if (a.lastError) notices.push(`${explain(a.lastError)[0]} (${a.lastError}).`);
  $('notice').hidden = !notices.length; $('notice').textContent = notices.join(' ');
  $('count-events').textContent = snapshot.activity.events.length; $('count-requests').textContent = t.traces.length; $('count-workers').textContent = f.runningCount;
  $('coverage').textContent = `Events since ${date(snapshot.activity.startedAt)} · Worker traces retained up to 1 hour / 500 records; may include time before controller startup. ${snapshot.activity.evicted} events and ${t.evicted} collected traces expired or evicted. Workers report ${t.sources.reduce((n, s) => n + (s.evicted || 0), 0)} additional trace evictions. Background capability checks are not request traces. Times: ${Intl.DateTimeFormat().resolvedOptions().timeZone}.`;
}
function renderChart() {
  $('chart').hidden = tab === 'workers'; if (tab === 'workers') return;
  const span = Number($('range').value), start = snapshot.capturedAt - span, bins = Array.from({ length: 30 }, () => ({ count: 0, issues: 0 }));
  for (const r of filtered) { const at = tab === 'events' ? r.at : r.startedAt, bin = bins[Math.max(0, Math.min(29, Math.floor((at - start) / span * 30)))]; bin.count++; if (r.level && r.level !== 'info' || ['failed', 'cancelled'].includes(r.status) || r.stale) bin.issues++; }
  const max = Math.max(1, ...bins.map(b => b.count));
  $('histogram').replaceChildren(...bins.map((b, i) => { const el = node('span', undefined, `bin${b.issues ? ' hot' : ''}`); el.style.setProperty('--height', `${b.count / max * 100}%`); el.title = `${time(start + i * span / 30)}–${time(start + (i + 1) * span / 30)}: ${b.count} records, ${b.issues} issues`; el.append(node('i')); return el; }));
  $('histogram').setAttribute('aria-label', `${filtered.length} matching ${tab} from ${time(start)} to ${time(snapshot.capturedAt)}. Largest interval: ${max === 1 && !filtered.length ? 0 : max} records. Exact timestamps are in the table below.`);
  $('chart-start').textContent = time(start); $('chart-end').textContent = time(snapshot.capturedAt); $('chart-caption').textContent = `${tab === 'events' ? 'Event' : 'Request'} volume · amber marks issues`;
}
function selectRecord(key) { selected = key; render(); const heading = $('detail-heading'); heading?.focus({ preventScroll: true }); if (matchMedia('(max-width:800px)').matches) $('detail').scrollIntoView({ behavior: 'instant', block: 'start' }); }
function renderRows() {
  const headings = tab === 'events' ? ['Time', 'What happened', 'Type', 'Level'] : tab === 'requests' ? ['Started', 'Request / model', 'Duration', 'Outcome'] : ['State', 'Worker / reason', 'Slots', 'Models'];
  const head = node('tr'); headings.forEach((h, i) => { const th = node('th', h, i === 2 ? 'optional' : ''); th.scope = 'col'; head.append(th); }); $('columns').replaceChildren(head);
  const focused = document.activeElement?.dataset.key;
  $('rows').replaceChildren(...filtered.slice(0, limit).map(r => {
    const key = r.key || r.id, row = node('tr', undefined, selected === key ? 'selected' : ''), main = node('td'), b = button('', () => selectRecord(key), 'row-button');
    b.dataset.key = key; b.setAttribute('aria-expanded', String(selected === key));
    let first, third, fourth, tone;
    if (tab === 'events') { b.append(node('span', explain(r.code)[0]), node('small', r.model || r.shardId || r.code)); first = time(r.at); third = r.category; fourth = r.level; tone = r.level; }
    else if (tab === 'requests') { b.append(node('span', r.requestedModel || r.model || r.operation), node('small', r.status === 'running' ? `${r.stale ? 'Last observed: ' : ''}${r.spans.at(-1)?.name || 'Request intake'}` : r.error || `${r.operation} · ${r.id.slice(0, 8)}`)); first = time(r.startedAt); third = duration(r.durationMs); fourth = r.stale ? 'Unconfirmed' : r.status; tone = r.stale ? 'warning' : r.status === 'failed' ? 'error' : r.status === 'completed' ? 'good' : ''; }
    else { b.append(node('span', r.shard?.relayId || r.id), node('small', r.reason)); first = r.state; third = r.shard ? `${r.shard.activeStreams}/${r.shard.capacity}` : '—'; fourth = r.eligible.length; tone = r.level; }
    main.append(b); const firstCell = node('td', first, tab === 'workers' ? tone : 'muted'); if (tab !== 'workers') firstCell.title = new Date(r.at || r.startedAt).toISOString();
    row.append(firstCell, main, node('td', third, 'optional'), node('td', fourth, tone)); return row;
  }));
  if (focused) [...$('rows').querySelectorAll('button')].find(b => b.dataset.key === focused)?.focus({ preventScroll: true });
  $('empty').hidden = filtered.length > 0;
  const hasFilters = $('search').value || $('outcome').value !== 'all';
  $('empty').replaceChildren(node('h3', hasFilters ? 'No matching records' : tab === 'requests' ? 'No requests observed in this window' : tab === 'workers' ? 'No workers reported yet' : 'No events in this time window'), node('p', hasFilters ? 'Clear filters or widen the time window to see more.' : tab === 'requests' ? 'Requests will appear here as workers report them. This history is bounded; a gap does not prove there was no traffic.' : 'Refresh to check for new activity.' , 'muted'));
  $('result-count').textContent = `${filtered.length} matching ${tab === 'workers' ? 'credential states' : tab} ${tab === 'workers' ? `· ${plural(snapshot.fleet.runningCount, 'running worker')}` : `· ${$('range').selectedOptions[0].textContent.toLowerCase()}`}`;
  $('rows-note').textContent = `Showing ${Math.min(filtered.length, limit)} of ${filtered.length}. Select a row for its evidence and next step.`;
  $('more').hidden = filtered.length <= limit; $('export').disabled = !filtered.length;
}
function detailPair(dl, label, value, mono = false) { dl.append(node('dt', label)); const dd = node('dd'); dd.append(node(mono ? 'code' : 'span', value)); dl.append(dd); }
async function copy(value, b) { try { await navigator.clipboard.writeText(value); b.textContent = 'Copied'; $('announcement').textContent = 'Copied to clipboard.'; } catch { $('announcement').textContent = 'Clipboard unavailable. Select and copy the record ID shown in the details.'; } }
function renderDetail() {
  const all = tab === 'events' ? snapshot.activity.events : tab === 'requests' ? snapshot.telemetry.traces : workerRows(), r = all.find(r => (r.key || r.id) === selected);
  $('workspace').classList.toggle('closed', !selected); if (!selected) return;
  const focused = document.activeElement?.dataset.focus || (document.activeElement?.id === 'detail-heading' ? 'heading' : undefined);
  const metadataOpen = $('detail').querySelector('details')?.open;
  const aside = $('detail'), top = node('div', undefined, 'section-head'), title = node('h2', tab === 'events' && r ? explain(r.code)[0] : tab === 'requests' ? 'Request details' : tab === 'workers' ? 'Worker details' : 'Record unavailable'); title.id = 'detail-heading'; title.tabIndex = -1;
  const close = button('Close', closeDetail); close.dataset.focus = 'close'; top.append(title, close); aside.replaceChildren(top);
  if (!r) { aside.append(node('p', 'This record is no longer retained. Export records while they are available to keep a copy.')); return; }
  const dl = node('dl');
  if (tab === 'events') {
    const explanation = explain(r.code); aside.append(node('p', explanation[1]), node('h3', 'Next step'), node('p', explanation[2], 'muted'));
    detailPair(dl, 'Observed at', new Date(r.at).toISOString()); detailPair(dl, 'Marker', r.code, true); detailPair(dl, 'Event ID', r.id, true);
    for (const [field, label] of [['shardId', 'Worker credential ID'], ['generation', 'Worker generation'], ['requestId', 'Request ID'], ['traceId', 'Trace ID'], ['model', 'Requested model'], ['count', 'Count / attempt'], ['httpStatus', 'HTTP status']]) if (r[field] !== undefined) detailPair(dl, label, r[field], typeof r[field] === 'string');
    if (r.retryAt) detailPair(dl, 'Retry scheduled for', date(r.retryAt)); if (r.durationMs !== undefined) detailPair(dl, 'HTTP response duration', duration(r.durationMs));
    const trace = snapshot.telemetry.traces.find(t => t.id === r.traceId && (!r.shardId || t.shardId === r.shardId));
    if (trace) aside.append(button('Open execution trace', () => { changeTab('requests'); selectRecord(trace.key); }, 'link'));
  } else if (tab === 'requests') {
    const phase = r.spans.at(-1)?.name || 'Request intake';
    const cause = r.error ? explain(r.error === 'credential_rejected' ? 'credential_rejected_trace' : r.error) : null;
    aside.append(node('p', r.stale ? `Execution status is unconfirmed. Last observed in “${phase}” ${age(r.observedAt)}.` : r.status === 'running' ? `Running · ${phase}. Timing is measured through the last worker sample.` : r.status === 'attached' ? 'Attached to existing work. This is not a separate execution.' : cause ? cause[1] : `Execution ${r.status}.`));
    if (cause || r.stale) aside.append(node('h3', 'Next step'), node('p', r.stale ? 'Restore worker telemetry or inspect the existing job. Do not infer completion from an old running trace.' : cause[2], 'muted'));
    detailPair(dl, 'Started at', new Date(r.startedAt).toISOString()); detailPair(dl, 'Last observed', date(r.observedAt)); detailPair(dl, 'Trace ID', r.id, true);
    if (r.jobId || r.attachedToJobId) detailPair(dl, r.jobId ? 'Job ID' : 'Existing job ID', r.jobId || r.attachedToJobId, true);
    if (r.taskId) detailPair(dl, 'Task marker', r.taskId, true);
    detailPair(dl, 'Worker credential ID', r.shardId, true); detailPair(dl, 'Requested model', r.requestedModel || 'Not recorded');
    detailPair(dl, 'Time to first output', duration(r.firstOutputMs)); detailPair(dl, 'Total measured time', duration(r.durationMs)); detailPair(dl, 'Attempts / output chunks', `${r.attempts.length} / ${r.chunks}`);
    if (r.httpStatus) detailPair(dl, 'Admission HTTP status', `${r.httpStatus}${r.httpStatus === 202 ? ' · accepted asynchronously' : ''}`);
    if (r.error) detailPair(dl, 'Failure marker', r.error, true);
    aside.append(node('p', `${duration(r.durationMs)} measured · first output ${duration(r.firstOutputMs).toLowerCase()}`, 'muted'), node('h3', 'Execution timeline'), node('p', 'Bars share a time scale. Each phase may include both network and provider time.', 'muted'));
    const timeline = node('div', undefined, 'timeline');
    for (const s of r.spans) { const end = s.endMs ?? r.durationMs, el = node('div', undefined, 'phase'), label = node('div', undefined, 'phase-label'); label.append(node('span', `${s.name}${s.attempt ? ` · attempt ${s.attempt}` : ''}`), node('span', duration(Math.max(0, end - s.startMs)))); const track = node('div', undefined, 'track'), bar = node('div', undefined, `bar${s.endMs === undefined ? ' active' : ''}`); bar.style.setProperty('--start', `${s.startMs / Math.max(1, r.durationMs) * 100}%`); bar.style.setProperty('--width', `${Math.max(.5, (end - s.startMs) / Math.max(1, r.durationMs) * 100)}%`); track.append(bar); track.setAttribute('aria-hidden', 'true'); el.append(label, track, node('small', `${duration(s.startMs)}–${duration(end)} · ${s.layer}${s.endMs === undefined ? ' · ongoing at last observation' : ''}`)); timeline.append(el); }
    aside.append(timeline); if (r.droppedSpans) aside.append(node('p', `${r.droppedSpans} phases omitted by the trace retention limit.`, 'warning'));
    if (r.attempts.length) { aside.append(node('h3', 'Attempts')); for (const a of r.attempts) { aside.append(node('p', `Attempt ${a.number} · ${a.error ? explain(a.error)[0] : a.endMs === undefined ? 'Ongoing at last observation' : 'Finished'}`), node('small', `${duration(a.startMs)}–${duration(a.endMs ?? r.durationMs)}${a.error ? ` · ${a.error}` : ''}`)); } }
    const metadata = node('details'); metadata.open = !!metadataOpen; const summary = node('summary', 'Identifiers and timing details'); summary.dataset.focus = 'metadata'; metadata.append(summary, dl); aside.append(metadata);
  } else {
    aside.append(node('p', r.reason), node('p', r.state === 'Kept offline' ? 'Replace this credential through the host administration flow. The read-only monitor cannot change credentials or restart workers.' : 'The controller reconciles one worker per eligible credential. Model count does not create extra workers.', 'muted'));
    detailPair(dl, 'Worker credential ID', r.id, true); detailPair(dl, 'State', r.state);
    if (r.shard) { detailPair(dl, 'Container', r.shard.relayId, true); detailPair(dl, 'Generation', r.shard.generation, true); detailPair(dl, 'Heartbeat observed', date(r.shard.heartbeatObservedAtMs)); detailPair(dl, 'Inventory observed', date(r.shard.lastCapabilityRefreshMs)); detailPair(dl, 'Active / capacity / queued', `${r.shard.activeStreams} / ${r.shard.capacity} / ${r.shard.queueDepth}`); }
    if (r.retry) detailPair(dl, 'Next retry', `${date(r.retry.retryAt)} · attempt ${r.retry.attempts}`);
    if (r.cooldown) detailPair(dl, 'Cooldown ends', date(r.cooldown.until));
    detailPair(dl, 'Eligible models', r.eligible.join(', ') || 'None');
    const workspaces = (snapshot.desktops || []).filter(d => d.shardId === r.id);
    aside.append(node('h3', 'Repair workspaces'), node('p', workspaces.length ? 'Separate desktops linked to this shard. Desktop health and shard health are independent.' : 'Link or create a separate desktop for manual investigation.', 'muted'));
    for (const workspace of workspaces) { const link = node('a', workspace.name, 'link'); link.href = '/desktops#desktop=' + encodeURIComponent(workspace.id); aside.append(link); }
    const openDesktop = node('a', workspaces.length ? 'Open shard workspace' : 'Set up a repair workspace', 'link'); openDesktop.href = '/desktops#shard=' + encodeURIComponent(r.id); aside.append(openDesktop);
    if (r.shard?.models.length) { const evidence = node('details'); evidence.open = !!metadataOpen; const summary = node('summary', 'Reported model evidence'); summary.dataset.focus = 'metadata'; evidence.append(summary); for (const m of r.shard.models.slice(0, 50)) evidence.append(node('p', m.model), node('small', `${m.state} · ${m.expiresAtMs > snapshot.capturedAt ? 'Fresh' : 'Expired'} · observed ${date(m.observedAtMs)}${m.restoreAfterMs > snapshot.capturedAt ? ` · retry after ${date(m.restoreAfterMs)}` : ''}${m.reason ? ` · ${m.reason}` : ''}`)); if (r.shard.models.length > 50) evidence.append(node('p', 'Showing the first 50 models; export this worker for its full inventory.')); aside.append(evidence); }
    const source = snapshot.telemetry.sources.find(s => s.shardId === r.id); if (source) detailPair(dl, 'Telemetry collection', `${source.fresh ? 'Fresh' : 'Unconfirmed'} · ${age(source.lastSuccessAt)}`);
    aside.append(button('Show worker events', () => { changeTab('events'); $('search').value = r.id; render(); }, 'link'));
  }
  if (tab !== 'requests') aside.append(dl);
  const actions = node('div', undefined, 'detail-actions'), copyId = button('Copy ID', () => void copy(r.id, copyId)); copyId.dataset.focus = 'copy'; actions.append(copyId, button('Export record', () => download([r]))); aside.append(actions);
  if (focused === 'heading') title.focus({ preventScroll: true });
  else if (focused) [...aside.querySelectorAll('[data-focus]')].find(b => b.dataset.focus === focused)?.focus({ preventScroll: true });
}
function renderModels() { $('models-section').hidden = tab !== 'workers'; if (tab !== 'workers') return;
  $('models').replaceChildren(...snapshot.availability.models.map(m => { const r = node('tr'), cell = node('td'); cell.append(button(m.model, () => { $('search').value = m.model; $('outcome').value = 'all'; render(); }, 'link')); r.append(cell, node('td', m.eligibleShardCount), node('td', m.eligibleShardCount === 0 ? 'Unavailable' : m.eligibleShardCount === 1 ? 'Available · no failover' : 'Available · failover capacity', m.eligibleShardCount === 0 ? 'warning' : 'good')); return r; }));
}
function render() { if (!snapshot) return; filtered = records(); renderSummary(); renderChart(); renderRows(); renderDetail(); renderModels(); }
function closeDetail() { const key = selected; selected = undefined; render(); [...$('rows').querySelectorAll('button')].find(b => b.dataset.key === key)?.focus({ preventScroll: true }); }
function changeTab(next) {
  tab = next; selected = undefined; limit = 100; $('search').value = '';
  for (const name of ['events', 'requests', 'workers']) { const active = name === tab; $(`tab-${name}`).setAttribute('aria-selected', String(active)); $(`tab-${name}`).tabIndex = active ? 0 : -1; }
  $('panel').setAttribute('aria-labelledby', `tab-${tab}`); $('range').disabled = tab === 'workers';
  const options = tab === 'events' ? [['all', 'All events'], ['issues', 'Warnings & errors'], ['fleet', 'Fleet changes'], ['request', 'Request responses'], ['telemetry', 'Telemetry health']] : tab === 'requests' ? [['all', 'All outcomes'], ['issues', 'Failed / cancelled / unconfirmed'], ['running', 'Running'], ['completed', 'Completed'], ['attached', 'Attached to existing']] : [['all', 'All workers'], ['issues', 'Needs attention'], ['Ready', 'Ready'], ['Busy', 'Busy'], ['Work paused', 'Work paused'], ['Kept offline', 'Kept offline']];
  $('outcome').replaceChildren(...options.map(([value, label]) => { const o = node('option', label); o.value = value; return o; })); render();
}
function download(records) { const blob = new Blob([JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), capturedAt: snapshot.capturedAt, view: tab, filter: { search: $('search').value, outcome: $('outcome').value, windowMs: tab === 'workers' ? null : Number($('range').value) }, coverage: { activityStartedAt: snapshot.activity.startedAt, telemetryPartial: snapshot.telemetry.partial, tracesEvicted: snapshot.telemetry.evicted }, records }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob), link = node('a'); link.href = url; link.download = `relay-${tab}-${new Date(snapshot.capturedAt).toISOString().replaceAll(':', '-')}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); $('announcement').textContent = `Exported ${records.length} records.`; }
async function refresh(manual = false) {
  if (busy || !connected || paused && !manual) return;
  busy = true; $('refresh').disabled = true; const current = version;
  try { const response = await fetch('/api/monitor/state', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (current !== version) return;
    if ([401, 403].includes(response.status)) { connected = false; location.replace('/federation'); return; }
    if (!response.ok) throw new Error(`Could not refresh (HTTP ${response.status}). Last snapshot is retained; use Refresh to retry.`);
    const next = await response.json(); if (current !== version) return;
    if (!next.availability || !next.telemetry || !next.activity || !next.fleet) throw new Error('Monitor data is incomplete. Use Refresh to retry.');
    snapshot = next; failureMessage = ''; if (initialShard) { const id = initialShard; initialShard = undefined; changeTab('workers'); $('search').value = id; selected = id; } render(); $('connection').textContent = `${paused ? 'Paused' : 'Live · updates every 3 s'} · updated ${time(snapshot.capturedAt)}`;
  } catch (error) { if (current !== version) return; failureMessage = error.name === 'TimeoutError' ? 'Refresh timed out. Last snapshot is retained; use Refresh to retry.' : error.message === 'Failed to fetch' ? 'Connection lost. Last snapshot is retained; check the relay and use Refresh.' : error.message; $('connection').textContent = 'Disconnected · retrying while updates are live'; if (snapshot) render(); else { $('notice').hidden = false; $('notice').textContent = failureMessage; $('health-title').textContent = 'Status unavailable'; $('health-reason').textContent = 'No current snapshot has been received. Check that the relay is running, then refresh.'; } }
  finally { busy = false; $('refresh').disabled = false; }
}
$('refresh').onclick = () => void refresh(true);
$('pause').onclick = () => { paused = !paused; version++; $('pause').textContent = paused ? 'Resume updates' : 'Pause updates'; $('pause').setAttribute('aria-pressed', String(paused)); $('connection').textContent = paused ? `Paused${snapshot ? ` at ${time(snapshot.capturedAt)}` : ''}` : 'Resuming updates…'; render(); if (!paused) void refresh(); };
$('disconnect').onclick = async () => { try { const res = await fetch('/api/monitor/session', { method: 'DELETE', credentials: 'same-origin', signal: AbortSignal.timeout(5000) }); if (!res.ok) throw new Error(); connected = false; version++; location.replace('/federation'); } catch { $('notice').hidden = false; $('notice').textContent = 'Could not disconnect. Check the relay connection and try again.'; } };
$('search').oninput = () => { limit = 100; render(); }; $('range').onchange = () => { limit = 100; render(); }; $('outcome').onchange = () => { limit = 100; render(); };
$('clear').onclick = () => { $('search').value = ''; $('outcome').value = 'all'; $('range').value = '3600000'; limit = 100; render(); };
$('more').onclick = () => { limit += 100; renderRows(); }; $('export').onclick = () => download(filtered);
$('inspect-workers').onclick = () => { changeTab('workers'); $('explorer').scrollIntoView({ behavior: 'instant' }); $('tab-workers').focus({ preventScroll: true }); };
for (const name of ['events', 'requests', 'workers']) $(`tab-${name}`).onclick = () => changeTab(name);
document.querySelector('[role=tablist]').onkeydown = e => { const names = ['events', 'requests', 'workers']; if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return; e.preventDefault(); const i = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (names.indexOf(e.target.id.replace('tab-', '')) + (e.key === 'ArrowRight' ? 1 : 2)) % 3; changeTab(names[i]); $(`tab-${tab}`).focus(); };
document.addEventListener('keydown', e => { if (e.key === '/' && !e.metaKey && !e.ctrlKey && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) { e.preventDefault(); $('search').focus(); } if (e.key === 'Escape' && selected && document.activeElement !== $('search')) closeDetail(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
setInterval(() => { if (!document.hidden) void refresh(); }, 3000);
void refresh();
