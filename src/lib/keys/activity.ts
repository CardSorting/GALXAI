import type { PoolClient } from 'pg';

export interface KeyActivityRecord {
  id: string;
  createdAt: string;
  keyId: string | null;
  keyName: string | null;
  keyPrefix: string | null;
  model: string | null;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  costUsd: number;
}
export interface KeyActivityResult {
  records: KeyActivityRecord[];
  keys: { id: string; name: string; revoked: boolean }[];
  nextCursor: string | null;
}
export class KeyActivityError extends Error { readonly status = 400; }

export async function readKeyActivity(db: Pick<PoolClient, 'query'>, userId: string, params: URLSearchParams): Promise<KeyActivityResult> {
  const days = Number(params.get('days') || 30);
  if (![1, 7, 30, 90].includes(days)) throw new KeyActivityError('Choose a valid date range.');
  const keyId = params.get('keyId') || '';
  const search = (params.get('q') || '').trim();
  if (keyId.length > 64 || search.length > 100) throw new KeyActivityError('Filter is too long.');
  let cursor: { time: string; id: string } | null = null;
  const rawCursor = params.get('cursor');
  if (rawCursor) {
    try {
      if (rawCursor.length > 512) throw new Error();
      cursor = JSON.parse(Buffer.from(rawCursor, 'base64url').toString());
      if (!cursor || typeof cursor.time !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(cursor.time) || !Number.isFinite(Date.parse(cursor.time)) ||
        typeof cursor.id !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(cursor.id)) throw new Error();
    } catch { throw new KeyActivityError('Invalid page cursor. Refresh the activity list.'); }
  }
  const { rows } = await db.query(`SELECT t.id,
    to_char(t.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdAt",
    t.api_key_id AS "keyId", k.name AS "keyName", k.prefix AS "keyPrefix", t.model,
    t.prompt_tokens AS "promptTokens", t.completion_tokens AS "completionTokens", t.cached_tokens AS "cachedTokens",
    -t.amount_usd AS "costUsd"
    FROM galx_wallet_transactions t
    LEFT JOIN galx_developer_keys k ON k.id = t.api_key_id AND k.user_id = $1
    WHERE t.user_id = $1 AND t.transaction_type = 'usage_draw'
      AND t.created_at >= NOW() - ($2::int * INTERVAL '1 day')
      AND ($3::text = '' OR t.api_key_id = $3)
      AND ($4::text = '' OR strpos(lower(coalesce(t.model, '') || ' ' || t.id::text || ' ' || coalesce(k.name, '')), lower($4)) > 0)
      AND ($5::timestamptz IS NULL OR (t.created_at, t.id) < ($5::timestamptz, $6::uuid))
    ORDER BY t.created_at DESC, t.id DESC LIMIT 101`,
    [userId, days, keyId, search, cursor?.time || null, cursor?.id || null]);
  const records: KeyActivityRecord[] = rows.slice(0, 100).map(row => ({
    ...row,
    promptTokens: Number(row.promptTokens || 0), completionTokens: Number(row.completionTokens || 0),
    cachedTokens: Number(row.cachedTokens || 0), costUsd: Number(row.costUsd),
  }));
  const { rows: keys } = await db.query('SELECT id, name, is_revoked AS revoked FROM galx_developer_keys WHERE user_id = $1 ORDER BY created_at DESC, id', [userId]);
  const last = records.at(-1);
  return { records, keys, nextCursor: rows.length > 100 && last ? Buffer.from(JSON.stringify({ time: last.createdAt, id: last.id })).toString('base64url') : null };
}
