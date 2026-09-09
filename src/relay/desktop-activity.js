// Private administrator surface. Summaries never include guest I/O or raw engine errors.
const $ = id => document.getElementById(id);
const node = (tag, text) => { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; return element; };
const actions = { creating: 'Create desktop', starting: 'Start desktop', stopping: 'Stop desktop', deleting: 'Delete desktop', linking: 'Update link', refreshing_credentials: 'Refresh sign-in', opening_signin: 'Open sign-in window' };
const outcomes = { queued: 'Queued', running: 'In progress', completed: 'Completed', failed: 'Needs attention' };
const guidance = {
  credential_account_mismatch: 'Sign in to the account assigned to the linked shard. The serving credential was kept.',
  credential_invalid: 'Complete a supported OAuth login in Terminal, then check again.',
  credential_expired: 'The saved login is expired. Sign in again in Terminal.',
  credential_older: 'The registry has a newer login. Complete a fresh sign-in.',
  credential_rejected: 'The provider rejected this login. Sign in again before retrying.',
  credential_check_unavailable: 'The sign-in check was unavailable. Automatic sync will retry.',
  credential_registry_unavailable: 'The registry could not confirm the update. Check sign-in status in the workspace.',
  credential_conflict: 'The workspace or credential changed. Refresh and check again.',
  credential_not_allowed: 'Review the linked shard’s registry status before refreshing its login.',
  desktop_capacity: 'Running capacity is full. Open a workspace you can stop, then try again.',
  desktop_limit: 'The saved workspace limit is reached. Delete an unused workspace before creating another.',
  desktop_not_ready: 'The desktop service is unavailable. Check the host, refresh status, then try again.',
  desktop_inventory_unavailable: 'Workspace status could not be verified. Refresh status before trying again.',
  desktop_confirmation_required: 'The confirmation name did not match. Open the workspace and enter its current name.',
  desktop_conflict: 'This request belongs to another workspace. Refresh status before creating a new workspace.',
  desktop_not_found: 'The workspace is no longer available. Choose an existing workspace.',
  desktop_operation_failed: 'The action could not finish. Open the workspace and check its current state before trying again.'
};
const time = at => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
const seconds = ms => `${(Math.max(0, ms) / 1000).toFixed(1)} s`;

export class DesktopActivityView {
  constructor({ openWorkspace, announce }) {
    this.openWorkspace = openWorkspace; this.announce = announce;
    this.rows = new Map(); this.read = new Map(); this.held = false; this.selected = null; this.visible = [];
    for (const id of ['activity-filter', 'activity-status']) $(id).onchange = () => this.reset();
    $('activity-search').oninput = () => this.reset();
    $('activity-follow').onclick = () => { this.held = !this.held; this.render(); };
    $('activity-new').onclick = () => { this.held = false; this.render(); $('activity-list').scrollTop = 0; $('activity-follow').focus(); };
    $('activity-list').addEventListener('scroll', () => { if (!this.held && $('activity-list').scrollTop > 8) { this.held = true; this.render(); } }, { passive: true });
    // Preserve keyboard focus and ordering as soon as someone starts reading a row.
    $('activity-list').addEventListener('focusin', () => { if (!this.held) { this.held = true; this.render(); } });
    $('activity-prev').onclick = () => this.move(-1);
    $('activity-next').onclick = () => this.move(1);
    $('activity-detail-close').onclick = () => this.closeDetail();
    $('activity-open').onclick = () => { const event = this.read.get(this.selected); if (this.snapshot.desktops.some(d => d.id === event?.desktopId)) this.openWorkspace(event.desktopId); };
    $('activity-copy').onclick = async () => {
      const event = this.read.get(this.selected); if (!event) return;
      try { await navigator.clipboard.writeText(event.id); this.announce('Activity reference copied.'); }
      catch { this.announce('Clipboard unavailable. Select the reference shown above and copy it.'); }
    };
    $('activity-export').onclick = () => this.export();
    $('activity-panel').addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.selected) { event.preventDefault(); event.stopPropagation(); this.closeDetail(); return; }
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest('input,select,textarea,summary')) return;
      if (['ArrowDown', 'ArrowUp'].includes(event.key) && event.target.closest('#activity-list, #activity-detail')) {
        event.preventDefault(); this.move(event.key === 'ArrowDown' ? 1 : -1);
      }
    });
  }
  update(snapshot, workspace) {
    const scopeChanged = workspace !== this.workspace && $('activity-filter').value === 'selected';
    const restarted = this.snapshot?.activityHistory?.startedAt !== snapshot.activityHistory?.startedAt;
    this.snapshot = snapshot; this.workspace = workspace;
    if (scopeChanged || restarted) { this.read.clear(); this.selected = null; this.held = false; }
    $('operation-summary').textContent = `${snapshot.activeOperations || 0} in progress · ${snapshot.queuedOperations || 0} queued · ${snapshot.inventoryFresh ? 'updates every 3 s' : 'status delayed'}`;
    if (!$('activity-panel').hidden) this.render();
  }
  matches(event) {
    const status = $('activity-status').value, query = $('activity-search').value.trim().toLocaleLowerCase();
    return ($('activity-filter').value !== 'selected' || event.desktopId === this.workspace)
      && (status === 'all' || (status === 'active' ? ['queued', 'running'].includes(event.outcome) : event.outcome === status))
      && (!query || `${event.name} ${actions[event.action] || 'Workspace action'} ${outcomes[event.outcome] || ''}`.toLocaleLowerCase().includes(query));
  }
  reset() { this.selected = null; this.held = false; this.read.clear(); this.render(); $('activity-list').scrollTop = 0; }
  toggle(open) {
    $('activity-panel').hidden = !open; $('activity-toggle').setAttribute('aria-expanded', String(open));
    if (open && this.snapshot) { this.render(); $('activity-search').focus({ preventScroll: true }); if (matchMedia('(max-width:1100px)').matches) $('activity-panel').scrollIntoView({ block: 'start', behavior: 'instant' }); }
  }
  render() {
    if (!this.snapshot) return;
    const all = new Map((this.snapshot.activity || []).map(event => [event.id, event]));
    const matches = [...all.values()].filter(event => this.matches(event));
    // A held list keeps membership and position, but existing rows still receive live outcomes.
    if (!this.held) this.read = new Map(matches.map(event => [event.id, event]));
    else for (const [id] of this.read) if (all.has(id)) this.read.set(id, all.get(id));
    const newCount = matches.filter(event => !this.read.has(event.id)).length;
    $('activity-follow').textContent = this.held ? 'Resume list' : 'Hold list';
    $('activity-follow').setAttribute('aria-pressed', String(this.held));
    $('activity-new').hidden = !this.held || !newCount; $('activity-new').textContent = `Show ${newCount} new`;
    this.visible = [...this.read.values()];
    const list = $('activity-list');
    for (const [id, row] of this.rows) if (!this.read.has(id)) { row.remove(); this.rows.delete(id); }
    this.visible.forEach((event, index) => {
      let row = this.rows.get(event.id);
      if (!row) {
        row = node('li'); const button = node('button'); button.type = 'button'; button.className = 'activity-row'; button.dataset.activity = event.id;
        const stamp = node('time'), text = node('span'), name = node('strong'), action = node('small'), outcome = node('span');
        text.append(name, action); button.append(stamp, text, outcome); row.append(button);
        button.onclick = () => this.select(event.id); this.rows.set(event.id, row);
      }
      const button = row.firstChild, [stamp, text, outcome] = button.children;
      const signature = JSON.stringify(event);
      if (row.activitySignature !== signature) {
        stamp.textContent = time(event.at); stamp.dateTime = new Date(event.at).toISOString(); stamp.title = new Date(event.at).toLocaleString();
        text.children[0].textContent = event.name; text.children[1].textContent = actions[event.action] || 'Workspace action';
        outcome.textContent = outcomes[event.outcome] || 'Recorded'; outcome.className = `event-outcome outcome-${event.outcome}`;
        row.activitySignature = signature;
      }
      button.setAttribute('aria-current', String(this.selected === event.id));
      if (list.children[index] !== row) list.insertBefore(row, list.children[index] || null);
    });
    $('activity-empty').hidden = !!this.visible.length;
    $('activity-empty').textContent = (this.snapshot.activity || []).length ? 'No activity matches these filters. Try another status or workspace.' : 'No workspace actions recorded yet. New actions will appear here.';
    $('activity-export').disabled = !this.visible.length;
    const history = this.snapshot.activityHistory;
    $('activity-count').textContent = `${this.visible.length} ${this.visible.length === 1 ? 'action' : 'actions'} shown · ${this.held ? 'List held; health and work continue' : 'Newest first'} · ${history?.evicted ? `Latest ${history.capacity} actions retained` : 'Since controller started'}`;
    this.detail();
  }
  select(id) {
    if (this.selected !== id) $('activity-diagnostics').open = false;
    this.selected = id; this.held = true; this.render();
    $('activity-detail-title').focus({ preventScroll: true });
    if (matchMedia('(max-width:1100px)').matches) { $('activity-body').scrollTop = 0; $('activity-panel').scrollIntoView({ block: 'start', behavior: 'instant' }); }
  }
  move(delta) {
    const index = this.visible.findIndex(event => event.id === this.selected), next = index < 0 ? 0 : index + delta;
    if (this.visible[next]) this.select(this.visible[next].id);
  }
  closeDetail() {
    const id = this.selected; this.selected = null; this.render();
    (this.rows.get(id)?.firstChild || $('activity-search')).focus({ preventScroll: true });
  }
  detail() {
    const event = this.read.get(this.selected);
    $('activity-detail').hidden = !event; $('activity-body').classList.toggle('has-detail', !!event);
    if (!event) return;
    const index = this.visible.findIndex(row => row.id === event.id);
    $('activity-position').textContent = `${index + 1} of ${this.visible.length}`;
    $('activity-prev').disabled = index <= 0; $('activity-next').disabled = index >= this.visible.length - 1;
    $('activity-detail-title').textContent = `${actions[event.action] || 'Workspace action'} · ${event.name}`;
    $('activity-detail-status').textContent = outcomes[event.outcome] || 'Recorded'; $('activity-detail-status').className = `outcome-${event.outcome}`;
    const message = event.outcome === 'failed' ? guidance[event.code] || guidance.desktop_operation_failed : event.outcome === 'queued' ? 'Waiting for an operation slot. Other workspaces remain available.' : event.outcome === 'running' ? 'This action is still in progress. You can continue in another workspace.' : 'The action completed. Open the workspace to see its current state.';
    const retained = (this.snapshot.activity || []).some(row => row.id === event.id);
    $('activity-guidance').textContent = `${message}${retained ? '' : ' This saved view has left the retained history; export it before resuming the list.'}`;
    const exists = this.snapshot.desktops.some(d => d.id === event.desktopId);
    $('activity-open').disabled = !exists; $('activity-open').textContent = exists ? 'Open workspace' : 'Workspace unavailable';
    const timings = [['Reference', event.id], ['Requested', new Date(event.at).toLocaleString()],
      ['Started', event.startedAt === undefined ? event.outcome === 'queued' ? 'Waiting' : 'No separate start phase' : new Date(event.startedAt).toLocaleString()],
      ['Finished', event.finishedAt === undefined ? 'Not yet' : new Date(event.finishedAt).toLocaleString()]];
    if (event.startedAt !== undefined) timings.push(['Queue wait', seconds(event.startedAt - event.at)]);
    if (event.durationMs !== undefined) timings.push(['Execution time', seconds(event.durationMs)]);
    if (event.code && guidance[event.code]) timings.push(['Reason code', event.code]);
    // Rebuild only non-interactive timing text; controls, disclosure and focus stay in place.
    const signature = JSON.stringify(timings);
    if (this.timingSignature !== signature) {
      $('activity-timing').replaceChildren(...timings.flatMap(([label, value]) => [node('dt', label), node('dd', value)]));
      this.timingSignature = signature;
    }
  }
  export() {
    const records = this.visible.map(event => ({ workspace: event.name, action: actions[event.action] || 'Workspace action',
      status: outcomes[event.outcome] || 'Recorded', requestedAt: new Date(event.at).toISOString(),
      ...(event.finishedAt === undefined ? {} : { finishedAt: new Date(event.finishedAt).toISOString() }),
      ...(event.durationMs === undefined ? {} : { durationMs: event.durationMs }) }));
    const blob = new Blob([JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), records }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = node('a'); link.href = url; link.download = 'workspace-activity.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); this.announce(`Exported ${records.length} activity summaries.`);
  }
}
