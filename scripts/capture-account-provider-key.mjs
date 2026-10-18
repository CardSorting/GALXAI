/** User-operated one-use credential capture after the provider's own secret creation. */
import fs from 'node:fs';
import http from 'node:http';
import { randomBytes,timingSafeEqual } from 'node:crypto';
const state='.data/postgres-cutover',file=state+'/google-client.secret.json',origin='http://127.0.0.1:55114';
const source=JSON.parse(fs.readFileSync(state+'/hosted-central-auth.secret.json','utf8')),clientId=source.external_google_client_id;
if(!clientId?.endsWith('.apps.googleusercontent.com')||fs.existsSync(file))throw Error('Expected existing client and empty private destination required.');
const nonce=randomBytes(32).toString('hex'),same=value=>typeof value==='string'&&value.length===nonce.length&&timingSafeEqual(Buffer.from(value),Buffer.from(nonce));
const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'same-origin','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"};let saved=false;
const server=http.createServer(async(req,res)=>{
 try{
  if(req.headers.host!=='127.0.0.1:55114')throw Error('Invalid local host.');
  if(req.method==='GET'&&req.url==='/'){
   res.writeHead(200,headers);return res.end('<!doctype html><title>GALX private Google credential setup</title><h1>Save the new Google client secret locally</h1><p>For the existing GALX Google OAuth client. This form sends only to numeric loopback on this device.</p><form method="post" action="/save"><input type="hidden" name="csrf" value="'+nonce+'"><label>Google client secret <input type="password" name="key" autocomplete="off" required></label><button type="submit">Save Google secret locally</button></form>');
  }
  if(saved||req.method!=='POST'||req.url!=='/save'||req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')throw Error('Invalid local submission.');
  let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>2048)throw Error('Bound exceeded.');}
  const fields=new URLSearchParams(body),secret=fields.get('key');
  if(fields.getAll('csrf').length!==1||fields.getAll('key').length!==1||[...fields.keys()].some(k=>!['csrf','key'].includes(k))||!same(fields.get('csrf'))||!/^GOCSPX-[A-Za-z0-9_-]{20,100}$/.test(secret||''))throw Error('Credential not accepted.');
  fs.writeFileSync(file,JSON.stringify({provider:'google',clientId,secret,createdAt:new Date().toISOString()},null,2),{mode:0o600,flag:'wx'});saved=true;
  res.writeHead(200,headers);res.end('<!doctype html><title>Google credential saved privately</title><h1>Google credential saved privately</h1><p>The setup listener is closing. No credential was sent to a remote service.</p>');console.log('Google credential saved to the owner-only configuration.');server.close();
 }catch{res.writeHead(400,headers);res.end('<!doctype html><title>Setup not accepted</title><p>Private credential submission was not accepted.</p>');}
});
server.requestTimeout=10000;server.headersTimeout=5000;server.maxHeadersCount=32;
const timeout=setTimeout(()=>{console.error('Private Google capture expired without a saved credential.');server.close();process.exitCode=1;},900000);timeout.unref();server.on('close',()=>clearTimeout(timeout));server.listen(55114,'127.0.0.1',()=>console.log('Private Google credential capture ready on numeric loopback port 55114.'));
