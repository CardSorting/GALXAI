import type { PoolClient } from 'pg';
import type { FreeGenerationAvailability } from './free-generation-contract';
import { readFairLimits } from '../sites/fair-policy';

export type FreeGenerationKind = 'site' | 'image';
export class FreeGenerationGateError extends Error {
  constructor(readonly code: 'free_generation_paused' | 'free_generation_busy') { super(code); }
}
type Database = Pick<PoolClient,'query'>;
interface Gate {
  enabled:boolean; valid_until:Date|null; max_outstanding:number; max_hour_units:number; max_day_units:number;
  max_total_units:string; admitted_units:string; now:Date;
}
const open = (gate:Gate|undefined) => Boolean(gate?.enabled && gate.valid_until && gate.valid_until > gate.now);
const funded = (gate:Gate|undefined,quantity:number) => open(gate) && Number(gate!.admitted_units)+quantity<=Number(gate!.max_total_units);
async function counts(db:Database,kind:FreeGenerationKind,owner:string) {
  return (await db.query(`SELECT
    coalesce(sum(quantity) FILTER (WHERE kind=$1 AND NOT capacity_settled),0)::int AS outstanding,
    count(*) FILTER (WHERE user_id=$2 AND NOT capacity_settled)::int AS personal,
    coalesce(sum(quantity) FILTER (WHERE kind=$1 AND created_at>clock_timestamp()-interval '1 hour'),0)::int AS hour,
    coalesce(sum(quantity) FILTER (WHERE kind=$1 AND created_at>clock_timestamp()-interval '24 hours'),0)::int AS day
    FROM private.galx_free_generation_usage
    WHERE (kind=$1 AND (NOT capacity_settled OR created_at>clock_timestamp()-interval '24 hours'))
      OR (user_id=$2 AND NOT capacity_settled)`,[kind,owner])).rows[0];
}
function state(gate:Gate|undefined,c:{outstanding:number;personal:number;hour:number;day:number},quantity:number):FreeGenerationAvailability {
  if(!funded(gate,quantity))return 'paused';
  if(c.personal>0 || c.outstanding+quantity>gate!.max_outstanding || c.hour+quantity>gate!.max_hour_units || c.day+quantity>gate!.max_day_units)return 'busy';
  return 'available';
}
/** Caller holds the account grant. The kind row serializes all free identities.
 * No elapsed-time refund: attempts consume the aggregate budget permanently. */
export async function reserveFreeCapacity(db:Database,owner:string,kind:FreeGenerationKind,quantity:number) {
  const gate=(await db.query<Gate>('SELECT *,clock_timestamp() AS now FROM private.galx_free_generation_policy WHERE kind=$1 FOR UPDATE',[kind])).rows[0];
  // Refresh time after waiting for the lock; expired approvals never admit work.
  if(gate)gate.now=(await db.query('SELECT clock_timestamp() AS now')).rows[0].now;
  if(!funded(gate,quantity))throw new FreeGenerationGateError('free_generation_paused');
  const availability=state(gate,await counts(db,kind,owner),quantity);
  if(availability!=='available')throw new FreeGenerationGateError(availability==='paused'?'free_generation_paused':'free_generation_busy');
  await db.query('UPDATE private.galx_free_generation_policy SET admitted_units=admitted_units+$2 WHERE kind=$1',[kind,quantity]);
}
/** Linearization point immediately before dispatch, serialized with an operator pause. */
export async function freeDispatchOpen(db:Database,kind:FreeGenerationKind):Promise<boolean> {
  const gate=(await db.query<Gate>('SELECT *,clock_timestamp() AS now FROM private.galx_free_generation_policy WHERE kind=$1 FOR SHARE',[kind])).rows[0];
  if(gate)gate.now=(await db.query('SELECT clock_timestamp() AS now')).rows[0].now;
  return open(gate);
}
export async function settleFreeCapacity(db:Database,owner:string,kind:FreeGenerationKind,operation:string) {
  await db.query('UPDATE private.galx_free_generation_usage SET capacity_settled=true WHERE user_id::text=$1 AND kind=$2 AND operation_id=$3 AND NOT capacity_settled',[owner,kind,operation]);
}
/** Advisory UI state; admission always repeats the checks under a lock. */
export async function readFreeAvailability(db:Database,owner:string) {
  const result={} as {sites:FreeGenerationAvailability;images:FreeGenerationAvailability};
  for(const kind of ['site','image'] as const) {
    const gate=(await db.query<Gate>('SELECT *,clock_timestamp() AS now FROM private.galx_free_generation_policy WHERE kind=$1',[kind])).rows[0];
    result[kind==='site'?'sites':'images']=funded(gate,1)?state(gate,await counts(db,kind,owner),1):'paused';
  }
  if(result.sites==='available'){
    const policy=(await db.query('SELECT mode,limits FROM private.galx_sites_fair_policy WHERE singleton')).rows[0];
    const limits=policy?.mode==='enforce'?readFairLimits(policy.limits):null;
    if(!limits || limits.pool_max_outstanding<4 || limits.pool_max_attempts_per_flow_window<4)result.sites='paused';
  }
  return result;
}
