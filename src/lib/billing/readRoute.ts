import { NextRequest, NextResponse } from 'next/server';
import { AccountIdentityError, requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { getPostgresPool } from '@/lib/db/postgres';
import { BillingError } from './account';
import type { PoolClient } from 'pg';

export async function billingReadRoute(req: NextRequest, read: (db: PoolClient, userId: string) => Promise<unknown>) {
  let db;
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    const actor = await requireAccountIdentity(req);
    const pool = getPostgresPool();
    if (!pool) throw new Error('Storage unavailable');
    db = await pool.connect();
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await db.query("SET LOCAL statement_timeout = '10s'");
    const data = await read(db, actor.id);
    await db.query('COMMIT');
    return NextResponse.json(data, { headers });
  } catch (error) {
    if (db) await db.query('ROLLBACK').catch(() => {});
    const known = error instanceof BillingError || error instanceof AccountIdentityError;
    return NextResponse.json({ error: known ? error.message : 'Billing is unavailable. Please try again.' }, { status: known ? error.status : 503, headers });
  } finally { db?.release(); }
}
