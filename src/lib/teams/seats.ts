import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';

export interface SeatIdentity { id: string; email: string; name: string }
export class SeatsError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const roles = ['admin', 'developer', 'billing', 'viewer'];
function role(value: unknown) {
  if (typeof value !== 'string' || !roles.includes(value)) throw new SeatsError('Choose a valid role.');
  return value;
}
function amount(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1000000) throw new SeatsError('Enter a cap between $0 and $1,000,000.');
  return value;
}

export async function readSeats(db: PoolClient, actor: SeatIdentity, requestedOrg?: string | null) {
  const { rows: workspaces } = await db.query(`SELECT o.id, o.name, o.tier, o.seat_capacity, m.role
    FROM galx_organizations o JOIN galx_organization_members m ON m.org_id = o.id
    WHERE m.user_id = $1 AND m.status = 'active' ORDER BY o.created_at, o.id`, [actor.id]);
  const org = requestedOrg ? workspaces.find(o => o.id === requestedOrg) : workspaces[0];
  if (requestedOrg && !org) throw new SeatsError('You do not have access to this team.', 403);
  const { rows: invitations } = await db.query(`SELECT i.id, i.org_id, o.name AS team_name, i.role, i.expires_at
    FROM galx_team_invitations i JOIN galx_organizations o ON o.id = i.org_id
    WHERE lower(i.email) = lower($1) AND i.status = 'pending' AND i.expires_at > NOW()
    ORDER BY i.created_at DESC`, [actor.email]);
  if (!org) return { workspaces, org: null, members: [], pending: [], invitations };
  const { rows: members } = await db.query(`SELECT id, user_id, name, email, role, status,
    monthly_spend_usd, monthly_spend_cap_usd FROM galx_organization_members WHERE org_id = $1 ORDER BY created_at, id`, [org.id]);
  const { rows: pending } = ['owner', 'admin'].includes(org.role)
    ? await db.query(`SELECT id, email, role, expires_at FROM galx_team_invitations
        WHERE org_id = $1 AND status = 'pending' AND expires_at > NOW() ORDER BY created_at DESC`, [org.id])
    : { rows: [] };
  return { workspaces, org, members, pending, invitations };
}

// Caller owns a transaction. Organization row locks serialize capacity and membership changes.
export async function mutateSeats(db: PoolClient, actor: SeatIdentity, input: Record<string, unknown>) {
  const action = input.action;
  let orgId = typeof input.orgId === 'string' ? input.orgId : '';
  if (action === 'create') {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name || name.length > 100) throw new SeatsError('Enter a team name of up to 100 characters.');
    // One personal team per account; concurrent creation and retries use the same identity.
    orgId = `org_${actor.id}`;
    if (orgId.length > 64) throw new SeatsError('Account ID is not supported.');
    await db.query(`INSERT INTO galx_organizations (id, name, slug, tier, billing_email, security_policy, spend_safety_policy)
      VALUES ($1, $2, $1, 'developer', $3, '{}'::jsonb, '{}'::jsonb) ON CONFLICT (id) DO NOTHING`, [orgId, name, actor.email]);
    await db.query('SELECT id FROM galx_organizations WHERE id = $1 FOR UPDATE', [orgId]);
    const existing = await db.query('SELECT id FROM galx_organization_members WHERE org_id = $1', [orgId]);
    if (existing.rows.length) throw new SeatsError('Your team already exists. Refresh to open it.', 409);
    await db.query(`INSERT INTO galx_organization_members
      (id, org_id, user_id, name, email, role, assigned_keys_count, department)
      VALUES ($1, $2, $3, $4, $5, 'owner', 0, '')`, [randomUUID(), orgId, actor.id, actor.name, actor.email]);
  } else {
    if (action === 'accept') {
      const { rows } = await db.query('SELECT org_id FROM galx_team_invitations WHERE id = $1', [input.inviteId]);
      orgId = rows[0]?.org_id;
    }
    if (!orgId) throw new SeatsError('Select a team.');
    const { rows: organizations } = await db.query('SELECT id, seat_capacity FROM galx_organizations WHERE id = $1 FOR UPDATE', [orgId]);
    if (!organizations.length) throw new SeatsError('Team not found.', 404);
    const { rows: memberships } = await db.query("SELECT * FROM galx_organization_members WHERE org_id = $1 AND user_id = $2 AND status = 'active'", [orgId, actor.id]);
    const membership = memberships[0];
    const occupancy = async () => {
      const { rows } = await db.query(`SELECT
        (SELECT count(*) FROM galx_organization_members WHERE org_id = $1 AND status = 'active') +
        (SELECT count(*) FROM galx_team_invitations WHERE org_id = $1 AND status = 'pending' AND expires_at > NOW()) AS count`, [orgId]);
      return Number(rows[0].count);
    };
    if (action === 'accept') {
      const { rows } = await db.query(`SELECT * FROM galx_team_invitations WHERE id = $1 AND org_id = $2
        AND lower(email) = lower($3) AND status = 'pending' AND expires_at > NOW() FOR UPDATE`, [input.inviteId, orgId, actor.email]);
      const invite = rows[0];
      if (!invite) throw new SeatsError('Invitation is unavailable or belongs to another account.', 403);
      if (membership) throw new SeatsError('You already belong to this team.', 409);
      if (await occupancy() > organizations[0].seat_capacity) throw new SeatsError('This team has no available seats.', 409);
      await db.query(`INSERT INTO galx_organization_members
        (id, org_id, user_id, name, email, role, monthly_spend_cap_usd, assigned_keys_count, department)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 0, '')
        ON CONFLICT (org_id, email) DO UPDATE SET user_id = EXCLUDED.user_id, name = EXCLUDED.name,
        role = EXCLUDED.role, monthly_spend_cap_usd = EXCLUDED.monthly_spend_cap_usd, status = 'active', updated_at = NOW()`,
        [randomUUID(), orgId, actor.id, actor.name, actor.email, role(invite.role), invite.spend_cap_usd]);
      await db.query("UPDATE galx_team_invitations SET status = 'accepted', updated_at = NOW() WHERE id = $1", [invite.id]);
    } else {
      if (!membership || !['owner', 'admin'].includes(membership.role)) throw new SeatsError('Only team owners and admins can make changes.', 403);
      if (action === 'capacity') {
        if (membership.role !== 'owner') throw new SeatsError('Only the owner can change the seat limit.', 403);
        const capacity = input.capacity;
        if (typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity < 1 || capacity > 1000) throw new SeatsError('Enter a seat limit between 1 and 1,000.');
        if (capacity < await occupancy()) throw new SeatsError('The seat limit must include active members and pending invitations.', 409);
        await db.query('UPDATE galx_organizations SET seat_capacity = $1, updated_at = NOW() WHERE id = $2', [capacity, orgId]);
      } else if (action === 'invite') {
        const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new SeatsError('Enter a valid email.');
        const inviteRole = role(input.role);
        if (inviteRole === 'admin' && membership.role !== 'owner') throw new SeatsError('Only the owner can appoint admins.', 403);
        const duplicate = await db.query(`SELECT id FROM galx_organization_members WHERE org_id = $1 AND lower(email) = $2 AND status = 'active'
          UNION ALL SELECT id FROM galx_team_invitations WHERE org_id = $1 AND lower(email) = $2 AND status = 'pending' AND expires_at > NOW()`, [orgId, email]);
        if (duplicate.rows.length) throw new SeatsError('This person is already a member or has a pending invitation.', 409);
        if (await occupancy() >= organizations[0].seat_capacity) throw new SeatsError('All seats are reserved. Remove an unused seat or invitation first.', 409);
        await db.query(`INSERT INTO galx_team_invitations (id, org_id, email, role, spend_cap_usd, invited_by_email, invite_token, expires_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '7 days')`,
          [randomUUID(), orgId, email, inviteRole, amount(input.cap), actor.email, randomUUID()]);
      } else if (action === 'revokeInvite') {
        const result = await db.query("UPDATE galx_team_invitations SET status = 'revoked', updated_at = NOW() WHERE id = $1 AND org_id = $2 AND status = 'pending'", [input.inviteId, orgId]);
        if (!result.rowCount) throw new SeatsError('Pending invitation not found.', 404);
      } else if (['role', 'cap', 'update', 'remove'].includes(String(action))) {
        const { rows } = await db.query('SELECT * FROM galx_organization_members WHERE id = $1 AND org_id = $2', [input.memberId, orgId]);
        const target = rows[0];
        if (!target) throw new SeatsError('Member not found.', 404);
        if (target.role === 'owner' || target.user_id === actor.id || (target.role === 'admin' && membership.role !== 'owner')) {
          throw new SeatsError('This member can only be managed by the team owner; the owner cannot be removed or edited here.', 403);
        }
        if (action === 'role' || action === 'update') {
          const nextRole = role(input.role);
          if (nextRole === 'admin' && membership.role !== 'owner') throw new SeatsError('Only the owner can appoint admins.', 403);
          if (action === 'update') {
            await db.query('UPDATE galx_organization_members SET role = $1, monthly_spend_cap_usd = $2, updated_at = NOW() WHERE id = $3 AND org_id = $4', [nextRole, amount(input.cap), target.id, orgId]);
          } else await db.query('UPDATE galx_organization_members SET role = $1, updated_at = NOW() WHERE id = $2 AND org_id = $3', [nextRole, target.id, orgId]);
        } else if (action === 'cap') {
          await db.query('UPDATE galx_organization_members SET monthly_spend_cap_usd = $1, updated_at = NOW() WHERE id = $2 AND org_id = $3', [amount(input.cap), target.id, orgId]);
        } else {
          await db.query("UPDATE galx_organization_members SET status = 'suspended', updated_at = NOW() WHERE id = $1 AND org_id = $2", [target.id, orgId]);
        }
      } else throw new SeatsError('Unknown team action.');
    }
  }
  await db.query(`INSERT INTO galx_governance_audit_events (id, org_id, actor_name, actor_email, action, category, details, ip_address)
    VALUES ($1, $2, $3, $4, $5, 'members', $6, '')`, [randomUUID(), orgId, actor.name, actor.email, String(action), JSON.stringify({ memberId: input.memberId, inviteId: input.inviteId })]);
  return { success: true, orgId };
}
