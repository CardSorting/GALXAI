/** Raw Host-header checks against a local production build; no customer writes. */
import assert from 'node:assert/strict';
import http from 'node:http';
const base = new URL(process.argv[2] || 'http://127.0.0.1:3424');
assert(base.protocol === 'http:' && ['localhost','127.0.0.1'].includes(base.hostname));
function read(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(new URL(path,base), {method,headers:{Host:'sites-http-fixture.checks.galx.ai',Cookie:'admin=true',Authorization:'Bearer forged'}}, response => {
      const chunks=[]; response.on('data',part=>chunks.push(part));
      response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks).toString()}));
    }); req.on('error',reject); req.setTimeout(10000,()=>req.destroy(new Error('Request timed out'))); req.end();
  });
}
const checks=[];
for (const [path,method] of [['/','GET'],['/','HEAD'],['/','POST'],['/api/sites/workspace','GET'],['/favicon.ico','GET'],['/_next/static/test.js','GET']]) {
  const result=await read(path,method);
  assert.equal(result.status,404);assert.equal(result.body,method==='HEAD'?'':'Site unavailable.');
  for(const header of ['set-cookie','x-middleware-rewrite','x-nextjs-rewrite','x-matched-path'])assert.equal(result.headers[header],undefined);
  if(path==='/' && method!=='POST'){
    assert.match(result.headers['content-security-policy'],/frame-ancestors 'none'; sandbox/);
    assert.equal(result.headers['referrer-policy'],'no-referrer');
  }
  checks.push({path,method,status:result.status,routingHeaders:false,cookies:false});
}
console.log(JSON.stringify({scope:'local production-build HTTP; no paid generation or domain mutation',checks}));
