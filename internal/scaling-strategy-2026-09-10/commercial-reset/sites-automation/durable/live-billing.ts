import { exact, identifier, requireThat, JobError, amount } from './contracts';
import type { GenerationInput, GenerationReply } from './runner';

export class LiveBillingAdapter {
  private readonly endpoint: URL;
  constructor(origin: string, private readonly sessionToken: string, private readonly send: typeof fetch = fetch) {
    const url = new URL(origin);
    requireThat(url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/', 'invalid_billing_origin');
    requireThat(typeof sessionToken === 'string' && sessionToken.length > 0 && sessionToken.length <= 8192 && !/\s/.test(sessionToken), 'invalid_billing_session');
    this.endpoint = new URL('/api/sites/content', url);
  }
  private async request(method: 'GET' | 'POST', signal: AbortSignal, body?: unknown, operation?: string) {
    const url = new URL(this.endpoint);
    if (operation) url.searchParams.set('operationId', operation);
    const response = await this.send(url, { method, signal, redirect: 'error', credentials: 'omit',
      headers: { Authorization: `Bearer ${this.sessionToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    requireThat(response.ok, 'billing_service_unavailable');
    const reader = response.body?.getReader(); requireThat(reader, 'billing_response_invalid');
    let size = 0; const chunks: Uint8Array[] = [];
    try { while (true) { const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength; requireThat(size <= 65536, 'billing_response_invalid'); chunks.push(part.value); }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch { throw new JobError('billing_response_invalid'); }
    finally { await reader.cancel().catch(() => {}); }
  }
  async quote(signal: AbortSignal) {
    const value = await this.request('GET', signal);
    exact(value, ['currency', 'unit', 'quoteVersion', 'maxChargeMicroUsd']);
    identifier(value.quoteVersion); amount(value.maxChargeMicroUsd);
    requireThat(value.currency === 'USD' && value.unit === 'micro_usd' && value.maxChargeMicroUsd > 0, 'billing_quote_invalid');
    return { version: value.quoteVersion, maximum: value.maxChargeMicroUsd };
  }
  private reply(value: any, operationId: string): GenerationReply {
    exact(value, ['operationId', 'text', 'cost']);
    requireThat(value.operationId === operationId && typeof value.text === 'string' && Buffer.byteLength(value.text) <= 12000, 'billing_receipt_mismatch');
    if (value.cost !== null) {
      exact(value.cost, ['units', 'receipt']); amount(value.cost.units); identifier(value.cost.receipt);
      return { text: value.text, cost: { units: value.cost.units, receipt: value.cost.receipt } };
    }
    return { text: value.text, cost: null };
  }
  async generate(input: GenerationInput, quote: { version: string; maximum: number }) {
    identifier(input.operationId);
    const user = input.messages.filter(m => m.role === 'user'); requireThat(user.length > 0, 'invalid_brief');
    return this.reply(await this.request('POST', input.signal, { operationId: input.operationId, brief: user[0].content,
      repair: user.length > 1, quoteVersion: quote.version, maxChargeMicroUsd: quote.maximum }), input.operationId);
  }
  async reconcile(operationId: string, signal: AbortSignal) {
    identifier(operationId);
    return this.reply(await this.request('GET', signal, undefined, operationId), operationId);
  }
}
