import type { IncomingMessage } from 'node:http';
import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { CentralClient, hash, requestWorkload, type PoolId, type Workload } from './pool-protocol.js';
import { RequestError } from './request-policy.js';

export interface ExecutionGrant {
  signal: AbortSignal;
  assert(): void;
  complete(success: boolean, actualTokens?: number): Promise<void>;
}
export interface ExecutionPolicy {
  pool: PoolId;
  admit(req: IncomingMessage, body: Record<string, any>, tenant: string, executionId: string): Promise<ExecutionGrant>;
}
export interface AssignedAccount {
  id: string; revision: number; assignmentRevision: number; credentialRevision: string;
  state: 'enabled' | 'paused' | 'revoked'; desktopId: string; models: string[]; expiresAtMs: number;
  credential?: { accessToken: string; accountId: string };
}
export interface ExecutionRecord {
  requestKey: string; requestSha256: string; tenantSha256: string; accountId: string; epoch: string;
  executionId: string; workload: Workload; leaseId?: string; state: 'reserved' | 'running' | 'completed' | 'unknown';
  success?: boolean; actualTokens?: number; settled: boolean;
}
export interface ExecutionStore {
  call(action: string, body?: Record<string, unknown>): Promise<any>;
}
export class PostgresExecutionStore implements ExecutionStore {
  constructor(private readonly db: Pick<Pool,'query'>, private readonly pool: PoolId, private readonly installationId: string) {}
  async call(action: string, body: Record<string, unknown> = {}) {
    return (await this.db.query('SELECT private.relay_execution($1,$2::uuid,$3,$4::jsonb) AS result',[this.pool,this.installationId,action,JSON.stringify(body)])).rows[0].result;
  }
}
/** Short grants, independent expiry timers, durable reservations and retained settlement. */
export class PoolExecution {
  private grants = new Set<ExecutionGrant>();
  private finishes = new Map<string, Record<string, unknown>>();
  constructor(readonly central: CentralClient, readonly store: ExecutionStore, readonly epoch = randomUUID()) {}
  async settlePending() {
    // A database outage at completion retains the terminal intent for this process.
    // A crash is recovered as unknown from the previously persisted reservation.
    for (const [key, body] of this.finishes) {
      await this.store.call('finish',body);
      this.finishes.delete(key);
    }
    const pending: ExecutionRecord[] = await this.store.call('pending');
    for (const row of pending) {
      if (!row.leaseId) continue;
      try {
        const result = await this.central.call('/runtime/settle',{epoch:row.epoch,leaseId:row.leaseId,success:row.success === true,actualTokens:row.actualTokens ?? null});
        if (result.success === true) await this.store.call('settled',{requestKey:row.requestKey,leaseId:row.leaseId});
      } catch { /* Preserve the original receipt and retry settlement, never execution. */ }
    }
  }
  stop() { for (const grant of this.grants) void grant.complete(false).catch(()=>{}); }
  policy(account: AssignedAccount): ExecutionPolicy {
    return {pool:this.central.identity.pool,admit:(req,body,tenant,executionId)=>this.admit(account,req,body,tenant,executionId)};
  }
  private async admit(account: AssignedAccount, req: IncomingMessage, body: Record<string, any>, tenant: string, executionId: string): Promise<ExecutionGrant> {
    if (this.finishes.size) throw new RequestError(503,'service_unavailable','This service is temporarily unavailable.');
    const workload = requestWorkload(this.central.identity.pool,req.url ?? '',body);
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || !/^[\x21-\x7e]{1,128}$/.test(key)) throw new RequestError(400,'request_key_required','Supply an Idempotency-Key for this request.');
    const tenantSha256 = hash(tenant), requestKey = hash(JSON.stringify([tenantSha256,workload,key]));
    const requestSha256 = hash(JSON.stringify(body));
    const reserved: ExecutionRecord = await this.store.call('reserve',{requestKey,requestSha256,tenantSha256,accountId:account.id,epoch:this.epoch,executionId,workload});
    if (reserved.executionId !== executionId || reserved.state !== 'reserved') throw new RequestError(409,'request_already_recorded','This request has already been recorded. Check its existing result.');
    const common = {epoch:this.epoch,accountId:account.id,revision:account.revision,credentialRevision:account.credentialRevision};
    let authorization: any;
    try {
      authorization = await this.central.call('/runtime/acquire',{...common,workload,requestKey,requestSha256,tenantSha256,
        estimatedTokens:Math.min(1_000_000,Math.max(2000,Math.ceil(Buffer.byteLength(JSON.stringify(body))/3)+(Number.isSafeInteger(body.max_tokens)?body.max_tokens:3500)))});
      if (authorization.denied || typeof authorization.leaseId !== 'string') throw Error('Admission unavailable.');
      // Bind before any upstream I/O. A crash between acquisition and binding leaves a reserved identity, never permission to repeat.
      await this.store.call('bind',{requestKey,executionId,leaseId:authorization.leaseId});
    } catch {
      this.finishes.set(requestKey,{requestKey,executionId,success:false});
      // Acquisition may have succeeded before the execution database became unavailable.
      if (authorization?.leaseId) await this.central.call('/runtime/settle',{epoch:this.epoch,leaseId:authorization.leaseId,success:false,actualTokens:null}).catch(()=>{});
      await this.settlePending().catch(()=>{});
      throw new RequestError(503,'service_unavailable','This request could not be authorized. Check its status before retrying.');
    }
    const abort = new AbortController(); let expires = 0, deadline: NodeJS.Timeout, renewal: NodeJS.Timeout, done = false;
    const update = (value: any) => {
      if (value.leaseId !== authorization.leaseId || !Number.isSafeInteger(Number(value.expiresAtMs)) || Number(value.expiresAtMs) <= Date.now() + 1000 || Number(value.expiresAtMs) > Date.now()+35000) throw Error('Invalid grant.');
      expires = Number(value.expiresAtMs); authorization = value; clearTimeout(deadline);
      deadline = setTimeout(()=>abort.abort(new Error('Authorization expired.')),Math.max(1,expires-Date.now()-500)); deadline.unref();
    };
    const grant: ExecutionGrant = {
      signal:abort.signal,
      assert:()=>{ if (done || Date.now() >= expires-500) abort.abort(); abort.signal.throwIfAborted(); },
      complete:async(success,actualTokens)=>{
        if (done) return; done=true; clearTimeout(deadline); clearTimeout(renewal); this.grants.delete(grant); abort.abort();
        this.finishes.set(requestKey,{requestKey,executionId,success,...(actualTokens !== undefined ? {actualTokens}: {})});
        await this.settlePending();
      },
    };
    try { update(authorization); } catch { await grant.complete(false); throw new RequestError(503,'service_unavailable','This request could not be authorized.'); }
    const renew = () => { renewal = setTimeout(async()=>{
      if (done || abort.signal.aborted) return;
      try { update(await this.central.call('/runtime/renew',{...common,leaseId:authorization.leaseId,fencingToken:authorization.fencingToken})); }
      catch { abort.abort(new Error('Authorization unavailable.')); }
      if (!done && !abort.signal.aborted) renew();
    },8000); renewal.unref(); };
    this.grants.add(grant); renew(); return grant;
  }
}
