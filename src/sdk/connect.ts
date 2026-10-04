import { bufferInferenceResult } from './inference-result';
/** Public-client runtime. Expose invoke to an agent, never this runtime or its storage. */
export type ConnectOptions = {
  clientId: string;
  issuer?: string;
  resource?: string;
  redirectUri: string;
  /** Pending PKCE only. Browser navigation may use sessionStorage; no tokens are stored here. */
  pendingStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  fetch?: typeof fetch;
};
type Pending = { state: string; verifier: string; redirectUri: string; expires: number };
type Tokens = { access: string; refresh: string; expires: number };
export class GalxConnectError extends Error {
  constructor(readonly code: 'connection_required' | 'connection_failed' | 'disconnection_unconfirmed') {
    super(code === 'disconnection_unconfirmed' ? 'Disconnection could not be confirmed. Try again, or disconnect from your GALX account.' : code === 'connection_required' ? 'Connect with GALX to continue.' : 'The connection could not be completed. Start again.');
  }
}
function publicUrl(value: string): URL {
  const u = new URL(value);
  if (u.username || u.password || u.hash || (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['127.0.0.1','[::1]'].includes(u.hostname)))) throw new GalxConnectError('connection_failed');
  return u;
}
function base64url(bytes: Uint8Array) { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
const secret = () => base64url(crypto.getRandomValues(new Uint8Array(32)));

export class GalxConnection {
  #tokens: Tokens | null = null;
  #pending: string | null = null;
  #refreshing: Promise<void> | null = null;
  #epoch = 0;
  #issuer: string;
  #resource: string;
  #redirect: string;
  #fetch: typeof fetch;
  #clientId: string;
  #storage?: ConnectOptions['pendingStorage'];
  #storageKey: string;
  constructor(options: ConnectOptions) {
    const issuer = publicUrl(options.issuer || 'https://galx.ai'), resource = publicUrl(options.resource || 'https://nova.galx.ai');
    if (issuer.pathname !== '/' || issuer.search || resource.pathname !== '/' || resource.search || !/^[A-Za-z0-9_-]{3,80}$/.test(options.clientId)) throw new GalxConnectError('connection_failed');
    const redirect = publicUrl(options.redirectUri);
    if (redirect.search || redirect.href !== options.redirectUri) throw new GalxConnectError('connection_failed');
    this.#issuer = issuer.origin; this.#resource = resource.origin; this.#redirect = redirect.href;
    this.#clientId = options.clientId; this.#storage = options.pendingStorage; this.#fetch = options.fetch || globalThis.fetch.bind(globalThis);
    this.#storageKey = `galx-connect-pending:${this.#issuer}:${options.clientId}`;
  }
  get connected(): boolean { return this.#tokens !== null; }
  #savePending(value: string | null) {
    this.#pending = value;
    if (this.#storage) { if (value === null) this.#storage.removeItem(this.#storageKey); else this.#storage.setItem(this.#storageKey, value); }
  }
  async #token(body: Record<string, string>): Promise<Tokens> {
    const response = await this.#fetch(`${this.#issuer}/oauth/token`, { method: 'POST', credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15_000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...body, client_id: this.#clientId, resource: this.#resource }) });
    if (!response.ok) throw new GalxConnectError('connection_required');
    const data = await response.json();
    if (!/^galx_connect_at_[A-Za-z0-9_-]{43}$/.test(data.access_token) || !/^galx_connect_rt_[A-Za-z0-9_-]{43}$/.test(data.refresh_token) || data.token_type !== 'Bearer' || data.scope !== 'inference:invoke' || !Number.isInteger(data.expires_in) || data.expires_in < 1 || data.expires_in > 300) throw new GalxConnectError('connection_failed');
    return { access: data.access_token, refresh: data.refresh_token, expires: Date.now() + data.expires_in * 1000 };
  }
  /** No argument: navigate the returned URL in the system browser. Callback: finish that flow. */
  async connect(callbackUrl?: string): Promise<string | void> {
    const version = ++this.#epoch;
    this.#tokens = null;
    if (callbackUrl === undefined) {
      const pending: Pending = { state: secret(), verifier: secret(), redirectUri: this.#redirect, expires: Date.now() + 600_000 };
      const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pending.verifier))));
      this.#savePending(JSON.stringify(pending));
      const url = new URL('/oauth/authorize', this.#issuer);
      url.search = new URLSearchParams({ response_type: 'code', client_id: this.#clientId, redirect_uri: this.#redirect, scope: 'inference:invoke', resource: this.#resource, state: pending.state, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
      return url.href;
    }
    try {
      const pending: Pending = JSON.parse(this.#storage?.getItem(this.#storageKey) || this.#pending || 'null');
      this.#savePending(null);
      const url = publicUrl(callbackUrl), redirect = new URL(this.#redirect);
      if (!pending || pending.expires <= Date.now() || pending.redirectUri !== this.#redirect || url.origin !== redirect.origin || url.pathname !== redirect.pathname || url.searchParams.get('state') !== pending.state || url.searchParams.get('iss') !== this.#issuer) throw new Error();
      for (const key of url.searchParams.keys()) if (!['code','state','iss','error'].includes(key) || url.searchParams.getAll(key).length !== 1) throw new Error();
      if (url.searchParams.has('error') || !/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get('code') || '')) throw new Error();
      const tokens = await this.#token({ grant_type: 'authorization_code', code: url.searchParams.get('code')!, code_verifier: pending.verifier, redirect_uri: pending.redirectUri });
      if (version === this.#epoch) this.#tokens = tokens;
    } catch { throw new GalxConnectError('connection_failed'); }
  }
  async #ready() {
    if (!this.#tokens) throw new GalxConnectError('connection_required');
    if (this.#tokens.expires - Date.now() > 30_000) return;
    if (!this.#refreshing) {
      const refresh = this.#tokens.refresh, version = this.#epoch;
      this.#refreshing = (async () => {
        try { const next = await this.#token({ grant_type: 'refresh_token', refresh_token: refresh }); if (version === this.#epoch) this.#tokens = next; }
        catch { if (version === this.#epoch) this.#tokens = null; throw new GalxConnectError('connection_required'); }
        finally { this.#refreshing = null; }
      })();
    }
    // A lost rotation response is not retried with a possibly spent token.
    await this.#refreshing;
  }
  /** One streamed submission. Default callers receive a bounded complete answer;
   * stream:true exposes incremental output. Abort never starts another attempt. */
  async invoke(messages: { role: 'system' | 'user' | 'assistant'; content: string }[], options: { stream?: boolean; signal?: AbortSignal; maxTokens?: number; requestId?: string } = {}): Promise<Response> {
    await this.#ready();
    if (!this.#tokens) throw new GalxConnectError('connection_required');
    const response = await this.#fetch(`${this.#resource}/v1/inference`, { method: 'POST', credentials: 'omit', redirect: 'error', cache: 'no-store', signal: options.signal,
      headers: { Authorization: `Bearer ${this.#tokens.access}`, 'Content-Type': 'application/json', 'Idempotency-Key': options.requestId || crypto.randomUUID() },
      body: JSON.stringify({ model: 'galx-nova', messages, stream: true, ...(options.maxTokens !== undefined ? { max_tokens: options.maxTokens } : {}) }) });
    return options.stream === true ? response : bufferInferenceResult(response, options.signal);
  }
  async disconnect(): Promise<void> {
    ++this.#epoch; this.#savePending(null);
    if (!this.#tokens) throw new GalxConnectError('disconnection_unconfirmed');
    try {
      const response = await this.#fetch(`${this.#issuer}/oauth/revoke`, { method: 'POST', credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15_000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: this.#clientId, token: this.#tokens.refresh, token_type_hint: 'refresh_token' }) });
      if (!response.ok) throw new Error();
      this.#tokens = null;
    } catch { throw new GalxConnectError('disconnection_unconfirmed'); }
  }
}
