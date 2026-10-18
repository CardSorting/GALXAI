import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { accountEmailEnvironment,loadAccountEmailEnvironment } from './lib/account-email.mjs';
const fixture={provider:'resend',host:'smtp.resend.com',port:465,user:'resend',password:'re_'+('fixture'.repeat(6)),sender:'accounts@galx.ai',senderName:'GALX',domainId:'11111111-1111-4111-8111-111111111111'};
test('account mail mapping retains implicit TLS, fixed sender and disabled logging without changing verification',()=>{
  const mapped=accountEmailEnvironment(fixture);assert.equal(mapped.GOTRUE_SMTP_PORT,'465');assert.equal(mapped.GOTRUE_SMTP_PASS,fixture.password);assert.equal(mapped.GOTRUE_SMTP_LOGGING_ENABLED,'false');assert(!('GOTRUE_MAILER_AUTOCONFIRM' in mapped));assert(!('GOTRUE_JWT_SECRET' in mapped));
});
test('arbitrary SMTP destinations, injected configuration and unsafe key values fail without exposing secrets',()=>{
  for(const change of [{host:'attacker.invalid'},{port:25},{sender:'other@galx.ai'},{GOTRUE_MAILER_AUTOCONFIRM:'true'},{password:fixture.password+'\nINJECTED=true'},{provider:'other'}]){
    assert.throws(()=>accountEmailEnvironment({...fixture,...change}),error=>error.message==='Invalid private account-email configuration.'&&!error.message.includes(fixture.password));
  }
});
test('email credentials reject public files and symlinks; absence keeps preparation unconfigured',async()=>{
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'galx-mail-config-'));
  try{
    const file=path.join(folder,'smtp.json');assert.deepEqual(await loadAccountEmailEnvironment(file),{});
    await fs.writeFile(file,JSON.stringify(fixture),{mode:0o644});await assert.rejects(loadAccountEmailEnvironment(file));await fs.chmod(file,0o600);assert.equal((await loadAccountEmailEnvironment(file)).GOTRUE_SMTP_HOST,'smtp.resend.com');
    const link=path.join(folder,'smtp-link.json');await fs.symlink(file,link);await assert.rejects(loadAccountEmailEnvironment(link));
  }finally{await fs.rm(folder,{recursive:true,force:true});}
});
