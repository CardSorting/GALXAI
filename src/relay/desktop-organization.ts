import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { saveDesktopJournal } from './desktop-journal.js';
import { RequestError } from './request-policy.js';

interface Group { id: string; name: string; desktopIds: string[] }
interface Organization { version: 1; revision: string; groups: Group[]; ungrouped: string[] }
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const maxGroups = 12;
const reserved = ['by health', 'all groups', 'ungrouped'];
function groupName(value: unknown): string {
  if (typeof value !== 'string' || /[\p{Cc}\p{Cf}]/u.test(value)) throw new RequestError(400, 'invalid_group_name', 'Use a tab name of 1–40 characters.');
  const name = value.normalize('NFC').trim().replace(/\s+/g, ' ');
  if (!name || name.length > 40 || reserved.includes(name.toLowerCase())) throw new RequestError(400, 'invalid_group_name', 'Use a unique tab name of 1–40 characters. Built-in names are reserved.');
  return name;
}

/** Private presentation metadata, independent of credentials and desktop lifecycle. */
export class DesktopOrganization {
  private value: Organization = { version: 1, revision: randomUUID(), groups: [], ungrouped: [] };
  private healthy = true;
  constructor(private readonly file: string, private readonly desktopIds: () => string[], private readonly persist = saveDesktopJournal) {
    try {
      if (!fs.existsSync(file)) return;
      if (fs.statSync(file).size > 131072) throw Error('Organization too large');
      const value = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!value || value.version !== 1 || !uuid(value.revision) || !Array.isArray(value.groups) || value.groups.length > maxGroups || !Array.isArray(value.ungrouped)) throw Error('Invalid organization');
      const ids: string[] = [], names = new Set<string>(), groups = new Set<string>();
      for (const g of value.groups) {
        if (!g || !uuid(g.id) || groups.has(g.id) || groupName(g.name) !== g.name || names.has(g.name.toLowerCase()) || !Array.isArray(g.desktopIds)) throw Error('Invalid group');
        groups.add(g.id); names.add(g.name.toLowerCase()); ids.push(...g.desktopIds);
      }
      ids.push(...value.ungrouped);
      if (ids.length > 2048 || ids.some(id => !uuid(id)) || new Set(ids).size !== ids.length) throw Error('Invalid membership');
      this.value = { version: 1, revision: value.revision, groups: value.groups.map((g: Group) => ({ id: g.id, name: g.name, desktopIds: [...g.desktopIds] })), ungrouped: [...value.ungrouped] };
    } catch { this.healthy = false; }
  }
  snapshot() {
    const current = new Set(this.desktopIds()), seen = new Set<string>();
    const retain = (ids: string[]) => ids.filter(id => { if (!current.has(id) || seen.has(id)) return false; seen.add(id); return true; });
    const groups = this.value.groups.map(g => ({ id: g.id, name: g.name, desktopIds: retain(g.desktopIds) }));
    const ungrouped = retain(this.value.ungrouped);
    for (const id of current) if (!seen.has(id)) ungrouped.push(id);
    return { available: this.healthy, revision: this.value.revision, maxGroups, groups, ungrouped };
  }
  change(body: Record<string, unknown>) {
    if (!this.healthy) throw new RequestError(503, 'organization_unavailable', 'Workspace organization is unavailable. Ask the host administrator to restore it.');
    if (body.expectedRevision !== this.value.revision) throw new RequestError(409, 'organization_changed', 'Organization changed in another window. Review the latest tabs and try again.');
    const fields: Record<string, string[]> = { create: ['groupId', 'name'], rename: ['groupId', 'name'], remove: ['groupId'], move: ['desktopId', 'groupId', 'beforeId'], reorder: ['groupId', 'beforeGroupId'] };
    const action = typeof body.action === 'string' ? body.action : '';
    if (!Object.hasOwn(fields, action) || Object.keys(body).some(key => !['action', 'expectedRevision', ...fields[action]].includes(key))) throw new RequestError(400, 'invalid_organization', 'Choose a workspace organization action.');
    const state = this.snapshot(), groups = state.groups, ungrouped = state.ungrouped;
    const group = () => {
      const result = groups.find(g => g.id === body.groupId);
      if (!result) throw new RequestError(404, 'group_not_found', 'This tab no longer exists. Refresh the workspace list.');
      return result;
    };
    const name = () => {
      const next = groupName(body.name);
      if (groups.some(g => g.id !== (action === 'rename' ? body.groupId : undefined) && g.name.toLowerCase() === next.toLowerCase())) throw new RequestError(409, 'group_name_exists', 'A tab already uses this name. Choose another name.');
      return next;
    };
    if (action === 'create') {
      if (!uuid(body.groupId) || groups.some(g => g.id === body.groupId)) throw new RequestError(400, 'invalid_group', 'Use a new tab identity.');
      if (groups.length >= maxGroups) throw new RequestError(409, 'group_limit', 'You can have up to 12 custom tabs. Rename or remove an existing tab.');
      groups.push({ id: body.groupId, name: name(), desktopIds: [] });
    } else if (action === 'rename') group().name = name();
    else if (action === 'remove') { const g = group(); ungrouped.push(...g.desktopIds); groups.splice(groups.indexOf(g), 1); }
    else if (action === 'reorder') {
      const g = group();
      if (body.beforeGroupId === g.id) return this.snapshot();
      if (body.beforeGroupId !== null && !groups.some(g => g.id === body.beforeGroupId)) throw new RequestError(400, 'invalid_group_order', 'Choose a current tab position.');
      groups.splice(groups.indexOf(g), 1); groups.splice(body.beforeGroupId === null ? groups.length : groups.findIndex(g => g.id === body.beforeGroupId), 0, g);
    } else if (action === 'move') {
      if (typeof body.desktopId !== 'string' || !this.desktopIds().includes(body.desktopId)) throw new RequestError(404, 'desktop_not_found', 'This workspace no longer exists. Refresh the list.');
      const target = body.groupId === null ? ungrouped : group().desktopIds;
      if (body.beforeId === body.desktopId && target.includes(body.desktopId)) return this.snapshot();
      if (body.beforeId !== null && (typeof body.beforeId !== 'string' || !target.includes(body.beforeId))) throw new RequestError(400, 'invalid_workspace_order', 'Choose a current position in the destination tab.');
      for (const list of [ungrouped, ...groups.map(g => g.desktopIds)]) { const index = list.indexOf(body.desktopId); if (index >= 0) list.splice(index, 1); }
      target.splice(body.beforeId === null ? target.length : target.indexOf(body.beforeId as string), 0, body.desktopId);
    }
    const next: Organization = { version: 1, revision: randomUUID(), groups, ungrouped };
    try { this.persist(this.file, next); }
    catch { this.healthy = false; throw new RequestError(503, 'organization_save_failed', 'The organization change could not be confirmed. Refresh before continuing.'); }
    this.value = next;
    return this.snapshot();
  }
}
