/** Operator-only policy management. Changing an offer never issues credits. */
import { Pool } from 'pg';

const [command = 'status', value] = process.argv.slice(2);
if (!['status','amount','enable','disable'].includes(command) || (command === 'amount' &&
  (!value || !/^\d{1,4}(\.\d{1,2})?$/.test(value) || Number(value) <= 0 || Number(value) > 1000))) {
  throw new Error('Usage: manage-signup-credit.ts status | amount <USD 0.01–1000> | enable | disable');
}
if (!process.env.DATABASE_URL) throw new Error('Server database credentials are required.');
const pool = new Pool({ connectionString:process.env.DATABASE_URL, connectionTimeoutMillis:10000, statement_timeout:10000 });
try {
  if (command === 'amount') await pool.query('UPDATE private.galx_signup_credit_policy SET amount_usd=$1,updated_at=now() WHERE singleton=true',[value]);
  if (command === 'enable' || command === 'disable') await pool.query('UPDATE private.galx_signup_credit_policy SET enabled=$1,updated_at=now() WHERE singleton=true',[command === 'enable']);
  const { rows } = await pool.query('SELECT enabled,amount_usd,updated_at FROM private.galx_signup_credit_policy WHERE singleton=true');
  if (!rows[0]) throw new Error('Signup credit policy is not installed.');
  console.log(JSON.stringify(rows[0],null,2));
} catch (error) {
  console.error('Signup policy operation failed:', (error as { code?: string }).code || 'unavailable');
  process.exitCode=1;
} finally { await pool.end(); }
