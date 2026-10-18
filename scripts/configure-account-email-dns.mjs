/** Add only Resend's reviewed sender records; never replace existing DNS. */
import fs from 'node:fs/promises';
import { parseEnv } from 'node:util';
import assert from 'node:assert/strict';
const state='.data/postgres-cutover';
const save=async value=>{const file=state+'/account-email-dns.json';await fs.writeFile(file,JSON.stringify(value,null,2),{mode:0o600});await fs.chmod(file,0o600);};
try {
  assert(['inspect','apply'].includes(process.argv[2]));
  const env=parseEnv(await fs.readFile('.env.local','utf8'));
  const input=JSON.parse(await fs.readFile(state+'/account-email-dns-input.json','utf8'));
  assert.equal(input.domain,'galx.ai');assert.equal(input.provider,'Resend');assert.equal(input.records.length,3);
  for(const record of input.records){
    if(record.name==='resend._domainkey.galx.ai')assert(record.type==='TXT'&&/^p=[A-Za-z0-9+/=]{100,800}$/.test(record.content));
    else assert(record.type==='CNAME'&&[['send.galx.ai','send.forge.rmta.net'],['rsend.galx.ai','rsend.forge.rmta.net']].some(([name,value])=>record.name===name&&record.content===value));
  }
  assert.equal(new Set(input.records.map(r=>r.name)).size,3);
  const api=async(endpoint,method='GET',body)=>{
    const response=await fetch('https://api.cloudflare.com/client/v4'+endpoint,{method,headers:{Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
    const value=await response.json();if(!response.ok||!value.success)throw Error('DNS API rejected the operation; inspect its recorded phase before retrying.');return value.result;
  };
  const zones=await api('/zones?name=galx.ai');assert.equal(zones.length,1);const zone=zones[0].id;
  const receipt={observedAt:new Date().toISOString(),mode:process.argv[2],domain:'galx.ai',records:[],mailRoutingChanged:false};
  // Inspect every destination before any mutation.
  const existing=[];
  for(const record of input.records){
    const found=await api('/zones/'+zone+'/dns_records?name='+encodeURIComponent(record.name));
    assert(found.length<=1,'Conflicting records require explicit review.');
    if(found.length)assert(found[0].type===record.type&&found[0].content===record.content&&found[0].proxied!==true,'Existing sender record differs; no replacement is permitted.');
    existing.push(found[0]);
  }
  for(let i=0;i<input.records.length;i++){
    const record=input.records[i];
    if(existing[i])receipt.records.push({name:record.name,id:existing[i].id,state:'matching-existing'});
    else if(process.argv[2]==='inspect')receipt.records.push({name:record.name,state:'absent'});
    else{
      receipt.pendingRecord=record.name;await save(receipt);
      const created=await api('/zones/'+zone+'/dns_records','POST',{...record,ttl:1,proxied:false,comment:'GALX account email: Resend sender verification'});
      receipt.records.push({name:record.name,id:created.id,state:'created'});delete receipt.pendingRecord;await save(receipt);
    }
  }
  await save(receipt);console.log(JSON.stringify({domain:'galx.ai',records:receipt.records.map(({name,state})=>({name,state})),mailRoutingChanged:false}));
} catch(error){await fs.writeFile(state+'/email-dns-error.secret.log',String(error.message),{mode:0o600});console.error('Sender DNS setup stopped; inspect the private error and pending-record receipt before retrying.');process.exitCode=1;}
