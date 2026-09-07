import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { mutateSeats, readSeats, type SeatIdentity } from '../src/lib/teams/seats';

// Deliberately never uses DATABASE_URL: this test writes only to the isolated local database.
const pool = new Pool({ host: '127.0.0.1', port: 55439, user: 'seats_test', database: 'postgres' });
const db = await pool.connect();
const schema = `seats_test_${Date.now()}`;
const owner = { id: 'owner', email: 'owner@example.test', name: 'Owner' };
const outsider = { id: 'outsider', email: 'outsider@example.test', name: 'Outsider' };
const invited = { id: 'invited', email: 'invited@example.test', name: 'Invited' };
const run = async (actor: SeatIdentity, input: Record<string, unknown>) => {
  await db.query('BEGIN');
  try { const result = await mutateSeats(db, actor, input); await db.query('COMMIT'); return result; }
  catch (error) { await db.query('ROLLBACK'); throw error; }
};
try {
  await db.query(`CREATE SCHEMA ${schema}`);
  await db.query(`SET search_path TO ${schema}`);
  const migration = readFileSync('supabase/migrations/20260822000014_galxai_teams_and_seats_governance_mesh.sql', 'utf8');
  await db.query(migration.slice(0, migration.indexOf('-- INDEXES & QUERY OPTIMIZATION')));
  assert.equal((await readSeats(db, owner)).org, null);
  const { orgId } = await run(owner, { action: 'create', name: 'Real team' });
  const first = await readSeats(db, owner);
  assert.equal(first.org.name, 'Real team');
  assert.equal(first.members[0].user_id, owner.id);
  assert.equal((await readSeats(db, outsider)).org, null);
  await assert.rejects(readSeats(db, outsider, orgId), /do not have access/);
  await assert.rejects(run(outsider, { action: 'invite', orgId, email: 'a@example.test', role: 'developer', cap: 100 }), /Only team owners/);
  await assert.rejects(run(owner, { action: 'remove', orgId, memberId: first.members[0].id }), /owner/);
  await assert.rejects(run(owner, { action: 'invite', orgId, email: invited.email, role: 'owner', cap: 100 }), /valid role/);
  await run(owner, { action: 'invite', orgId, email: invited.email.toUpperCase(), role: 'developer', cap: 100 });
  await assert.rejects(run(owner, { action: 'invite', orgId, email: invited.email, role: 'developer', cap: 100 }), /already/);
  const invitation = (await readSeats(db, invited)).invitations[0];
  assert.ok(invitation);
  await assert.rejects(run(outsider, { action: 'accept', inviteId: invitation.id }), /another account/);
  await run(invited, { action: 'accept', inviteId: invitation.id });
  let roster = await readSeats(db, owner);
  const member = roster.members.find(m => m.user_id === invited.id)!;
  assert.equal(member.monthly_spend_cap_usd, '100.000000');
  assert.equal(roster.pending.length, 0);
  await assert.rejects(run(invited, { action: 'role', orgId, memberId: first.members[0].id, role: 'viewer' }), /Only team owners/);
  await assert.rejects(run(owner, { action: 'capacity', orgId, capacity: 1 }), /must include/);
  await assert.rejects(run(owner, { action: 'capacity', orgId, capacity: 1.5 }), /seat limit/);
  await run(owner, { action: 'capacity', orgId, capacity: 3 });
  await assert.rejects(run(owner, { action: 'update', orgId, memberId: member.id, role: 'admin', cap: -1 }), /Enter a cap/);
  assert.equal((await readSeats(db, owner)).members.find(m => m.id === member.id)?.role, 'developer');
  await run(owner, { action: 'update', orgId, memberId: member.id, role: 'viewer', cap: 25 });
  roster = await readSeats(db, owner);
  assert.equal(roster.members.find(m => m.id === member.id)?.role, 'viewer');
  await run(owner, { action: 'remove', orgId, memberId: member.id });
  assert.equal((await readSeats(db, invited)).org, null);
  await assert.rejects(readSeats(db, invited, orgId), /do not have access/);
  await db.query('UPDATE galx_organizations SET seat_capacity = 1 WHERE id = $1', [orgId]);
  await assert.rejects(run(owner, { action: 'invite', orgId, email: outsider.email, role: 'viewer', cap: 0 }), /All seats/);
  await db.query('UPDATE galx_organizations SET seat_capacity = 2 WHERE id = $1', [orgId]);
  await run(owner, { action: 'invite', orgId, email: outsider.email, role: 'viewer', cap: 0 });
  const pending = (await readSeats(db, owner)).pending[0];
  await run(owner, { action: 'revokeInvite', orgId, inviteId: pending.id });
  await assert.rejects(run(outsider, { action: 'accept', inviteId: pending.id }), /unavailable/);
  assert.equal((await db.query('SELECT count(*) FROM galx_governance_audit_events')).rows[0].count, '8');
  console.log('PASS: account linkage, tenant isolation, permissions, owner protection, invitation lifecycle, edits, removal, capacity, and audit persistence.');
} finally {
  await db.query(`DROP SCHEMA ${schema} CASCADE`);
  db.release();
  await pool.end();
}
