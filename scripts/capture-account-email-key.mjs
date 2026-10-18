/** One-use loopback form for a reviewed browser key; never logs request bodies. */
import fs from 'node:fs';
import http from 'node:http';
import { randomBytes,timingSafeEqual } from 'node:crypto';
import { accountEmailEnvironment } from './lib/account-email.mjs';
const file='.data/postgres-cutover/account-email.secret.json',origin='http://127.0.0.1:55113';
const prefix=process.argv[2],domainId=process.argv[3];
if(!/^re_[A-Za-z0-9_-]{6,16}$/.test(prefix||'')||!/^[-a-f0-9]{36}$/.test(domainId||''))throw Error('Provide the reviewed non-secret key prefix and GALX domain ID.');
if(fs.existsSync(file)&&fs.readFileSync(file,'utf8').trim()!=='{}')throw Error('Existing SMTP credentials cannot be replaced by this capture helper.');
const nonce=randomBytes(32).toString('hex'),same=value=>typeof value==='string'&&value.length===nonce.length&&timingSafeEqual(Buffer.from(value),Buffer.from(nonce));
const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'same-origin','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"};
let saved=false;
const server=http.createServer(async(req,res)=>{
  try{
    if(req.headers.host!=='127.0.0.1:55113')throw Error('Invalid local authority.');
    if(req.method==='GET'&&req.url==='/'){
      res.writeHead(200,headers);return res.end('<!doctype html><title>GALX private SMTP setup</title><h1>Private SMTP credential</h1><form method="post" action="/save"><input type="hidden" name="csrf" value="'+nonce+'"><label>SMTP key <input type="password" name="key" autocomplete="off" required></label><button type="submit">Save SMTP key locally</button></form>');
    }
    if(saved||req.method!=='POST'||req.url!=='/save'||req.headers.origin!==origin||req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')throw Error('Invalid local submission.');
    let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>2048)throw Error('Submission exceeds the private bound.');}
    const body=new URLSearchParams(text),key=body.get('key');
    if(body.getAll('csrf').length!==1||body.getAll('key').length!==1||[...body.keys()].some(k=>!['csrf','key'].includes(k))||!same(body.get('csrf'))||!key?.startsWith(prefix))throw Error('Unexpected credential submission.');
    const config={provider:'resend',host:'smtp.resend.com',port:465,user:'resend',password:key,sender:'accounts@galx.ai',senderName:'GALX',domainId};accountEmailEnvironment(config);
    if(fs.existsSync(file)&&fs.readFileSync(file,'utf8').trim()!=='{}')throw Error('The private destination changed.');
    fs.writeFileSync(file,JSON.stringify(config,null,2),{mode:0o600});fs.chmodSync(file,0o600);saved=true;
    res.writeHead(200,headers);res.end('<!doctype html><title>SMTP credential saved</title><h1>SMTP credential saved privately</h1><p>The one-use setup listener is closing.</p>');
    console.log('Reviewed SMTP key saved to the owner-only configuration.');server.close();
  }catch(error){fs.writeFileSync('.data/postgres-cutover/email-capture-error.json',JSON.stringify({observedAt:new Date().toISOString(),reason:String(error.message).slice(0,200),origin:req.headers.origin||null,method:req.method},null,2),{mode:0o600});res.writeHead(400,headers);res.end('<!doctype html><title>Setup not accepted</title><p>Private setup submission was not accepted.</p>');}
});
server.requestTimeout=10000;server.headersTimeout=5000;server.maxHeadersCount=32;
const timeout=setTimeout(()=>{console.error('Private SMTP capture expired without a saved credential.');server.close();process.exitCode=1;},300000);timeout.unref();
server.on('close',()=>clearTimeout(timeout));server.listen(55113,'127.0.0.1',()=>console.log('One-use SMTP setup ready on numeric loopback port 55113.'));
