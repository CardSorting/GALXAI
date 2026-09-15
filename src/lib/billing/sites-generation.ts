/** Private server adapter. Never construct this in a customer-owned companion.
 * The host resolves owner from authenticated server context and owns the pool,
 * relay credential and rate card. No browser route accepts usage or receipts.
 */
import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { executeRelayChat, readRelayReceipt, type RelayChatOptions } from '../../core/router/adapters/RelayChatTransport';
import { isolatedRelaysEnabled, receiptRelay } from '../../core/router/adapters/IsolatedRelayTransport';

export class SitesBillingError extends Error {
  constructor(readonly code: string) { super(code); this.name = 'SitesBillingError'; }
}
function check(value: unknown, code: string): asserts value { if (!value) throw new SitesBillingError(code); }
function int(value: unknown, maximum = 1_000_000_000): asserts value is number {
  check(Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= maximum, 'invalid_billing_quantity');
}
const hash = (v: string) => createHash('sha256').update(v).digest('hex');
const usd = (micro: number) => `${Math.floor(micro / 1_000_000)}.${String(micro % 1_000_000).padStart(6, '0')}`;
export interface SitesRateCard {
  version: string;
  model: string;
  inputMicroUsdPerMillion: number;
  outputMicroUsdPerMillion: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  /** A customer price per completed operation; never a claim about supplier cost. */
  billingMode?: 'fixed';
  fixedChargeMicroUsd?: number;
  maxDailyGenerations?: number;
}
export const DEFAULT_SITES_RATE_CARD: Readonly<SitesRateCard> = Object.freeze({
  version: 'sites-fixed-005-v1', model: 'gpt-5.6-luna', billingMode: 'fixed', fixedChargeMicroUsd: 50_000,
  inputMicroUsdPerMillion: 0, outputMicroUsdPerMillion: 0, maxInputTokens: 4096, maxOutputTokens: 2048, maxDailyGenerations: 20,
});
export function sitesRateCard(raw: string | undefined): SitesRateCard {
  return raw === undefined ? { ...DEFAULT_SITES_RATE_CARD } : JSON.parse(raw);
}
export interface SitesGenerationInput {
  operationId: string;
  requestedModel: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  signal: AbortSignal;
}
export interface SitesGenerationReply { text: string; cost: { units: number; receipt: string } | null; }
interface Evidence { prompt: number; completion: number; total: number; }
interface Hold {
  id: string; user_id: string; wallet_id: string; status: string;
  metadata: { kind: string; fingerprint: string; rate: SitesRateCard; reservation: number;
    relayJobId?: string; relayOrigin?: string; durableReceipt?: boolean; nonDispatchReceipt?: string;
    outcome?: { text: string; usage: Evidence | null; providerReceipt: string; confirmedCompletion?: boolean; }; receipt?: string; charge?: number; };
}
export function tokenCharge(rate: SitesRateCard, input: number, output: number): number {
  int(input); int(output); int(rate.inputMicroUsdPerMillion); int(rate.outputMicroUsdPerMillion);
  const numerator = BigInt(input) * BigInt(rate.inputMicroUsdPerMillion) + BigInt(output) * BigInt(rate.outputMicroUsdPerMillion);
  const result = Number((numerator + 999_999n) / 1_000_000n); int(result); return result;
}
function usageEvidence(value: unknown): Evidence | null {
  if (!value || typeof value !== 'object') return null;
  const u = value as Record<string, unknown>;
  try {
    int(u.prompt_tokens); int(u.completion_tokens); int(u.total_tokens);
    check(u.total_tokens === u.prompt_tokens + u.completion_tokens && u.total_tokens > 0, 'invalid_usage');
    // Cached input is charged at the published input rate. No invented discount.
    return { prompt: u.prompt_tokens, completion: u.completion_tokens, total: u.total_tokens };
  } catch { return null; }
}

export class PostgresSitesBilling {
  readonly rate: Readonly<SitesRateCard>;
  readonly reservation: number;
  constructor(private readonly pool: Pick<Pool, 'connect'>, readonly owner: string, rate: SitesRateCard) {
    check(typeof window === 'undefined', 'server_only');
    check(typeof owner === 'string' && owner.trim() === owner && owner.length > 0 && owner.length <= 255, 'invalid_billing_owner');
    check(rate && typeof rate === 'object' && !Array.isArray(rate), 'invalid_rate_card');
    const fields = ['version', 'model', 'inputMicroUsdPerMillion', 'outputMicroUsdPerMillion', 'maxInputTokens', 'maxOutputTokens'];
    if (rate.billingMode === 'fixed') fields.push('billingMode', 'fixedChargeMicroUsd', 'maxDailyGenerations');
    check(Object.keys(rate).sort().join(',') === fields.sort().join(','), 'invalid_rate_card');
    check(/^[a-zA-Z0-9_.:-]{1,120}$/.test(rate.version) && /^[a-zA-Z0-9_.:-]{1,120}$/.test(rate.model), 'invalid_rate_card');
    int(rate.maxInputTokens); int(rate.maxOutputTokens);
    check(rate.maxInputTokens > 0 && rate.maxOutputTokens > 0, 'invalid_rate_card');
    this.rate = Object.freeze({ ...rate });
    const meteredReservation = tokenCharge(rate, rate.maxInputTokens, rate.maxOutputTokens);
    if (rate.billingMode === 'fixed') {
      int(rate.fixedChargeMicroUsd);
      int(rate.maxDailyGenerations, 100);
      check(rate.maxDailyGenerations > 0, 'invalid_rate_card');
      // Do not mix a flat customer tariff with invented per-token supplier rates.
      check(rate.inputMicroUsdPerMillion === 0 && rate.outputMicroUsdPerMillion === 0, 'invalid_rate_card');
    }
    this.reservation = rate.billingMode === 'fixed' ? rate.fixedChargeMicroUsd! : meteredReservation;
    check(this.reservation > 0, 'invalid_rate_card');
  }
  private holdId(operation: string) {
    check(/^[a-zA-Z0-9_.:-]{1,120}$/.test(operation), 'invalid_operation');
    const h = hash(JSON.stringify(['sites-billing-v1', this.owner, operation]));
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
  }
  relayOperationId(operation: string): string {
    this.holdId(operation); // Validate without reusing a customer-visible receipt ID.
    return hash(JSON.stringify(['sites-relay-v1', this.owner, operation]));
  }
  private async transaction<T>(work: (db: PoolClient) => Promise<T>): Promise<T> {
    const db = await this.pool.connect(); let destroy = false;
    try {
      await db.query('BEGIN');
      await db.query("SET LOCAL lock_timeout = '2s'");
      await db.query("SET LOCAL statement_timeout = '5s'");
      const result = await work(db);
      await db.query('COMMIT'); // Lost COMMIT acknowledgement is uncertain; never replay inference.
      return result;
    } catch (error) {
      try { await db.query('ROLLBACK'); } catch { destroy = true; }
      if (error instanceof SitesBillingError) throw error;
      destroy = true;
      throw new SitesBillingError('billing_unavailable');
    } finally { db.release(destroy); }
  }
  private async wallet(db: PoolClient) {
    const result = await db.query<{ id: string; debt_free: boolean }>(
      'SELECT id, payment_debt_usd = 0 AS debt_free FROM public.galx_wallets WHERE user_id = $1 FOR UPDATE', [this.owner]);
    check(result.rows.length === 1, 'wallet_unavailable');
    return result.rows[0];
  }
  private replay(hold: Hold): SitesGenerationReply {
    check(hold.metadata.kind === 'sites-generation-v1' && hold.user_id === this.owner, 'billing_operation_conflict');
    check(hold.metadata.outcome, 'billing_needs_reconciliation');
    if (hold.status === 'ACTIVE') return { text: hold.metadata.outcome.text, cost: null };
    check(hold.status === 'COMMITTED' && typeof hold.metadata.receipt === 'string', 'billing_needs_reconciliation');
    int(hold.metadata.charge);
    return { text: hold.metadata.outcome.text, cost: { units: hold.metadata.charge, receipt: hold.metadata.receipt } };
  }
  async lookup(operation: string): Promise<SitesGenerationReply> {
    return this.transaction(async db => {
      const r = await db.query<Hold>('SELECT id, user_id, wallet_id, status, metadata FROM public.galx_wallet_holds WHERE id = $1 AND user_id = $2', [this.holdId(operation), this.owner]);
      check(r.rows.length === 1, 'billing_receipt_unavailable'); return this.replay(r.rows[0]);
    });
  }
  /** Private transport reference: never accepted from a customer or returned in a DTO. */
  async accepted(operation: string, jobId: string, origin: string, durableReceipt = false): Promise<void> {
    check(/^[a-zA-Z0-9_.:-]{1,4096}$/.test(jobId), 'invalid_generation_evidence');
    await this.transaction(async db => {
      await this.wallet(db);
      const r = await db.query<Hold>('SELECT id, user_id, wallet_id, status, metadata FROM public.galx_wallet_holds WHERE id = $1 AND user_id = $2 FOR UPDATE', [this.holdId(operation), this.owner]);
      const hold = r.rows[0];
      check(hold?.status === 'ACTIVE' && hold.metadata.kind === 'sites-generation-v1', 'billing_needs_reconciliation');
      check(!hold.metadata.relayJobId || (hold.metadata.relayJobId === jobId && hold.metadata.relayOrigin === origin && !!hold.metadata.durableReceipt === durableReceipt), 'billing_evidence_conflict');
      await db.query('UPDATE public.galx_wallet_holds SET metadata = metadata || $2::jsonb, updated_at = now() WHERE id = $1',
        [hold.id, JSON.stringify({ relayJobId: jobId, relayOrigin: origin, durableReceipt })]);
    });
  }
  async pendingReference(operation: string): Promise<{ jobId: string; origin: string; model: string; durable: boolean } | null> {
    return this.transaction(async db => {
      const r = await db.query<Hold>('SELECT id, user_id, wallet_id, status, metadata FROM public.galx_wallet_holds WHERE id = $1 AND user_id = $2', [this.holdId(operation), this.owner]);
      const h = r.rows[0]; check(h?.metadata.kind === 'sites-generation-v1', 'billing_receipt_unavailable');
      if (h.status !== 'ACTIVE' || !h.metadata.relayJobId || !h.metadata.relayOrigin) return null;
      return { jobId: h.metadata.relayJobId, origin: h.metadata.relayOrigin, model: h.metadata.rate.model, durable: h.metadata.durableReceipt === true };
    });
  }
  async begin(input: SitesGenerationInput): Promise<{ dispatch: true } | { dispatch: false; reply: SitesGenerationReply }> {
    check(input.requestedModel === this.rate.model && Array.isArray(input.messages) && input.messages.length <= 4 &&
      input.messages.every(m => ['system', 'user'].includes(m.role) && typeof m.content === 'string') &&
      Buffer.byteLength(JSON.stringify(input.messages)) <= 12000, 'invalid_generation_request');
    const id = this.holdId(input.operationId);
    const fingerprint = hash(JSON.stringify([input.requestedModel, input.messages]));
    return this.transaction(async db => {
      // All paths lock wallet, then hold. Serialize admission across host processes.
      const wallet = await this.wallet(db);
      const existing = await db.query<Hold>('SELECT id, user_id, wallet_id, status, metadata FROM public.galx_wallet_holds WHERE id = $1 FOR UPDATE', [id]);
      if (existing.rows[0]) {
        const hold = existing.rows[0];
        check(hold.metadata.fingerprint === fingerprint, 'billing_operation_conflict');
        return { dispatch: false, reply: this.replay(hold) };
      }
      check(wallet.debt_free, 'billing_debt_outstanding');
      const active = await db.query("SELECT id FROM public.galx_wallet_holds WHERE user_id = $1 AND status = 'ACTIVE' AND metadata->>'kind' = 'sites-generation-v1' LIMIT 1", [this.owner]);
      check(!active.rows.length, 'billing_needs_reconciliation');
      if (this.rate.billingMode === 'fixed') {
        // The wallet lock serializes this rolling allowance across host processes.
        // Count every admitted attempt, including uncertain and unused operations.
        const recent = await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM public.galx_wallet_holds
          WHERE user_id = $1 AND metadata->>'kind' = 'sites-generation-v1' AND created_at > now() - interval '24 hours'`, [this.owner]);
        check(recent.rows[0].count < this.rate.maxDailyGenerations!, 'generation_allowance_exhausted');
      }
      const debit = await db.query('UPDATE public.galx_wallets SET balance_usd = balance_usd - $2::numeric, updated_at = now() WHERE id = $1 AND balance_usd >= $2::numeric RETURNING id', [wallet.id, usd(this.reservation)]);
      check(debit.rows.length === 1, 'insufficient_funds');
      await db.query(`INSERT INTO public.galx_wallet_holds
        (id, wallet_id, user_id, estimated_cost_usd, status, expires_at, metadata)
        VALUES ($1, $2, $3, $4::numeric, 'ACTIVE', 'infinity', $5::jsonb)`,
      [id, wallet.id, this.owner, usd(this.reservation), JSON.stringify({ kind: 'sites-generation-v1', fingerprint, rate: this.rate, reservation: this.reservation })]);
      return { dispatch: true };
    });
  }
  /** A fenced worker positively confirmed that this accepted job never left
   * its queue. Missing, failed, cancelled or expired work cannot use this path. */
  async confirmNotStarted(operation: string, providerReceipt: string): Promise<SitesGenerationReply> {
    return this.transaction(async db => {
      const wallet = await this.wallet(db);
      const result = await db.query<Hold>('SELECT id, user_id, wallet_id, status, metadata FROM public.galx_wallet_holds WHERE id=$1 AND user_id=$2 FOR UPDATE', [this.holdId(operation), this.owner]);
      const hold = result.rows[0];
      check(hold && hold.wallet_id === wallet.id && hold.metadata.kind === 'sites-generation-v1' &&
        hold.metadata.durableReceipt === true && hold.metadata.relayJobId === providerReceipt, 'billing_evidence_conflict');
      if (hold.metadata.nonDispatchReceipt === providerReceipt && hold.status === 'COMMITTED') return this.replay(hold);
      check(hold.status === 'ACTIVE' && !hold.metadata.outcome, 'billing_evidence_conflict');
      const credited = await db.query<{ balance_usd: string }>('UPDATE public.galx_wallets SET balance_usd=balance_usd+$2::numeric, updated_at=now() WHERE id=$1 RETURNING balance_usd',
        [wallet.id, usd(hold.metadata.reservation)]);
      await db.query(`INSERT INTO public.galx_wallet_transactions
        (id,wallet_id,user_id,transaction_type,amount_usd,balance_after_usd,description,model,prompt_tokens,completion_tokens,cached_tokens,metadata)
        VALUES ($1,$2,$3,'usage_draw',0,$4::numeric,'Unused content reservation',$5,0,0,0,$6::jsonb)`,
      [hold.id, wallet.id, this.owner, credited.rows[0].balance_usd, hold.metadata.rate.model,
        JSON.stringify({ hold_id: hold.id, rate_version: hold.metadata.rate.version, metering: 'relay_confirmed_not_started', evidence_hash: hash(providerReceipt) })]);
      const outcome = { text: '', usage: null, providerReceipt };
      await db.query("UPDATE public.galx_wallet_holds SET status='COMMITTED',actual_cost_usd=0,metadata=metadata||$2::jsonb,updated_at=now() WHERE id=$1",
        [hold.id, JSON.stringify({ nonDispatchReceipt: providerReceipt, outcome, receipt: hold.id, charge: 0 })]);
      return { text: '', cost: { units: 0, receipt: hold.id } };
    });
  }
  /** Only the trusted relay adapter calls this with transport-derived evidence. */
  async complete(operation: string, text: string, upstreamUsage: unknown, providerReceipt: string, confirmedCompletion = false): Promise<SitesGenerationReply> {
    check(typeof text === 'string' && Buffer.byteLength(text) <= 12000 && typeof providerReceipt === 'string' &&
      providerReceipt.length > 0 && providerReceipt.length <= 4096 && !/[\u0000-\u001f]/.test(providerReceipt), 'invalid_generation_evidence');
    const outcome = { text, usage: usageEvidence(upstreamUsage), providerReceipt, confirmedCompletion };
    return this.transaction(async db => {
      const wallet = await this.wallet(db);
      const result = await db.query<Hold>('SELECT id, user_id, wallet_id, status, metadata FROM public.galx_wallet_holds WHERE id = $1 AND user_id = $2 FOR UPDATE', [this.holdId(operation), this.owner]);
      const hold = result.rows[0];
      check(hold && hold.wallet_id === wallet.id && hold.metadata.kind === 'sites-generation-v1', 'billing_receipt_unavailable');
      check(!hold.metadata.relayJobId || hold.metadata.relayJobId === providerReceipt, 'billing_evidence_conflict');
      const fixed = hold.metadata.rate.billingMode === 'fixed';
      if (fixed && confirmedCompletion) check(hold.metadata.durableReceipt === true && hold.metadata.relayJobId === providerReceipt, 'billing_evidence_conflict');
      if (hold.metadata.outcome) {
        const old = hold.metadata.outcome;
        check(old.text === outcome.text && old.providerReceipt === outcome.providerReceipt, 'billing_evidence_conflict');
        if (fixed && hold.status === 'COMMITTED') return this.replay(hold);
        if (old.usage && !fixed) {
          check(outcome.usage && old.usage.prompt === outcome.usage.prompt && old.usage.completion === outcome.usage.completion && old.usage.total === outcome.usage.total, 'billing_evidence_conflict');
          return this.replay(hold);
        }
        if (fixed ? !confirmedCompletion : !outcome.usage) return this.replay(hold);
        // A trusted reconciliation reader may supply previously missing usage
        // for this exact upstream receipt/content. Clients have no such endpoint.
      }
      check(hold.status === 'ACTIVE', 'billing_needs_reconciliation');
      const rate = hold.metadata.rate;
      const usable = fixed ? confirmedCompletion : outcome.usage && outcome.usage.prompt <= rate.maxInputTokens && outcome.usage.completion <= rate.maxOutputTokens;
      if (!usable) {
        // An uncertain completion stays held. Metered tariffs additionally need usage.
        await db.query('UPDATE public.galx_wallet_holds SET metadata = metadata || $2::jsonb, updated_at = now() WHERE id = $1', [hold.id, JSON.stringify({ outcome })]);
        return { text, cost: null };
      }
      const charge = fixed ? rate.fixedChargeMicroUsd! : tokenCharge(rate, outcome.usage!.prompt, outcome.usage!.completion);
      check(charge <= hold.metadata.reservation, 'billing_reservation_exceeded');
      const credited = await db.query<{ balance_usd: string }>(`UPDATE public.galx_wallets
        SET balance_usd = balance_usd + $2::numeric, lifetime_spent_usd = lifetime_spent_usd + $3::numeric, updated_at = now()
        WHERE id = $1 RETURNING balance_usd`, [wallet.id, usd(hold.metadata.reservation - charge), usd(charge)]);
      // Receipt ID is durable and unique even across process restarts.
      await db.query(`INSERT INTO public.galx_wallet_transactions
        (id, wallet_id, user_id, transaction_type, amount_usd, balance_after_usd, description, model,
         prompt_tokens, completion_tokens, cached_tokens, metadata)
        VALUES ($1, $2, $3, 'usage_draw', -$4::numeric, $5::numeric, 'Content generation', $6, $7, $8, 0, $9::jsonb)`,
      [hold.id, wallet.id, this.owner, usd(charge), credited.rows[0].balance_usd, rate.model,
        outcome.usage?.prompt ?? null, outcome.usage?.completion ?? null,
        JSON.stringify({ hold_id: hold.id, rate_version: rate.version, metering: fixed ? 'fixed_completion' : 'provider_usage', evidence_hash: hash(JSON.stringify(outcome)) })]);
      await db.query("UPDATE public.galx_wallet_holds SET status = 'COMMITTED', actual_cost_usd = $2::numeric, metadata = metadata || $3::jsonb, updated_at = now() WHERE id = $1",
        [hold.id, usd(charge), JSON.stringify({ outcome, receipt: hold.id, charge })]);
      return { text, cost: { units: charge, receipt: hold.id } };
    });
  }
}

export function createBilledRelayGenerator(billing: PostgresSitesBilling, relay: { url: string; key: string },
  transport: typeof executeRelayChat = executeRelayChat, receiptReader = readRelayReceipt) {
  const url = new URL(relay.url);
  check(!url.username && !url.password && !url.search && !url.hash && url.pathname === '/' &&
    (url.protocol === 'https:' || (url.protocol === 'http:' && ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname))) &&
    typeof relay.key === 'string' && relay.key.trim().length > 0, 'invalid_relay_configuration');
  const configured = Object.freeze({ ...relay, tenant: isolatedRelaysEnabled()?billing.relayOperationId('tenant'):undefined });
  return async (input: SitesGenerationInput): Promise<SitesGenerationReply> => {
    check(!input.signal.aborted, 'generation_interrupted');
    // Snapshot before any await: caller mutation must not change a billed request.
    const request = { ...input, messages: structuredClone(input.messages) };
    const admission = await billing.begin(request);
    if (!admission.dispatch) return admission.reply;
    check(!input.signal.aborted, 'billing_needs_reconciliation');
    // A shared relay credential must never collapse two customers' chosen keys.
    const relayOperation = billing.relayOperationId(request.operationId);
    let acceptedId: string | undefined;
    const options: RelayChatOptions = { ...configured, signal: request.signal, taskId: relayOperation,
      onAccepted: async jobId => { await billing.accepted(request.operationId, jobId, url.origin, true); acceptedId = jobId; },
      idempotencyKey: relayOperation, payload: { model: request.requestedModel, messages: request.messages,
        stream: false, durable_receipt: true, reasoning_effort: 'none',
        ...(billing.rate.billingMode === 'fixed' ? { sites_profile: 'local-v1' } :
          { require_output_limit: true, max_tokens: billing.rate.maxOutputTokens }) },
      ttftTimeoutMs: 45000, idleTimeoutMs: 20000, wallTimeoutMs: 60000 };
    const result = await transport(options); // No automatic retry or provider fallback.
    const response = await result.response.json();
    check(acceptedId && acceptedId === response.id, 'billing_evidence_conflict');
    const text = response.choices?.[0]?.message?.content;
    let receipt;
    try { receipt = await receiptReader({ ...configured, jobId: acceptedId, signal: request.signal }); }
    catch { return billing.complete(request.operationId, text, undefined, acceptedId); }
    check(receipt.status === 'completed' && receipt.output === text && receipt.id === acceptedId, 'billing_evidence_conflict');
    return billing.complete(request.operationId, text, receipt.usage, acceptedId, true);
  };
}

/** Read the recorded job using the configured relay. No generation, fallback,
 * supplied usage, supplied job IDs, or refund based on an expired replay window. */
export async function reconcileBilledRelayGeneration(billing: PostgresSitesBilling, operation: string,
  relay: { url: string; key: string }, signal: AbortSignal, transport = executeRelayChat): Promise<SitesGenerationReply> {
  const reference = await billing.pendingReference(operation);
  if (!reference) return billing.lookup(operation);
  const source=receiptRelay(reference.origin,relay,billing.relayOperationId('tenant'));
  check(source, 'billing_needs_reconciliation');
  try {
    if (reference.durable) {
      const receipt = await readRelayReceipt({ ...source!, signal, jobId: reference.jobId });
      if (receipt.status === 'not_started') return await billing.confirmNotStarted(operation, receipt.id);
      if (receipt.status !== 'completed' || receipt.output === null) return billing.lookup(operation);
      return await billing.complete(operation, receipt.output, receipt.usage, receipt.id, true);
    }
    const result = await transport({ ...source!, signal, resumeJobId: reference.jobId, payload: { model: reference.model, stream: false },
      ttftTimeoutMs: 10000, idleTimeoutMs: 10000, wallTimeoutMs: 15000 });
    const response = await result.response.json();
    check(response.id === reference.jobId, 'billing_evidence_conflict');
    return await billing.complete(operation, response.choices?.[0]?.message?.content, response.usage, response.id);
  } catch (error) {
    if (error instanceof SitesBillingError) throw error;
    // Existing content remains reviewable while unavailable evidence stays held.
    return billing.lookup(operation);
  }
}
