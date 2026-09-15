import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDesktopEnrollment } from '../src/relay/desktop-enrollment.js';
import { parseDesktopCredential } from '../src/relay/desktop-credentials.js';
const now=Date.now(), account='fixture-account', desktop='00000000-0000-4000-8000-000000000001';
const token='header.'+Buffer.from(JSON.stringify({iat:Math.floor(now/1000)-10,exp:Math.floor(now/1000)+3600,'https://api.openai.com/auth':{chatgpt_account_id:account}})).toString('base64url')+'.private';
const candidate=parseDesktopCredential([{source:'codex',modifiedAt:now,data:{tokens:{account_id:account,access_token:token}}}],now);
const encrypted={encrypted_ciphertext:'cipher',encrypted_iv:'iv',encrypted_tag:'tag',key_version:'v1'};
test('desktop enrollment validates before creating and writes only its explicit credential DTO',async()=>{
  const calls:string[]=[];
  const enroll=createDesktopEnrollment({read:async()=>[],identitySecret:()=> 'test-key',validate:async()=>{calls.push('validate');},
    encrypt:(_row,payload)=>{assert.equal(payload.accessToken,token);return encrypted;},
    write:async(id,row,expected)=>{calls.push('write');assert.equal(id,desktop);assert.equal(expected,undefined);assert.deepEqual(Object.keys(row).sort(),['id','user_id','credential_expires_at_ms',...Object.keys(encrypted)].sort());return String(row.id);}});
  const id=await enroll(desktop,candidate,null,async()=>true);assert.match(id,/^codex_sh_[a-f0-9]{24}$/);assert.deepEqual(calls,['validate','write']);
});
test('revoked, foreign desktop, ambiguous and mismatched accounts cannot enroll',async()=>{
  const base={id:'existing',user_id:'owner',provider:'openai',status:'healthy',permission_retracted:false};
  for(const [rows,expected] of [[[ {...base,permission_retracted:true}],null],[[{...base,managed_desktop_id:'other'}],null],[[base,{...base,id:'duplicate'}],null],[[base],'wrong-link']] as const){
    const enroll=createDesktopEnrollment({read:async()=>[...rows],identitySecret:()=> 'test-key',decrypt:()=>({accountId:account}),
      validate:async()=>assert.fail('No upstream request for denied enrollment'),write:async()=>assert.fail('No write')});
    await assert.rejects(enroll(desktop,candidate,expected,async()=>true));
  }
});
test('failed validation or changed saved file never writes enrollment',async()=>{
  for(const fail of [true,false]){
    const enroll=createDesktopEnrollment({read:async()=>[],identitySecret:()=> 'test-key',validate:async()=>{if(fail)throw Error('PRIVATE_UPSTREAM');},write:async()=>assert.fail('No write')});
    await assert.rejects(enroll(desktop,candidate,null,async()=>false),e=>!String(e).includes('PRIVATE_UPSTREAM'));
  }
});
test('confirmation preserves the existing identity and fences its encrypted authority',async()=>{
  const row={id:'codex_sh_'+'a'.repeat(24),user_id:'existing-owner',provider:'openai',status:'healthy',...encrypted};
  const enroll=createDesktopEnrollment({read:async()=>[row],identitySecret:()=> 'test-key',decrypt:()=>({accountId:account}),validate:async()=>{},encrypt:()=>encrypted,
    write:async(_desktop,next,expected)=>{assert.equal(next.user_id,row.user_id);assert.equal(expected,row);return String(next.id);}});
  assert.equal(await enroll(desktop,candidate,row.id,async()=>true),row.id);
});
