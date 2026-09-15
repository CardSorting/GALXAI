// Synthetic central authority. No production imports, credentials or provider calls.
import { randomUUID } from 'node:crypto';
export class DemoError extends Error { constructor(status, message) { super(message); this.status = status; } }
const check = (ok, status, message) => { if (!ok) throw new DemoError(status, message); };
const workloads = pool => pool === 'premium' ? ['text', 'sites', 'images'] : ['text'];
const own = (object, key) => Object.hasOwn(object, key);
export function initialState(profile, empty = false) {
  check(['premium', 'standard'].includes(profile), 400, 'Choose a demo relay.');
  const accounts = empty ? [] : [
    { id: `${profile}-primary`, name: profile === 'premium' ? 'Primary paid account' : 'Primary free account', phase: 'complete', capabilities: Object.fromEntries(workloads(profile).map(w => [w, 'ready'])) },
    ...(profile === 'premium' ? [{ id: 'premium-studio', name: 'Studio account', phase: 'complete', capabilities: { text: 'ready', sites: 'ready', images: 'unavailable' } }] : []),
    { id: `${profile}-backup`, name: 'Backup account', phase: 'sign_in', capabilities: {} },
  ].map(row => ({ ...row, providerIdentity: `synthetic-${row.id}`, revision: 1, paused: false, desiredGeneration: 1, appliedGeneration: row.phase === 'complete' ? 1 : 0 }));
  return { profile, revision: 1, mode: 'operator', relayOnline: true, accounts, events: [], verificationCalls: { text: 0, sites: 0, images: 0 } };
}
export function initialAuthority(empty = false) {
  return { schema: 2, pools: { premium: initialState('premium', empty), standard: initialState('standard', empty) }, operations: {} };
}
export function publicState(state) {
  return {
    profile: state.profile, revision: state.revision, mode: state.mode, relayOnline: state.relayOnline,
    accounts: state.accounts.map(a => ({ id: a.id, name: a.name, phase: a.phase, paused: a.paused, revision: a.revision,
      desiredGeneration: a.desiredGeneration, appliedGeneration: a.appliedGeneration,
      capabilities: Object.fromEntries(workloads(state.profile).filter(w => a.capabilities[w]).map(w => [w, a.capabilities[w]])),
      ...(a.verifiedAt ? { verifiedAt: a.verifiedAt } : {}),
    })),
    events: state.events.map(({ id, at, text, accountId }) => ({ id, at, text, ...(accountId ? { accountId } : {}) })),
    verificationCalls: { text: state.verificationCalls.text, sites: state.verificationCalls.sites, images: state.verificationCalls.images },
    capturedAt: Date.now(), simulated: true,
  };
}
export function operationResult(authority, profile, id) {
  const record = authority.operations[id];
  check(record && record.profile === profile, 404, 'No saved result found for this operation in this console.');
  return { ...record.receipt };
}
export function transition(authority, profile, command) {
  check(own(authority.pools, profile), 403, 'Unknown console.');
  const state = authority.pools[profile];
  check(command && !Array.isArray(command) && typeof command === 'object', 400, 'Use a demo action.');
  check(typeof command.operationId === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(command.operationId), 400, 'Missing operation identity.');
  const allowed = { create: ['name'], signin: ['id', 'duplicateFixture'], register: ['id', 'confirmed'], verify: ['id', 'outcome'], set_paused: ['id', 'paused'], mode: ['mode'], reset: ['empty'], relay: ['online'] };
  check(own(allowed, command.action), 400, 'Unknown demo action.');
  check(Object.keys(command).every(key => ['action', 'operationId', 'expectedRevision', 'expectedAccountRevision', ...allowed[command.action]].includes(key)), 400, 'This console has a fixed destination.');
  check(state.mode === 'operator' || ['mode', 'reset', 'relay'].includes(command.action), 403, 'Read-only preview. Switch to Operator in Prototype controls.');
  const fingerprint = JSON.stringify(Object.fromEntries(Object.entries(command).sort(([a], [b]) => a.localeCompare(b))));
  if (own(authority.operations, command.operationId)) {
    const saved = authority.operations[command.operationId];
    check(saved.profile === profile && saved.fingerprint === fingerprint, 409, 'This operation already belongs to a different action.');
    return authority;
  }
  check(Object.keys(authority.operations).length < 10000, 409, 'The demo operation ledger is full. Start a fresh demo store; saved results have not been discarded.');
  const existing = command.id ? state.accounts.find(a => a.id === command.id) : undefined;
  if (allowed[command.action].includes('id')) {
    check(existing, 404, 'This account is not in this console.');
    check(command.expectedAccountRevision === existing.revision, 409, 'This account changed in another window. Refresh it before continuing.');
  } else check(command.expectedRevision === state.revision, 409, 'This view changed. Refresh the saved state before continuing.');
  const next = structuredClone(authority), pool = next.pools[profile];
  let row = existing ? pool.accounts.find(a => a.id === existing.id) : undefined, message;
  const now = Date.now();
  if (command.action === 'create') {
    const name = typeof command.name === 'string' ? command.name.trim() : '';
    check(name && name.length <= 64 && !/[\p{Cc}\p{Cf}]/u.test(name), 400, 'Enter an account name of 1–64 characters.');
    check(!pool.accounts.some(a => a.name.toLowerCase() === name.toLowerCase()), 409, 'This name is already in use. Open the existing account or choose another name.');
    check(pool.accounts.length < 30, 409, 'The prototype holds up to 30 accounts per console.');
    row = { id: randomUUID(), name, phase: 'sign_in', paused: false, capabilities: {}, revision: 0, desiredGeneration: 0, appliedGeneration: 0 };
    pool.accounts.push(row); message = `${name}: workspace saved in central account management`;
  } else if (command.action === 'signin') {
    check(row.phase === 'sign_in', 409, 'Refresh the current sign-in state.');
    check(typeof command.duplicateFixture === 'boolean', 400, 'Choose a synthetic sign-in scenario.');
    row.providerIdentity = command.duplicateFixture ? 'synthetic-shared-identity' : `synthetic-${row.id}`;
    row.phase = 'review'; message = `${row.name}: demo sign-in completed; awaiting registration`;
  } else if (command.action === 'register') {
    check(row.phase === 'review' && command.confirmed === true, 400, 'Confirm the account type before registration.');
    check(!Object.values(next.pools).some(p => p.accounts.some(a => a.id !== row.id && a.providerIdentity === row.providerIdentity && ['verify', 'complete'].includes(a.phase))), 409, 'This account is already registered. Ask the central account administrator to review its assignment.');
    row.phase = 'verify'; row.desiredGeneration++;
    message = `${row.name}: registration saved centrally; verification needed`;
  } else if (command.action === 'verify') {
    check(pool.relayOnline, 409, 'The relay is offline. Saved registration is retained; reconnect before verification.');
    check(['verify', 'complete'].includes(row.phase), 409, 'Register the account before verification.');
    check(['success', 'images-denied'].includes(command.outcome), 400, 'Choose a verification outcome.');
    check(profile === 'premium' || command.outcome === 'success', 400, 'Standard verifies text only.');
    for (const w of workloads(profile).filter(w => row.capabilities[w] !== 'ready')) {
      pool.verificationCalls[w]++; row.capabilities[w] = w === 'images' && command.outcome === 'images-denied' ? 'unavailable' : 'ready';
    }
    row.phase = 'complete'; row.verifiedAt = now; row.desiredGeneration++;
    message = `${row.name}: verification complete${command.outcome === 'images-denied' ? '; images unavailable' : ''}`;
  } else if (command.action === 'set_paused') {
    check(row.phase === 'complete' && typeof command.paused === 'boolean', 400, 'Choose whether new work should be paused for a registered account.');
    if (row.paused !== command.paused) { row.paused = command.paused; row.desiredGeneration++; }
    message = `${row.name}: ${row.paused ? 'pause' : 'resume'} saved centrally${pool.relayOnline ? '; relay acknowledged' : '; awaiting relay acknowledgement'}`;
  } else if (command.action === 'mode') {
    check(['operator', 'viewer'].includes(command.mode), 400, 'Choose a preview role.'); pool.mode = command.mode; message = `Preview role changed to ${command.mode}`;
  } else if (command.action === 'relay') {
    check(typeof command.online === 'boolean', 400, 'Choose a demo connection state.'); pool.relayOnline = command.online;
    message = command.online ? 'Demo relay reconnected; saved changes acknowledged' : 'Demo relay disconnected; central account management remains available';
    if (command.online) for (const a of pool.accounts) if (a.appliedGeneration !== a.desiredGeneration) { a.appliedGeneration = a.desiredGeneration; a.revision++; }
  } else if (command.action === 'reset') {
    check(typeof command.empty === 'boolean', 400, 'Choose a demo scenario.');
    Object.assign(pool, initialState(profile, command.empty)); message = 'Synthetic account scenario reset; earlier operation receipts remain retained';
  }
  if (row) { row.revision++; if (pool.relayOnline) row.appliedGeneration = row.desiredGeneration; }
  pool.revision = state.revision + 1;
  pool.events.unshift({ id: randomUUID(), at: now, text: message, ...(row ? { accountId: row.id } : {}) }); pool.events = pool.events.slice(0, 100);
  next.operations[command.operationId] = { profile, fingerprint, receipt: { id: command.operationId, action: command.action, status: 'saved', savedAt: now, ...(row ? { accountId: row.id } : {}) } };
  return next;
}
