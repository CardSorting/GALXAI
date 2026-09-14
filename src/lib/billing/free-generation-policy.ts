import type { Pool } from 'pg';

export interface FreePolicyChange {
  kind:'site'|'image'; expectedRevision:number; enabled:boolean; validUntil:string|null;
  maxOutstanding:number; maxHourUnits:number; maxDayUnits:number; maxTotalUnits:number;
}
export function readFreePolicyChange(input:unknown):FreePolicyChange {
  const p=input as FreePolicyChange;
  const fields=['kind','expectedRevision','enabled','validUntil','maxOutstanding','maxHourUnits','maxDayUnits','maxTotalUnits'];
  if(!p || typeof p!=='object' || Object.keys(p).sort().join()!==fields.sort().join() ||
    !['site','image'].includes(p.kind) || typeof p.enabled!=='boolean' ||
    !Number.isSafeInteger(p.expectedRevision) || p.expectedRevision<1 ||
    ![p.maxOutstanding,p.maxHourUnits,p.maxDayUnits,p.maxTotalUnits].every(n=>Number.isSafeInteger(n)&&n>=0) ||
    p.maxOutstanding>100 || p.maxHourUnits>10000 || p.maxDayUnits>100000 || p.maxTotalUnits>10000000 ||
    p.maxOutstanding>p.maxHourUnits || p.maxHourUnits>p.maxDayUnits || p.maxDayUnits>p.maxTotalUnits ||
    (p.validUntil!==null && (typeof p.validUntil!=='string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(p.validUntil) || !Number.isFinite(Date.parse(p.validUntil)))) ||
    (p.enabled && (!p.validUntil || !p.maxOutstanding)))throw new Error('Invalid free policy change');
  return p;
}
/** Operator-only direct database command. It cannot reset accumulated admissions. */
export async function changeFreePolicy(pool:Pick<Pool,'connect'>,input:unknown,apply=false) {
  const p=readFreePolicyChange(input),db=await pool.connect();
  try {
    await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='5s'");
    const before=(await db.query('SELECT * FROM private.galx_free_generation_policy WHERE kind=$1 FOR UPDATE',[p.kind])).rows[0];
    const now=(await db.query('SELECT clock_timestamp() AS now')).rows[0].now.getTime();
    if(!before || Number(before.revision)!==p.expectedRevision)throw new Error('Free policy revision changed; inspect it again');
    if(p.enabled && (Date.parse(p.validUntil!)<=now || Date.parse(p.validUntil!)>now+86400000 || p.maxTotalUnits<=Number(before.admitted_units)))throw new Error('Enabled policy needs unused total budget and an expiry within 24 hours');
    if(apply)await db.query(`UPDATE private.galx_free_generation_policy SET enabled=$2,valid_until=$3,
      max_outstanding=$4,max_hour_units=$5,max_day_units=$6,max_total_units=$7,revision=revision+1,updated_at=clock_timestamp()
      WHERE kind=$1`,[p.kind,p.enabled,p.validUntil,p.maxOutstanding,p.maxHourUnits,p.maxDayUnits,p.maxTotalUnits]);
    await db.query(apply?'COMMIT':'ROLLBACK');
    return {applied:apply,kind:p.kind,previousRevision:Number(before.revision),nextRevision:p.expectedRevision+1,admittedUnits:Number(before.admitted_units),change:p};
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
