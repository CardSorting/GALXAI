import { enforceDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getPostgresPool } from '@/lib/db/postgres';
import { mutateSeats, readSeats, SeatsError, type SeatIdentity } from '@/lib/teams/seats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function identity(req: NextRequest): Promise<SeatIdentity> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.cookies.get('galx_session')?.value;
  if (token?.startsWith('galx_sess_')) {
    const { GalxAuthEngine } = await import('@/core/auth/GalxAuthEngine');
    const verified = await GalxAuthEngine.getInstance().verifySession(token, true);
    if (verified.valid && verified.claims?.sub && verified.claims.email) {
      return { id: verified.claims.sub, email: verified.claims.email.toLowerCase(), name: verified.claims.name || verified.claims.email };
    }
    throw new SeatsError('Sign in again to manage your team.', 401);
  }
  const client = createClient(await cookies());
  const { data, error } = await client.auth.getUser(token || undefined);
  if (error || !data.user?.email || !data.user.email_confirmed_at) throw new SeatsError('Sign in with a verified email to manage your team.', 401);
  return { id: data.user.id, email: data.user.email.toLowerCase(), name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || data.user.email };
}

async function handle(req: NextRequest, write: boolean) {
  const denied = await enforceDeveloperAccess(req);
  if (denied) return denied;
  let db;
  try {
    if (write && req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin) throw new SeatsError('Request origin is not allowed.', 403);
    const actor = await identity(req);
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
      { status: error instanceof SeatsError ? error.status : 503, headers: { 'Cache-Control': 'no-store' } });
  } finally { db?.release(); }
}
export const GET = (req: NextRequest) => handle(req, false);
export const POST = (req: NextRequest) => handle(req, true);
