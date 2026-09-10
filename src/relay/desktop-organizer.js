const $ = id => document.getElementById(id);
const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
const button = (text, run, label) => { const node = el('button', text); node.type = 'button'; node.onclick = run; if (label) node.setAttribute('aria-label', label); return node; };
const healthNames = { attention: 'Needs attention', ready: 'Healthy', paused: 'Paused', setup: 'Setup', unknown: 'Unconfirmed' };

/** Presentation only. Unknown evidence never becomes a healthy workspace. */
export function workspaceHealth(desktop, relay, fresh = true) {
  if (!fresh || desktop.state === 'unknown') return { bucket: 'unknown', label: 'Status delayed' };
  if (desktop.credentialSync?.state === 'error') return { bucket: 'attention', label: 'Sign-in needs attention' };
  if (['error', 'unhealthy', 'missing'].includes(desktop.state)) return { bucket: 'attention', label: 'Desktop needs attention' };
  if (!desktop.relayId) return { bucket: 'setup', label: 'No linked shard' };
  if (!relay) return { bucket: 'attention', label: 'Linked shard unavailable' };
  if (!relay.registryFresh || ['stale', 'unknown'].includes(relay.health)) return { bucket: 'unknown', label: 'Shard health unconfirmed' };
  if (['expired', 'rejected', 'degraded', 'unavailable', 'offline'].includes(relay.health)) return { bucket: 'attention', label: ({ expired: 'Sign-in expired', rejected: 'Sign-in rejected', degraded: 'Shard degraded', unavailable: 'Shard unavailable', offline: 'Worker offline' })[relay.health] };
  if (relay.paused || relay.health === 'cooldown') return { bucket: 'paused', label: relay.paused ? 'New work paused' : 'Cooling down' };
  if (relay.health === 'healthy' && relay.workerState === 'running' && relay.eligibleModels > 0) return { bucket: 'ready', label: 'Shard healthy' };
  return { bucket: 'setup', label: 'Waiting for serving capacity' };
}

export function matchesWorkspaceStatus(desktop, relay, filters, fresh = true) {
  if (!filters.healthy && !filters.deactivated) return true;
  const healthy = workspaceHealth(desktop, relay, fresh).bucket === 'ready';
  const deactivated = fresh && desktop.state !== 'unknown' && (desktop.state === 'stopped' || relay?.registryFresh && relay.paused === true);
  return !!(filters.healthy && healthy || filters.deactivated && deactivated);
}

export class DesktopOrganizer {
  constructor({ api, refresh, openDesktop, createDesktop, currentId, releaseInput }) {
    Object.assign(this, { api, refresh, openDesktop, createDesktop, currentId, releaseInput });
    this.tab = 'health'; this.busy = false; this.signature = ''; this.message = ''; this.failed = false;
    $('open-organizer').onclick = () => this.open();
    $('close-organizer').onclick = () => this.close();
    $('organizer-new-desktop').onclick = () => { this.close(); createDesktop(); };
    $('organizer-add-tab').onclick = () => this.editGroup();
    $('organizer-search').oninput = () => this.render();
    for (const status of ['healthy', 'deactivated']) $('organizer-' + status).onchange = () => this.render();
    $('organizer-clear-filters').onclick = () => { $('organizer-healthy').checked = false; $('organizer-deactivated').checked = false; this.render(); $('organizer-healthy').focus(); };
    $('organizer-tabs').onkeydown = event => this.tabKeys(event);
    $('group-form').onsubmit = event => { event.preventDefault(); void this.saveGroup(); };
    $('group-cancel').onclick = () => $('group-dialog').close();
    $('group-remove').onclick = () => {
      $('group-remove-confirm').hidden = false; $('group-remove').hidden = true; $('group-name').disabled = true; $('group-save').hidden = true; $('group-confirm-remove').focus();
    };
    $('group-confirm-remove').onclick = async () => { if (await this.mutate({ action: 'remove', groupId: this.editingId }, 'Tab removed. Its workspaces are now Ungrouped.')) { this.tab = 'groups'; $('group-dialog').close(); this.render(); } };
    $('group-left').onclick = () => void this.reorderGroup(-1);
    $('group-right').onclick = () => void this.reorderGroup(1);
    $('move-cancel').onclick = () => $('move-dialog').close();
    $('move-group').onchange = () => this.movePositions();
    $('move-form').onsubmit = async event => {
      event.preventDefault();
      if (await this.mutate({ action: 'move', desktopId: this.movingId, groupId: $('move-group').value || null, beforeId: $('move-position').value || null }, 'Workspace moved.')) $('move-dialog').close();
    };
    for (const id of ['group-dialog', 'move-dialog']) $(id).addEventListener('close', () => { this.render(); const node = document.querySelector(`[data-org-focus="${this.restoreFocus || ''}"]`); (node || $('organizer-add-tab')).focus({ preventScroll: true }); });
    document.addEventListener('dragend', () => { if (this.drag) { this.drag = undefined; this.clearDrop(); this.render(); } });
    const fragment = new URLSearchParams(location.hash.slice(1));
    if (fragment.get('view') === 'workspaces') this.open(fragment.get('tab') || 'health', false);
  }
  get isOpen() { return !$('organizer').hidden; }
  get canEdit() { return !this.busy && !this.failed && this.snapshot?.journalHealthy && this.snapshot?.organization?.available; }
  get filters() { return { healthy: $('organizer-healthy').checked, deactivated: $('organizer-deactivated').checked }; }
  groups() { return [{ id: 'ungrouped', name: 'Ungrouped', desktopIds: this.snapshot?.organization?.ungrouped || [] }, ...(this.snapshot?.organization?.groups || [])]; }
  open(tab = this.tab, focus = true) {
    const fragment = new URLSearchParams(location.hash.slice(1));
    if (fragment.get('view') === 'workspaces') for (const status of ['healthy', 'deactivated']) $('organizer-' + status).checked = (fragment.get('status') || '').split(',').includes(status);
    this.releaseInput(); this.tab = tab; $('organizer').hidden = false; document.body.classList.add('organizing'); document.body.classList.remove('zen', 'sidebar-open');
    $('sidebar-toggle').setAttribute('aria-expanded', 'false'); $('zen').setAttribute('aria-pressed', 'false'); $('zen').textContent = 'Zen view';
    this.render(); this.url(); if (focus) $('organizer-title').focus();
  }
  close(focus = true) {
    $('organizer').hidden = true; document.body.classList.remove('organizing');
    const id = this.currentId(); history.replaceState(null, '', location.pathname + (id ? '#desktop=' + id : ''));
    if (focus) { $('open-organizer').focus(); void this.refresh(); }
  }
  url() { if (!this.isOpen) return; const hash = new URLSearchParams({ view: 'workspaces', tab: this.tab }); const id = this.currentId(); if (id) hash.set('desktop', id); const statuses = Object.keys(this.filters).filter(status => this.filters[status]); if (statuses.length) hash.set('status', statuses.join(',')); history.replaceState(null, '', location.pathname + '#' + hash); }
  update(snapshot, failed) { this.snapshot = snapshot; this.failed = !!failed; this.render(); }
  status(text = this.message) { $('organizer-status').textContent = this.failed ? 'Status delayed. Refresh before changing organization.' : this.snapshot?.organization?.available === false ? 'Saved organization is unavailable. Ask the host administrator to restore it.' : this.busy ? 'Saving organization…' : text; }
  async mutate(body, message) {
    if (!this.canEdit) return false;
    this.busy = true; this.message = ''; this.render();
    try {
      const organization = await this.api('organization', { ...body, expectedRevision: this.snapshot.organization.revision });
      this.snapshot.organization = organization; this.message = message; return true;
    } catch (error) {
      this.message = error.message;
      if ($('group-dialog').open) $('group-error').textContent = error.message;
      if ($('move-dialog').open) $('move-error').textContent = error.message;
      return false;
    } finally { await this.refresh(); this.busy = false; this.render(); }
  }
  render() {
    if (!this.snapshot || !this.isOpen) return;
    const groups = this.groups(), tabs = [{ id: 'health', name: 'By health' }, { id: 'groups', name: 'All groups' }, ...groups];
    if (!tabs.some(t => t.id === this.tab)) this.tab = 'health';
    const query = $('organizer-search').value.trim().toLowerCase(), relays = new Map(this.snapshot.relays.map(r => [r.id, r]));
    const fresh = this.snapshot.inventoryFresh && !this.failed, filters = this.filters, filtered = filters.healthy || filters.deactivated;
    const desktops = this.snapshot.desktops.map(d => ({ ...d, health: workspaceHealth(d, relays.get(d.relayId), fresh) }));
    const matching = desktops.filter(d => matchesWorkspaceStatus(d, relays.get(d.relayId), filters, fresh) && [d.name, d.relayId || '', d.health.label].some(value => value.toLowerCase().includes(query))), map = new Map(matching.map(d => [d.id, d]));
    const scope = groups.find(g => g.id === this.tab)?.desktopIds || desktops.map(d => d.id), visible = scope.filter(id => map.has(id)).length;
    const countText = query || filtered || !['health', 'groups'].includes(this.tab) ? `${visible} of ${scope.length} workspaces` : `${desktops.length} workspaces · organization saved on this controller`;
    this.status(); if ($('organizer-count').textContent !== countText) $('organizer-count').textContent = countText;
    $('organizer-clear-filters').hidden = !filtered;
    $('organizer-add-tab').disabled = !this.canEdit || this.snapshot.organization.groups.length >= this.snapshot.organization.maxGroups;
    $('organizer-new-desktop').disabled = !this.snapshot.available;
    for (const id of ['group-save', 'group-confirm-remove', 'move-save', 'group-left', 'group-right', 'group-remove']) $(id).disabled = !this.canEdit;
    if (this.editingId) { const index = this.snapshot.organization.groups.findIndex(g => g.id === this.editingId); $('group-left').disabled ||= index <= 0; $('group-right').disabled ||= index < 0 || index === this.snapshot.organization.groups.length - 1; }
    if (this.drag) return;
    const signature = JSON.stringify([this.tab, groups, desktops.map(d => [d.id, d.name, d.state, d.health, d.operation?.action]), query, filters, matching.map(d => d.id), this.canEdit]);
    if (signature === this.signature) return; this.signature = signature;
    const focused = document.activeElement?.dataset.orgFocus;
    $('organizer-tabs').replaceChildren(...tabs.map(t => {
      const count = t.desktopIds ? t.desktopIds.filter(id => map.has(id)).length : matching.length, node = button(t.name, () => this.select(t.id));
      node.append(el('span', String(count), 'org-tab-count')); node.id = 'org-tab-' + t.id; node.dataset.orgFocus = 'tab-' + t.id; node.dataset.tab = t.id;
      node.setAttribute('role', 'tab'); node.setAttribute('aria-selected', String(t.id === this.tab)); node.setAttribute('aria-controls', 'organizer-board'); node.tabIndex = t.id === this.tab ? 0 : -1;
      if (t.desktopIds) this.dropTarget(node, t.id, () => null);
      return node;
    }));
    const healthOrder = ['attention', 'ready', 'paused', 'setup', 'unknown'];
    const columns = this.tab === 'health' ? healthOrder.map(id => ({ id, name: healthNames[id], desktopIds: matching.filter(d => d.health.bucket === id).map(d => d.id) })).filter(c => c.desktopIds.length || ['attention', 'ready'].includes(c.id)) : this.tab === 'groups' ? groups : groups.filter(g => g.id === this.tab);
    $('organizer-board').setAttribute('aria-labelledby', 'org-tab-' + this.tab);
    $('organizer-board').style.setProperty('--org-columns', String(columns.length));
    $('organizer-board').replaceChildren(...columns.map(c => {
      const lane = el('section', undefined, 'org-lane'), heading = el('div', undefined, 'org-lane-heading'), title = el('h3', c.name);
      title.id = 'org-lane-' + c.id; lane.setAttribute('aria-labelledby', title.id); lane.dataset.group = c.id;
      heading.append(title, el('span', String(c.desktopIds.filter(id => map.has(id)).length), 'org-count'));
      if (this.tab !== 'health' && c.id !== 'ungrouped') { const edit = button('Edit tab', () => this.editGroup(c.id), 'Edit ' + c.name + ' tab'); edit.dataset.orgFocus = 'edit-' + c.id; edit.disabled = !this.canEdit; heading.append(edit); }
      lane.append(heading); const list = el('ol', undefined, 'org-workspaces'); list.setAttribute('aria-label', c.name + ' workspaces');
      for (const id of c.desktopIds) if (map.has(id)) list.append(this.card(map.get(id), this.tab === 'health' ? undefined : c.id));
      if (!list.children.length) list.append(el('li', query || filtered ? 'No matching workspaces. Clear filters or change your search.' : this.tab === 'health' ? c.id === 'attention' ? 'No workspaces need attention.' : 'Healthy workspaces appear here automatically.' : 'Drop a workspace here, or use its Move button.', 'org-empty'));
      lane.append(list);
      if (this.tab !== 'health') this.dropTarget(lane, c.id, () => null);
      return lane;
    }));
    $('organizer-hint').textContent = this.tab === 'health' ? 'Health groups update automatically. Drag a workspace onto a custom tab, or use Move to organize it.' : 'Drag by the grip to reorder workspaces or move them between columns and tabs. Move also works with a keyboard or touch.';
    if (focused) document.querySelector(`[data-org-focus="${focused}"]`)?.focus({ preventScroll: true });
    this.url();
  }
  select(id) { this.tab = id; this.render(); $('org-tab-' + id)?.focus({ preventScroll: true }); }
  tabKeys(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...$('organizer-tabs').children], index = tabs.indexOf(event.target); if (index < 0) return;
    event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    this.select(tabs[next].dataset.tab); $('org-tab-' + this.tab).scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  card(d, groupId) {
    const row = el('li', undefined, 'org-workspace'); row.dataset.workspace = d.id;
    const main = el('div', undefined, 'org-card-main'), grip = button('', undefined, 'Drag ' + d.name); grip.className = 'org-grip'; grip.dataset.orgFocus = 'grip-' + d.id; grip.draggable = !!this.canEdit; grip.disabled = !this.canEdit; grip.title = 'Drag to a tab or position. Use Move for keyboard controls.';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 16 24'); svg.setAttribute('aria-hidden', 'true');
    for (const x of [5, 11]) for (const y of [6, 12, 18]) { const dot = document.createElementNS(svg.namespaceURI, 'circle'); dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', '1.5'); svg.append(dot); } grip.append(svg);
    grip.ondragstart = event => { if (!this.canEdit) { event.preventDefault(); return; } this.drag = d.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-galx-workspace', d.id); row.classList.add('org-dragging'); };
    const open = button(d.name, () => { this.close(false); this.openDesktop(d.id); }); open.className = 'org-open'; open.dataset.orgFocus = 'open-' + d.id;
    main.append(grip, open); row.append(main);
    const state = el('p', d.health.label, 'org-health'); state.dataset.health = d.health.bucket; row.append(state);
    const foot = el('div', undefined, 'org-card-footer'), desktopState = ({ running: 'Desktop running', stopped: 'Desktop stopped', creating: 'Creating desktop', starting: 'Starting desktop', queued: 'Operation queued', stopping: 'Stopping desktop' })[d.state] || 'Desktop needs review';
    const move = button('Move', () => this.moveDialog(d.id), 'Move ' + d.name); move.dataset.orgFocus = 'move-' + d.id; move.disabled = !this.canEdit; foot.append(el('small', desktopState), move); row.append(foot);
    if (groupId) this.dropTarget(row, groupId, event => {
      if (event.clientY < row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2) return d.id;
      const ids = this.groups().find(g => g.id === groupId).desktopIds; return ids[ids.indexOf(d.id) + 1] || null;
    }, d.id);
    return row;
  }
  clearDrop() { document.querySelectorAll('.org-drop, .org-drop-before, .org-drop-after, .org-dragging').forEach(node => node.classList.remove('org-drop', 'org-drop-before', 'org-drop-after', 'org-dragging')); }
  dropTarget(node, groupId, before, rowId) {
    node.ondragover = event => { if (!this.drag || !this.canEdit) return; event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; this.clearDrop(); node.classList.add(rowId ? before(event) === rowId ? 'org-drop-before' : 'org-drop-after' : 'org-drop'); };
    node.ondragleave = event => { if (!node.contains(event.relatedTarget)) node.classList.remove('org-drop', 'org-drop-before', 'org-drop-after'); };
    node.ondrop = event => {
      if (!this.drag || !this.canEdit) return; event.preventDefault(); event.stopPropagation();
      const desktopId = this.drag, beforeId = before(event); this.drag = undefined; this.clearDrop();
      void this.mutate({ action: 'move', desktopId, groupId: groupId === 'ungrouped' ? null : groupId, beforeId }, 'Workspace moved.');
    };
  }
  editGroup(id) {
    this.editingId = id; this.restoreFocus = id ? 'edit-' + id : '';
    const group = this.groups().find(g => g.id === id);
    $('group-title').textContent = id ? 'Edit tab' : 'New tab'; $('group-name').value = group?.name || ''; $('group-name').disabled = false; $('group-error').textContent = '';
    $('group-save').textContent = id ? 'Save name' : 'Create tab'; $('group-save').hidden = false; $('group-remove').hidden = !id; $('group-order').hidden = !id; $('group-remove-confirm').hidden = true;
    $('group-dialog').showModal(); this.render(); $('group-name').focus();
  }
  async saveGroup() {
    const groupId = this.editingId || crypto.randomUUID();
    if (await this.mutate({ action: this.editingId ? 'rename' : 'create', groupId, name: $('group-name').value }, this.editingId ? 'Tab renamed.' : 'Tab created.')) { this.tab = groupId; $('group-dialog').close(); this.render(); }
  }
  async reorderGroup(direction) {
    const groups = this.snapshot.organization.groups, index = groups.findIndex(g => g.id === this.editingId);
    if (index < 0 || index + direction < 0 || index + direction >= groups.length) return;
    await this.mutate({ action: 'reorder', groupId: this.editingId, beforeGroupId: direction < 0 ? groups[index - 1].id : groups[index + 2]?.id || null }, 'Tab order saved.');
  }
  moveDialog(id) {
    this.movingId = id; this.restoreFocus = 'move-' + id; const group = this.groups().find(g => g.desktopIds.includes(id));
    $('move-title').textContent = 'Move workspace'; $('move-workspace-name').textContent = this.snapshot.desktops.find(d => d.id === id).name; $('move-error').textContent = '';
    $('move-group').replaceChildren(...this.groups().map(g => { const option = el('option', g.name); option.value = g.id === 'ungrouped' ? '' : g.id; return option; }));
    $('move-group').value = group?.id === 'ungrouped' ? '' : group?.id || ''; this.movePositions(); $('move-dialog').showModal(); $('move-group').focus();
  }
  movePositions() {
    const group = this.groups().find(g => g.id === ($('move-group').value || 'ungrouped'));
    const options = [{ id: '', name: 'At the end' }, ...(group?.desktopIds || []).filter(id => id !== this.movingId).map(id => ({ id, name: 'Before ' + this.snapshot.desktops.find(d => d.id === id)?.name }))];
    $('move-position').replaceChildren(...options.map(o => { const option = el('option', o.name); option.value = o.id; return option; }));
  }
}
