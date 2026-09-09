import { createHash, randomBytes } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { RequestError } from './request-policy.js';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const sessionSeconds = 12 * 60 * 60;
interface Grant { origin: string; expires: number }

/** An administrator can delegate a local, read-only browser session without sharing their key. */
export class MonitorSessions {
  private readonly tickets = new Map<string, Grant>();
  private readonly sessions = new Map<string, Grant>();
  constructor(private readonly now: () => number = Date.now, private readonly purpose: 'monitor' | 'desktop' = 'monitor') {}
  private prune() {
    for (const entries of [this.tickets, this.sessions]) for (const [key, grant] of entries) if (grant.expires <= this.now()) entries.delete(key);
  }
  origin(req: IncomingMessage): string {
    const host = req.headers.host;
    const port = req.socket.localPort;
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')
      || !port || ![`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`].includes(host ?? '')
      || Object.keys(req.headers).some(name => name === 'forwarded' || name.startsWith('x-forwarded-') || name.startsWith('cf-'))
      || (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(String(req.headers['sec-fetch-site'])))) {
      throw new RequestError(403, 'monitor_local_only', 'Open the monitor on the host computer.');
    }
    const origin = `http://${host}`;
    if (req.headers.origin && req.headers.origin !== origin) throw new RequestError(403, 'origin_not_allowed', 'Use the monitor from its own page.');
    return origin;
  }
  private cookieName(req: IncomingMessage) { return `galx_${this.purpose}_${req.socket.localPort}`; }
  private token(req: IncomingMessage): string {
    const values = (req.headers.cookie ?? '').split(';').map(value => value.trim()).filter(value => value.startsWith(`${this.cookieName(req)}=`));
    return values.length === 1 ? values[0].slice(this.cookieName(req).length + 1) : '';
  }
  issue(req: IncomingMessage): { ticket: string; expiresInSeconds: number } {
    const origin = this.origin(req); this.prune();
    if (this.tickets.size >= 32 || this.sessions.size >= 32) throw new RequestError(429, 'monitor_session_limit', 'Close an existing monitor session and try again.');
    const ticket = randomBytes(32).toString('hex');
    this.tickets.set(digest(ticket), { origin, expires: this.now() + 60000 });
    return { ticket, expiresInSeconds: 60 };
  }
  exchange(req: IncomingMessage, ticket: unknown): string {
    const origin = this.origin(req); this.prune();
    if (req.headers.origin !== origin || typeof ticket !== 'string' || !/^[a-f0-9]{64}$/.test(ticket)) throw new RequestError(401, 'monitor_link_invalid', 'Open a new monitor window from the host computer.');
    const grant = this.tickets.get(digest(ticket));
    if (!grant || grant.origin !== origin) throw new RequestError(401, 'monitor_link_expired', 'This sign-in link expired or was already used. Open the monitor again.');
    if (this.sessions.size >= 32) throw new RequestError(429, 'monitor_session_limit', 'Close an existing monitor session and try again.');
    this.tickets.delete(digest(ticket));
    const token = randomBytes(32).toString('hex');
    this.sessions.set(digest(token), { origin, expires: this.now() + sessionSeconds * 1000 });
    return `${this.cookieName(req)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionSeconds}`;
  }
  authorized(req: IncomingMessage): boolean {
    try {
      const origin = this.origin(req); this.prune();
      return this.sessions.get(digest(this.token(req)))?.origin === origin;
    } catch { return false; }
  }
  revoke(req: IncomingMessage): string {
    const origin = this.origin(req);
    if (req.headers.origin !== origin) throw new RequestError(403, 'origin_not_allowed', 'Use the monitor from its own page.');
    this.sessions.delete(digest(this.token(req)));
    return `${this.cookieName(req)}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
  }
}
