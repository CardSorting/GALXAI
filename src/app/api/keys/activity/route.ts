import { NextRequest, NextResponse } from 'next/server';
import { AccountIdentityError, requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { getPostgresPool } from '@/lib/db/postgres';
import { KeyActivityError, readKeyActivity } from '@/lib/keys/activity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  let db;
  try {
    const actor = await requireAccountIdentity(req);
    const pool = getPostgresPool();
    if (!pool) throw new Error('Storage unavailable');
    db = await pool.connect();
    await db.query('BEGIN READ ONLY');
    await db.query("SET LOCAL statement_timeout = '10s'");
    const result = await readKeyActivity(db, actor.id, req.nextUrl.searchParams);
    await db.query('COMMIT');
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (db) await db.query('ROLLBACK').catch(() => {});
    const expected = error instanceof AccountIdentityError || error instanceof KeyActivityError;
    return NextResponse.json({ error: expected ? error.message : 'Activity is unavailable. Please try again.' },
      { status: expected ? error.status : 503, headers: { 'Cache-Control': 'private, no-store' } });
  } finally { db?.release(); }
}
