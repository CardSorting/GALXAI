import { createHash,randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { decideFairAdmission, FairUsageError, readFairLimits, type FairCounts, type FairLane, type FairLimits, type PoolSnapshot } from './fair-policy';

export interface FairPolicy { mode: 'disabled' | 'shadow' | 'enforce'; pool_id: string; revision: number; limits: FairLimits; paid_price_ids: string[]; }
export interface PaidAccess { accountId: string; validUntil: number; policyRevision: number; }
export interface FairInvocation {
  account_id: string; invocation_id: string; pool_id: string; digest: string; lane: FairLane;
  state: 'reserved' | 'dispatching' | 'completed' | 'not_started' | 'failed' | 'unknown';
  grant_id: string; grant_expires_at: Date; job_id: string | null; origin: string | null; output: string | null;
}
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve,ms));
/** Shared authority across HTTP workers. Network I/O never runs inside tx().
 * Lock order: account advisory lock, policy, pool row, invocation. A refresh
 * locks only its pool. Database time is authoritative; the clock override is test-only. */
export class SitesFairStore {
  constructor(private readonly pool: Pick<Pool,'connect'>, private readonly testClock?: () => number,
    private readonly observe:(event:Record<string,unknown>)=>void=event=>console.info('[sites-fair]',JSON.stringify(event))) {
    if (typeof window !== 'undefined') throw new Error('Server only');
    if (testClock && process.env.NODE_ENV !== 'test') throw new Error('Test clock prohibited');
  }
  private async now(db:PoolClient):Promise<number>{
    return this.testClock?this.testClock():Number((await db.query('SELECT floor(extract(epoch FROM clock_timestamp())*1000)::float8 AS ms')).rows[0].ms);
  }
  private async tx<T>(run: (db: PoolClient, now: number) => Promise<T>, deadline = Date.now()+5000): Promise<T> {
    let abandoned = false;
    const connection = this.pool.connect().then(db => { if (abandoned) { db.release(); throw new Error('Admission timed out'); } return db; });
    const remaining = Math.max(1,deadline-Date.now());
    let timer: ReturnType<typeof setTimeout>;
    const db = await Promise.race([connection,new Promise<never>((_,reject) => { timer=setTimeout(()=>{abandoned=true;reject(new FairUsageError(503,'authority'));},remaining); })]).finally(()=>clearTimeout(timer));
    let destroy = false;
    try {
      await db.query('BEGIN');
      const budget = Math.max(1,deadline-Date.now());
      await db.query(`SELECT set_config('lock_timeout',$1,true),set_config('statement_timeout',$1,true)`,[`${budget}ms`]);
      const timestamp = (await db.query('SELECT floor(extract(epoch FROM clock_timestamp())*1000)::float8 AS ms')).rows[0].ms;
      const result = await run(db,this.testClock ? this.testClock() : Number(timestamp));
      // A late result must not become a new admission. COMMIT acknowledgement can
      // still be uncertain; callers must recover by invocation ID, never resubmit.
      if (Date.now() >= deadline) throw new FairUsageError(503,'deadline');
      await db.query('COMMIT'); return result;
    } catch (error) {
      try { await db.query('ROLLBACK'); } catch { destroy=true; }
      if (error instanceof FairUsageError) throw error;
      destroy=true; throw new FairUsageError(503,'authority',undefined,false);
    } finally { db.release(destroy); }
  }
  async policy(): Promise<FairPolicy> {
    return this.tx(async db => {
      const row = (await db.query('SELECT * FROM private.galx_sites_fair_policy WHERE singleton')).rows[0];
      if (!row || row.mode === 'disabled' || !/^[a-zA-Z0-9_.:-]{1,120}$/.test(row.pool_id) ||
        !Array.isArray(row.paid_price_ids) || !row.paid_price_ids.length || row.paid_price_ids.length>100 || row.paid_price_ids.some((s: unknown)=>typeof s !== 'string' || !/^price_[a-zA-Z0-9]+$/.test(s))) throw new FairUsageError(503,'configuration');
      return {...row,revision:Number(row.revision),limits:readFairLimits(row.limits)};
    });
  }
  async lookup(account: string, invocation: string): Promise<FairInvocation | null> {
    return this.tx(async db => (await db.query<FairInvocation>('SELECT * FROM private.galx_sites_fair_invocations WHERE account_id=$1 AND invocation_id=$2',[account,invocation])).rows[0] || null);
  }
  async accountCooldown(account: string): Promise<void> {
    return this.tx(async (db,now) => {
      const row=(await db.query('SELECT until_at FROM private.galx_sites_fair_cooldowns WHERE account_id=$1',[account])).rows[0];
      if(row && row.until_at.getTime()>now) throw new FairUsageError(429,'account_cooldown',Math.ceil((row.until_at.getTime()-now)/1000));
    });
  }
  async snapshot(policy: FairPolicy, signal: AbortSignal, refresh: (signal: AbortSignal) => Promise<void>, deadline: number): Promise<void> {
    const p=policy.limits, poolId=policy.pool_id;
    while (Date.now()<deadline) {
      signal.throwIfAborted();
      const lease=await this.tx(async(db,now)=>{
        await db.query('INSERT INTO private.galx_sites_fair_pools(pool_id) VALUES($1) ON CONFLICT DO NOTHING',[poolId]);
        const row=(await db.query('SELECT * FROM private.galx_sites_fair_pools WHERE pool_id=$1 FOR UPDATE',[poolId])).rows[0];
        if(row.cooldown_until?.getTime()>now)throw new FairUsageError(503,'pool_cooldown',Math.ceil((row.cooldown_until.getTime()-now)/1000));
        if(row.snapshot?.valid_until>now) return {fresh:true} as const;
        if(row.refresh_until?.getTime()>now)return {waiting:true} as const;
        const token=randomUUID();
        await db.query('UPDATE private.galx_sites_fair_pools SET refresh_token=$2,refresh_until=$3 WHERE pool_id=$1',[poolId,token,new Date(now+p.refresh_timeout_milliseconds)]);
        return {token,revision:Number(row.revision),now} as const;
      },deadline);
      if('fresh' in lease)return;
      if('waiting' in lease){await pause(Math.min(10,Math.max(1,deadline-Date.now())));continue;}
      const timeout=Math.min(p.refresh_timeout_milliseconds,Math.max(1,deadline-Date.now()));
      const refreshSignal=AbortSignal.any([signal,AbortSignal.timeout(timeout)]);
      let ready=false, timer:ReturnType<typeof setTimeout>;
      try { await Promise.race([refresh(refreshSignal),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Refresh timed out')),timeout);})]); ready=!refreshSignal.aborted; }
      catch { /* Unknown cannot imply spare capacity. */ } finally { clearTimeout(timer!); }
      await this.tx(async(db,now)=>{
        const snapshot:PoolSnapshot={pool_id:poolId,revision:lease.revision+1,observed_at:now,valid_until:now+p.snapshot_ttl_seconds*1000,
          readiness:ready?'READY':'UNKNOWN',signal_basis:'shared-local-admission',local_concurrency_limit:p.pool_max_outstanding};
        // Late refresh cannot overwrite a newer cooldown, refresh or snapshot.
        await db.query(`UPDATE private.galx_sites_fair_pools SET revision=revision+1,snapshot=$4,refresh_token=NULL,refresh_until=NULL
          WHERE pool_id=$1 AND revision=$2 AND refresh_token=$3 AND (refresh_until>$5 OR $6=false)`,[poolId,lease.revision,lease.token,snapshot,new Date(now),ready]);
      },deadline);
      return;
    }
    throw new FairUsageError(503,'deadline');
  }
  async admit(policy: FairPolicy, access: PaidAccess, invocation: string, digest: string, deadline: number): Promise<{row:FairInvocation;dispatch:boolean}> {
    if(!/^[a-zA-Z0-9_.:-]{1,120}$/.test(invocation)||!/^[a-f0-9]{64}$/.test(digest))throw new FairUsageError(400,'invalid_request');
    const account=access.accountId,p=policy.limits,started=performance.now();
    const result=await this.tx(async(db,now)=>{
      await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`sites-fair-account:${account}`]);
      const current=(await db.query('SELECT revision,mode FROM private.galx_sites_fair_policy WHERE singleton FOR SHARE')).rows[0];
      if(!current||current.mode!=='enforce'||Number(current.revision)!==policy.revision||access.policyRevision!==policy.revision||access.validUntil<=now)throw new FairUsageError(503,'configuration');
      const pool=(await db.query('SELECT * FROM private.galx_sites_fair_pools WHERE pool_id=$1 FOR UPDATE',[policy.pool_id])).rows[0];
      if(!pool)throw new FairUsageError(503,'snapshot');
      now=await this.now(db);
      if(access.validUntil<=now)throw new FairUsageError(503,'membership_expired');
      const existing=(await db.query<FairInvocation>('SELECT * FROM private.galx_sites_fair_invocations WHERE account_id=$1 AND invocation_id=$2',[account,invocation])).rows[0];
      if(existing){if(existing.digest!==digest)throw new FairUsageError(409,'invocation_conflict');return {row:existing,dispatch:false};}
      const cooldown=(await db.query('SELECT until_at FROM private.galx_sites_fair_cooldowns WHERE account_id=$1',[account])).rows[0];
      if(cooldown?.until_at.getTime()>now)throw new FairUsageError(429,'account_cooldown',Math.ceil((cooldown.until_at.getTime()-now)/1000));
      if(pool.cooldown_until?.getTime()>now)throw new FairUsageError(503,'pool_cooldown',Math.ceil((pool.cooldown_until.getTime()-now)/1000));
      // Only never-dispatched reservations can expire. Dispatching/unknown records
      // remain occupied through lease expiry, window reset and process death.
      await db.query(`UPDATE private.galx_sites_fair_invocations SET state='not_started',counted=false
        WHERE pool_id=$1 AND state='reserved' AND grant_expires_at<=$2`,[policy.pool_id,new Date(now)]);
      const window=Math.floor(now/(p.allowance_window_seconds*1000));
      const start=new Date(now-p.flow_window_seconds*1000);
      const counts=(await db.query(`SELECT
        count(*) FILTER(WHERE account_id=$1 AND allowance_window=$3 AND counted)::int AS messages,
        count(*) FILTER(WHERE pool_id=$2 AND state IN ('reserved','dispatching','unknown'))::int AS outstanding,
        count(*) FILTER(WHERE account_id=$1 AND state IN ('reserved','dispatching','unknown'))::int AS "accountOutstanding",
        count(*) FILTER(WHERE pool_id=$2 AND lane='CONTINUATION' AND state IN ('reserved','dispatching','unknown'))::int AS "continuationOutstanding",
        count(*) FILTER(WHERE account_id=$1 AND lane='CONTINUATION' AND state IN ('reserved','dispatching','unknown'))::int AS "accountContinuationOutstanding",
        count(*) FILTER(WHERE pool_id=$2 AND admitted_at>$4)::int AS attempts,
        count(*) FILTER(WHERE account_id=$1 AND admitted_at>$4)::int AS "accountAttempts",
        count(*) FILTER(WHERE pool_id=$2 AND lane='CONTINUATION' AND admitted_at>$4)::int AS "continuationAttempts",
        count(*) FILTER(WHERE account_id=$1 AND lane='CONTINUATION' AND admitted_at>$4)::int AS "accountContinuationAttempts"
        FROM private.galx_sites_fair_invocations WHERE (account_id=$1 OR pool_id=$2)
        AND (state IN ('reserved','dispatching','unknown') OR admitted_at>$4 OR (account_id=$1 AND allowance_window=$3 AND counted))`,[account,policy.pool_id,window,start])).rows[0] as FairCounts;
      await db.query('DELETE FROM private.galx_sites_fair_demand WHERE pool_id=$1 AND expires_at<=$2',[policy.pool_id,new Date(now)]);
      counts.activeDemand=Number((await db.query('SELECT count(*) FROM private.galx_sites_fair_demand WHERE pool_id=$1',[policy.pool_id])).rows[0].count);
      if(counts.messages>=p.baseline_message_threshold){
        const known=(await db.query('SELECT 1 FROM private.galx_sites_fair_demand WHERE pool_id=$1 AND account_id=$2',[policy.pool_id,account])).rowCount;
        if(!known&&counts.activeDemand>=10000)throw new FairUsageError(503,'demand_bound');
        await db.query(`INSERT INTO private.galx_sites_fair_demand(pool_id,account_id,expires_at) VALUES($1,$2,$3)
          ON CONFLICT(pool_id,account_id) DO UPDATE SET expires_at=EXCLUDED.expires_at`,[policy.pool_id,account,new Date(now+p.active_continuation_demand_ttl_seconds*1000)]);
        if(!known)counts.activeDemand++;
      }
      let lane:FairLane;
      now=await this.now(db);
      if(Math.floor(now/(p.allowance_window_seconds*1000))!==window||access.validUntil<=now||Number(pool.snapshot?.revision)!==Number(pool.revision))throw new FairUsageError(503,'stale_admission');
      try {lane=decideFairAdmission(p,pool.snapshot,counts,now,policy.pool_id);}catch(error){
        if(error instanceof FairUsageError)return {denial:error,counts,snapshot:pool.snapshot}; // Commit bounded demand, never a logical charge.
        throw error;
      }
      const row=(await db.query<FairInvocation>(`INSERT INTO private.galx_sites_fair_invocations
        (account_id,invocation_id,pool_id,digest,allowance_window,lane,state,admitted_at,grant_id,grant_expires_at,policy_revision,snapshot_revision)
        VALUES($1,$2,$3,$4,$5,$6,'reserved',$7,$8,$9,$10,$11) RETURNING *`,[account,invocation,policy.pool_id,digest,window,lane,new Date(now),randomUUID(),new Date(now+p.dispatch_grant_expiry_milliseconds),policy.revision,Number(pool.revision)])).rows[0];
      return {row,dispatch:true,counts,snapshot:pool.snapshot};
    },deadline);
    this.observe({event:'admission',account:createHash('sha256').update(account).digest('hex').slice(0,16),pool:policy.pool_id,invocation,
      policy_revision:policy.revision,duration_ms:performance.now()-started,decision:result.denial?result.denial.reason:result.dispatch?'admitted':'replay',
      ...('counts' in result?{counts:result.counts,snapshot_revision:result.snapshot?.revision,signal_basis:result.snapshot?.signal_basis}:{}),
      ...(result.row?{lane:result.row.lane}:{})});
    if('denial' in result)throw result.denial;
    return result;
  }
  private async change<T>(account:string,invocation:string,run:(db:PoolClient,row:FairInvocation,now:number)=>Promise<T>):Promise<T>{
    return this.tx(async(db,now)=>{
      await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`sites-fair-account:${account}`]);
      const found=(await db.query<FairInvocation>('SELECT * FROM private.galx_sites_fair_invocations WHERE account_id=$1 AND invocation_id=$2',[account,invocation])).rows[0];
      if(!found)throw new FairUsageError(404,'invocation_missing');
      await db.query('SELECT 1 FROM private.galx_sites_fair_pools WHERE pool_id=$1 FOR UPDATE',[found.pool_id]);
      const row=(await db.query<FairInvocation>('SELECT * FROM private.galx_sites_fair_invocations WHERE account_id=$1 AND invocation_id=$2 FOR UPDATE',[account,invocation])).rows[0];
      return run(db,row,await this.now(db));
    });
  }
  async start(account:string,invocation:string,grant:string):Promise<boolean>{
    return this.change(account,invocation,async(db,row,now)=>{
      if(row.state!=='reserved'||row.grant_id!==grant)return false;
      if(row.grant_expires_at.getTime()<=now){await db.query(`UPDATE private.galx_sites_fair_invocations SET state='not_started',counted=false WHERE account_id=$1 AND invocation_id=$2`,[account,invocation]);return false;}
      await db.query(`UPDATE private.galx_sites_fair_invocations SET state='dispatching' WHERE account_id=$1 AND invocation_id=$2`,[account,invocation]);return true;
    });
  }
  async cancelReserved(account:string,invocation:string,onlyExpired=false):Promise<void>{
    await this.change(account,invocation,async(db,row,now)=>{if(row.state==='reserved'&&(!onlyExpired||row.grant_expires_at.getTime()<=now))await db.query(`UPDATE private.galx_sites_fair_invocations SET state='not_started',counted=false WHERE account_id=$1 AND invocation_id=$2`,[account,invocation]);});
  }
  async accepted(account:string,invocation:string,job:string,origin:string):Promise<void>{
    if(!/^[a-zA-Z0-9_.:-]{1,4096}$/.test(job))throw new FairUsageError(503,'receipt',undefined,false);
    await this.change(account,invocation,async(db,row)=>{
      if(row.state!=='dispatching'||(row.job_id&&(row.job_id!==job||row.origin!==origin)))throw new FairUsageError(503,'receipt',undefined,false);
      await db.query('UPDATE private.galx_sites_fair_invocations SET job_id=$3,origin=$4 WHERE account_id=$1 AND invocation_id=$2',[account,invocation,job,origin]);
    });
  }
  /** Only the server adapter calls this for an authenticated, explicitly
   * not-accepted response from a known pre-dispatch failure path. */
  async notAccepted(account:string,invocation:string,grant:string,evidence:{requestId:string;code:string}):Promise<void>{
    await this.change(account,invocation,async(db,row)=>{
      if(row.grant_id!==grant||row.job_id||!['dispatching','not_started'].includes(row.state))throw new FairUsageError(503,'rejection_conflict',undefined,false);
      await db.query(`UPDATE private.galx_sites_fair_invocations SET state='not_started',counted=false,non_dispatch_evidence=COALESCE(non_dispatch_evidence,$3::jsonb) WHERE account_id=$1 AND invocation_id=$2`,[account,invocation,evidence]);
    });
  }
  async terminal(account:string,invocation:string,job:string,state:'completed'|'not_started'|'failed',output:string|null):Promise<FairInvocation>{
    if(output!==null&&(typeof output!=='string'||Buffer.byteLength(output)>12000))throw new FairUsageError(503,'receipt',undefined,false);
    return this.change(account,invocation,async(db,row)=>{
      if(row.job_id!==job)throw new FairUsageError(503,'receipt',undefined,false);
      if(['completed','failed','not_started'].includes(row.state)){
        if(row.state!==state||row.output!==output)throw new FairUsageError(503,'receipt',undefined,false);return row;
      }
      return (await db.query<FairInvocation>(`UPDATE private.galx_sites_fair_invocations SET state=$3,output=$4,counted=CASE WHEN $3='not_started' THEN false ELSE counted END WHERE account_id=$1 AND invocation_id=$2 RETURNING *`,[account,invocation,state,output])).rows[0];
    });
  }
  async cooldown(poolId:string,until:number,account?:string):Promise<void>{
    await this.tx(async db=>{
      if(account){await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`sites-fair-account:${account}`]);
        await db.query(`INSERT INTO private.galx_sites_fair_cooldowns(account_id,until_at) VALUES($1,$2) ON CONFLICT(account_id) DO UPDATE SET until_at=GREATEST(galx_sites_fair_cooldowns.until_at,EXCLUDED.until_at)`,[account,new Date(until)]);
      }else await db.query(`UPDATE private.galx_sites_fair_pools SET revision=revision+1,cooldown_until=GREATEST(cooldown_until,$2),snapshot=NULL,refresh_token=NULL,refresh_until=NULL WHERE pool_id=$1`,[poolId,new Date(until)]);
    });
  }
}
