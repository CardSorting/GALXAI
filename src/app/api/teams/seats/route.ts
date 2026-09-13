import { enforceDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { requireSessionMutation, SessionAccessError } from '@/lib/auth/session-http';
import { getPostgresPool } from '@/lib/db/postgres';
import { mutateSeats, readSeats, SeatsError } from '@/lib/teams/seats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(req: NextRequest, write: boolean) {
  const denied = await enforceDeveloperAccess(req);
  if (denied) return denied;
  let db;
  try {
    if (write) requireSessionMutation(req);
    const actor = await requireAccountIdentity(req);
    const pool = getPostgresPool();
    if (!pool) throw new SeatsError('Team storage is unavailable. Please try again later.', 503);
    db = await pool.connect();
    await db.query('BEGIN');
    await db.query("SET LOCAL statement_timeout = '10s'");
    let result;
    if (write) {
      const input = await req.json().catch(() => null);
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new SeatsError('Invalid request.');
      result = await mutateSeats(db, actor, input);
    } else result = await readSeats(db, actor, req.nextUrl.searchParams.get('orgId'));
    await db.query('COMMIT');
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (db) await db.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ error: error instanceof SeatsError ? error.message : 'Could not save or load your team. Please try again.' },
      { status: error instanceof SeatsError || error instanceof SessionAccessError ? error.status : 503, headers: { 'Cache-Control': 'no-store' } });
  } finally { db?.release(); }
}
export const GET = (req: NextRequest) => handle(req, false);
export const POST = (req: NextRequest) => handle(req, true);
