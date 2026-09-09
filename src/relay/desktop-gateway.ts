import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import WebSocket, { WebSocketServer } from 'ws';
import { MonitorSessions } from './monitor-sessions.js';
import { readJsonBody, RequestError } from './request-policy.js';
import { desktopId, type DesktopManager } from './desktop-manager.js';
import type { RelayFederationLifecycle } from './federation-lifecycle.js';

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws://127.0.0.1:* ws://localhost:*; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" };

/** Privileged desktop sessions are deliberately separate from read-only monitor sessions. */
export class DesktopGateway {
  private readonly sessions = new MonitorSessions(Date.now, 'desktop');
  private readonly wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024, perMessageDeflate: false });
  private readonly clients = new Map<WebSocket, { req: IncomingMessage; id: string; upstream: Duplex }>();
  private readonly pending = new Map<string, number>();
  private stopped = false;
  private readonly timer: NodeJS.Timeout;
  constructor(private readonly manager: DesktopManager | undefined, private readonly admin: (req: IncomingMessage) => unknown,
    private readonly relays: () => ReturnType<RelayFederationLifecycle['workspaceShards']>,
    private readonly traffic: (id: string, paused: boolean, generation: unknown) => void) {
    this.timer = setInterval(() => {
      for (const [ws, c] of this.clients) if (!this.sessions.authorized(c.req)) { ws.close(1008, 'Session expired'); c.upstream.destroy(); }
      void this.manager?.pollCredentialSync().catch(() => {});
    }, 3000); this.timer.unref();
  }
  private json(res: ServerResponse, body: unknown, status = 200, extra: Record<string, string> = {}) { res.writeHead(status, { ...headers, ...extra, 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); }
  private authorized(req: IncomingMessage) {
    this.sessions.origin(req);
    if (!this.sessions.authorized(req)) throw new RequestError(401, 'desktop_session_required', 'Open Relay Desktops from the host launcher to connect.');
  }
  private management() { if (!this.manager || this.stopped) throw new RequestError(503, 'desktops_unavailable', 'Desktop management is unavailable on this controller.'); return this.manager; }
  async route(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
    const name = url.pathname;
    if (name === '/desktops' || name === '/desktops/' || name.startsWith('/desktops/assets/')) {
      if (req.method !== 'GET') throw new RequestError(405, 'method_not_allowed', 'Use GET.');
      const isPage = name === '/desktops' || name === '/desktops/';
      if (!isPage && name !== '/desktops/assets/login.js') this.authorized(req);
      let resource: URL, mime = 'text/javascript; charset=utf-8';
      if (isPage) { resource = new URL(this.sessions.authorized(req) ? './desktops.html' : './desktop-login.html', import.meta.url); mime = 'text/html; charset=utf-8'; }
      else if (name === '/desktops/assets/login.js') resource = new URL('./desktop-login.js', import.meta.url);
      else if (name === '/desktops/assets/app.js') resource = new URL('./desktops.js', import.meta.url);
      else if (name === '/desktops/assets/activity.js') resource = new URL('./desktop-activity.js', import.meta.url);
      else if (name.startsWith('/desktops/assets/novnc/')) {
        const relative = name.slice('/desktops/assets/novnc/'.length);
        if (!/^(core|vendor)\/[a-zA-Z0-9_./-]+\.js$/.test(relative) || relative.split('/').some(p => p === '.' || p === '..')) throw new RequestError(404, 'not_found', 'Resource not found.');
        const root = fileURLToPath(new URL('../', import.meta.resolve('@novnc/novnc')));
        resource = pathToFileURL(path.join(root, relative));
      } else throw new RequestError(404, 'not_found', 'Resource not found.');
      let body: Buffer;
      try { body = await readFile(resource); } catch { throw new RequestError(404, 'not_found', 'Resource not found.'); }
      res.writeHead(200, { ...headers, 'Content-Type': mime }); res.end(body); return true;
    }
    if (!name.startsWith('/api/desktops/')) return false;
    this.sessions.origin(req);
    if (name === '/api/desktops/access' && req.method === 'POST') { this.admin(req); this.json(res, this.sessions.issue(req)); return true; }
    if (name === '/api/desktops/session' && req.method === 'POST') { const body = await readJsonBody(req, 1024, 3000); this.json(res, { connected: true }, 200, { 'Set-Cookie': this.sessions.exchange(req, body.ticket) }); return true; }
    if (name === '/api/desktops/session' && req.method === 'DELETE') {
      this.json(res, { connected: false }, 200, { 'Set-Cookie': this.sessions.revoke(req) });
      for (const [ws, c] of this.clients) if (!this.sessions.authorized(c.req)) { ws.close(1008, 'Disconnected'); c.upstream.destroy(); }
      return true;
    }
    this.authorized(req);
    const manager = this.management();
    if (name === '/api/desktops/state' && req.method === 'GET') { await manager.refresh(); this.json(res, { ...manager.snapshot(), relays: this.relays() }); return true; }
    if (req.method !== 'POST') throw new RequestError(405, 'method_not_allowed', 'Use POST for desktop actions.');
    if (req.headers.origin !== this.sessions.origin(req)) throw new RequestError(403, 'origin_not_allowed', 'Use the desktop page for this action.');
    const body = await readJsonBody(req, /\/clipboard$/.test(name) ? 400000 : 2048, 3000);
    if (name === '/api/desktops/create') {
      if (body.relayId !== undefined && !this.relays().some(r => r.id === body.relayId)) throw new RequestError(400, 'invalid_relay', 'Select an existing relay or create an unlinked desktop.');
      const id = await manager.create({ id: body.id, name: body.name, relayId: body.relayId }); this.json(res, { id }, 201); return true;
    }
    const match = name.match(/^\/api\/desktops\/([a-f0-9-]+)\/(start|stop|delete|launch|clipboard|link|traffic|credential-sync)$/);
    if (!match || !desktopId(match[1])) throw new RequestError(404, 'desktop_not_found', 'Desktop not found.');
    if (match[2] === 'credential-sync') {
      if (Object.keys(body).some(key => !['shardId', 'enabled'].includes(key))) throw new RequestError(400, 'invalid_sync_setting', 'Use the saved terminal sign-in.');
      if (body.enabled !== undefined) manager.configureCredentialSync(match[1], body.shardId, body.enabled);
      else await manager.syncCredential(match[1], body.shardId);
      this.json(res, { checked: body.enabled === undefined }); return true;
    }
    if (match[2] === 'link') {
      if (body.shardId !== null && !this.relays().some(r => r.id === body.shardId)) throw new RequestError(400, 'invalid_shard', 'Select a registered shard.');
      manager.link(match[1], body.shardId, body.expectedShardId); this.json(res, { ok: true }); return true;
    }
    if (match[2] === 'traffic') {
      const shardId = manager.linkedShard(match[1]);
      if (!shardId || body.shardId !== shardId) throw new RequestError(409, 'desktop_link_changed', 'The linked shard changed. Refresh and review the workspace.');
      if (typeof body.paused !== 'boolean') throw new RequestError(400, 'invalid_traffic_action', 'Choose pause or resume.');
      this.traffic(shardId, body.paused, body.generation); this.json(res, { ok: true }); return true;
    }
    if (match[2] === 'clipboard') {
      if (body.text !== undefined && (typeof body.text !== 'string' || body.text.length > 65536)) throw new RequestError(400, 'invalid_clipboard', 'Clipboard text is limited to 65,536 characters.');
      const text = await manager.clipboard(match[1], body.text); this.json(res, body.text === undefined ? { text } : { ok: true }); return true;
    }
    if (match[2] === 'launch') {
      if (!['terminal', 'chrome'].includes(body.app)) throw new RequestError(400, 'invalid_app', 'Choose Terminal or Chrome.');
      await manager.launch(match[1], body.app);
    } else await manager.action(match[1], match[2] as 'start' | 'stop' | 'delete', body.confirmation);
    this.json(res, { ok: true }); return true;
  }
  async upgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    let id = '', reserved = false, upstream: Duplex | undefined;
    const reject = () => { if (!socket.destroyed) socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'); };
    try {
      if (this.stopped) throw new Error('Stopped');
      this.authorized(req);
      if (req.headers.origin !== this.sessions.origin(req)) throw new Error('Cross-origin');
      const url = new URL(req.url ?? '/', 'http://local');
      const match = url.pathname.match(/^\/api\/desktops\/([a-f0-9-]+)\/display$/);
      if (!match || !desktopId(match[1]) || url.search) throw new Error('Invalid endpoint'); id = match[1];
      const active = [...this.clients.values()].filter(c => c.id === id).length;
      if (active + (this.pending.get(id) ?? 0) >= 2 || this.clients.size + [...this.pending.values()].reduce((a, b) => a + b, 0) >= 12) throw new Error('Connection limit');
      this.pending.set(id, (this.pending.get(id) ?? 0) + 1); reserved = true;
      const manager = this.management(), target = await manager.connection(id);
      upstream = await manager.display(id, target.containerId); upstream.pause();
      const tcp = upstream;
      const current = await manager.connection(id);
      if (socket.destroyed || tcp.destroyed || this.stopped || !this.sessions.authorized(req) || current.containerId !== target.containerId) throw new Error('Stale connection');
      this.wss.handleUpgrade(req, socket, head, ws => {
        this.clients.set(ws, { req, id, upstream: tcp });
        const close = () => { this.clients.delete(ws); tcp.destroy(); if (ws.readyState === WebSocket.OPEN) ws.close(); };
        ws.on('error', close); ws.on('close', close); tcp.on('error', close); tcp.on('close', close);
        // One socket chunk in flight at a time bounds the desktop's outgoing frame buffer.
        tcp.on('data', chunk => { tcp.pause(); if (ws.readyState !== WebSocket.OPEN) return close(); ws.send(chunk, { binary: true }, error => { if (error) close(); else tcp.resume(); }); });
        ws.on('message', (data: Buffer, binary: boolean) => {
          if (!binary || !this.sessions.authorized(req)) return close();
          if (!tcp.write(data as Buffer)) { ws.pause(); tcp.once('drain', () => ws.resume()); }
        });
        tcp.resume();
      });
    } catch { upstream?.destroy(); reject(); }
    finally { if (reserved) { const count = (this.pending.get(id) ?? 1) - 1; if (count) this.pending.set(id, count); else this.pending.delete(id); } }
  }
  close() { this.stopped = true; clearInterval(this.timer); for (const [ws, c] of this.clients) { ws.close(1001, 'Controller restarting'); c.upstream.destroy(); } this.clients.clear(); this.wss.close(); return this.manager?.settle() ?? Promise.resolve(); }
}
