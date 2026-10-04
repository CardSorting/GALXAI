/** Loopback-only browser ingress fixture, never packaged or deployed. It forwards
 * once to the retained Next container; no route.fulfill or buffered mock stream. */
import { createServer, request } from 'node:http';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

export async function browserFixture() {
  let target = '', script = '';
  const server = createServer((req, res) => {
    if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><title>Offline transport acceptance</title>'); return; }
    if (req.url === '/sdk.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(script); return; }
    if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    if (req.url !== '/v1/inference' || req.method !== 'POST' || !target) { res.writeHead(404); res.end(); return; }
    const upstream = request(target + req.url, { method: 'POST', headers: { ...req.headers, host: 'nova.galx.ai', 'x-forwarded-proto': 'https' } }, incoming => {
      res.writeHead(incoming.statusCode!, incoming.headers); incoming.pipe(res);
    });
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    res.on('close', () => upstream.destroy()); req.pipe(upstream);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  return {
    origin,
    async run(applicationOrigin: string, acceptedSource: string, token: string) {
      target = applicationOrigin;
      script = (await build({ entryPoints: [acceptedSource], bundle: true, write: false, platform: 'browser', format: 'iife', globalName: 'GalxProbe' })).outputFiles[0].text;
      const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'galx-stream-browser-'));
      const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
      let socket: WebSocket | undefined;
      try {
        let debugPort = '';
        for (let i = 0; i < 100; i++) { try { debugPort = (await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await new Promise(r => setTimeout(r, 100)); } }
        if (!debugPort) throw new Error('Isolated browser did not start.');
        const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
        socket = new WebSocket(pages.find((p: any) => p.type === 'page').webSocketDebuggerUrl);
        await new Promise<void>((resolve, reject) => { socket!.onopen = () => resolve(); socket!.onerror = () => reject(new Error('Browser protocol unavailable.')); });
        let id = 0, consoleErrors = 0; const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
        socket.onmessage = event => { const v = JSON.parse(String(event.data)), p = pending.get(v.id); if (v.method === 'Runtime.exceptionThrown' || (v.method === 'Runtime.consoleAPICalled' && v.params?.type === 'error')) consoleErrors++; if (p) { pending.delete(v.id); v.error ? p.reject(new Error('Browser probe failed.')) : p.resolve(v.result); } };
        const command = (method: string, params = {}) => new Promise<any>((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); socket!.send(JSON.stringify({ id: n, method, params })); });
        await command('Runtime.enable'); await command('Page.navigate', { url: origin });
        await new Promise(r => setTimeout(r, 300));
        const result = await command('Runtime.evaluate', { awaitPromise: true, returnByValue: true, timeout: 25000, expression: `(async () => {
          await new Promise((resolve,reject) => { const s=document.createElement('script');s.src='/sdk.js';s.onload=resolve;s.onerror=reject;document.head.append(s); });
          const started=performance.now(), arrivals=[];
          const response=await fetch('/v1/inference',{method:'POST',headers:{Authorization:'Bearer '+${JSON.stringify(token)},'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({messages:[{role:'user',content:'quiet-complete'}],stream:true})});
          const measured=response.body.pipeThrough(new TransformStream({transform(chunk,c){arrivals.push({ms:Math.round(performance.now()-started),bytes:chunk.byteLength,keepalive:new TextDecoder().decode(chunk).includes(': keepalive')});c.enqueue(chunk);}}));
          const buffered=await GalxProbe.bufferInferenceResult(new Response(measured,{status:response.status,headers:response.headers}));
          const body=await buffered.json();
          return {status:buffered.status,arrivals,completedMs:Math.round(performance.now()-started),content:body.choices?.[0]?.message?.content,finish:body.choices?.[0]?.finish_reason,keys:Object.keys(body),credentialExposed:JSON.stringify(body).includes('PRIVATE_')};
        })()` });
        if (result.exceptionDetails || !result.result?.value) throw new Error('Browser inference probe failed.');
        return { ...result.result.value, consoleErrors, clientBundleSha256: createHash('sha256').update(script).digest('hex') };
      } finally {
        socket?.close(); chrome.kill('SIGTERM');
        await Promise.race([once(chrome, 'exit'), new Promise(r => setTimeout(r, 3000))]);
        await fs.rm(profile, { recursive: true, force: true });
      }
    },
    async close() { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); },
  };
}
