/** Loopback-only compatibility transport. Never publishes a database listener. */
import fs from 'node:fs';
import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
const file = process.argv[2];
if (!file) throw Error('Provide an owner-only gateway configuration.');
const stat = fs.lstatSync(file);
if (!stat.isFile() || stat.isSymbolicLink() || stat.mode & 0o077) throw Error('Private gateway configuration required.');
const config = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const origin of [config.authOrigin, config.restOrigin]) {
  const url = new URL(origin);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw Error('Fixed private origins required.');
}
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const fail = (response, status) => { response.writeHead(status, { 'Content-Type':'application/json','Cache-Control':'no-store' }); response.end(JSON.stringify({ error:'Account service unavailable.' })); };
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    const auth = url.pathname.startsWith('/auth/v1/'), rest = url.pathname.startsWith('/rest/v1/');
    if (!auth && !rest) return fail(response,404);
    const key = request.headers.apikey;
    const privileged = same(key, config.serviceToken);
    if (!privileged && !same(key,config.publishableKey) && !same(key,config.anonToken)) return fail(response,401);
    let body;
    if (!['GET','HEAD'].includes(request.method)) {
      const parts=[];let bytes=0;
      for await(const part of request){bytes+=part.length;if(bytes>262144)return fail(response,413);parts.push(part);}
      body=Buffer.concat(parts);
    }
    const target = new URL(url.pathname.slice(auth ? '/auth/v1'.length : '/rest/v1'.length) + url.search, auth ? config.authOrigin : config.restOrigin);
    const headers = new Headers({ 'Content-Type':request.headers['content-type']||'application/json',apikey:privileged?config.serviceToken:config.anonToken });
    const bearer=request.headers.authorization;
    headers.set('Authorization',typeof bearer==='string'&&/^Bearer [A-Za-z0-9_.-]+$/.test(bearer)&&!same(bearer,'Bearer '+config.publishableKey)?bearer:'Bearer '+(privileged?config.serviceToken:config.anonToken));
    for(const name of ['prefer','range','range-unit','accept','accept-profile','content-profile','if-match','if-none-match']) if(typeof request.headers[name]==='string')headers.set(name,request.headers[name]);
    const upstream=await fetch(target,{method:request.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(15000)});
    const outgoing={ 'Cache-Control':'no-store' };
    for(const name of ['content-type','content-range','range-unit','location','retry-after']){const value=upstream.headers.get(name);if(value)outgoing[name]=value;}
    const cookies=upstream.headers.getSetCookie();if(cookies.length)outgoing['set-cookie']=cookies;
    response.writeHead(upstream.status,outgoing);
    if(upstream.body)for await(const part of upstream.body)response.write(part);
    response.end();
  } catch { if(!response.headersSent)fail(response,503);else response.destroy(); }
});
server.requestTimeout=20000;server.headersTimeout=10000;server.maxHeadersCount=64;
server.listen(55110,'127.0.0.1',()=>console.log('Private account transport ready.'));
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>server.close(()=>process.exit(0)));
