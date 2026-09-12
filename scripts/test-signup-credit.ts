import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAccount, signupErrorMessage } from '../src/lib/auth/signup';
import { safeAuthRedirect } from '../src/lib/auth/redirects';
import { createSignupOfferHandler } from '../src/lib/billing/signup-offer-route';
import { parseSignupCreditOffer } from '../src/lib/billing/signup-offer';
const credentials = {email:' test@example.test ',password:'long-password',name:'Tester',next:'/images?draft=1'};
const sentinel = 'private-upstream-diagnostic';

test('signup preserves real confirmation-pending and authenticated responses',async()=>{
  for (const session of [null,{access_token:'real-provider-session'}]) {
    const auth = {signUp:async(input: any)=>{
      assert.equal(input.email,'test@example.test');
      assert.equal(new URL(input.options.emailRedirectTo).searchParams.get('next'),credentials.next);
      assert.deepEqual(Object.keys(input.options.data).sort(),['full_name','name']);
      return {data:{user:{id:'verified-provider-id'},session},error:null};
    }};
    const result = await registerAccount(auth as any,credentials,'https://galx.ai');
    assert.equal(result.error,null); assert.equal(result.data?.session,session);
    assert.equal(result.data?.user?.id,'verified-provider-id');
  }
});
test('signup errors and exceptions never become fabricated users or leaked diagnostics',async()=>{
  for (const auth of [
    {signUp:async()=>({error:{message:sentinel},data:{user:null,session:null}})},
    {signUp:async()=>{throw new Error(sentinel);}},
    {signUp:async()=>({error:null,data:{user:null,session:null}})},
  ]) {
    const result = await registerAccount(auth as any,credentials,'https://galx.ai');
    assert(result.error); assert.equal(result.data,null); assert(!result.error.message.includes(sentinel));
  }
  assert.match(signupErrorMessage({code:'over_email_send_rate_limit',message:sentinel}),/Wait a minute/);
});
test('auth destinations reject external, encoded, backslash, control-character and malformed redirects',()=>{
  for (const value of ['https://evil.test','//evil.test','/\\evil.test','/%5cevil.test','/%2fevil.test','/%252fevil.test','/%25252fevil.test','/%25255cevil.test','/\nevil.test','/%0aevil.test','javascript:alert(1)','/%ZZ']) {
    assert.equal(safeAuthRedirect(value),'/images',value);
  }
  assert.equal(safeAuthRedirect('/images?draft=1'),'/images?draft=1');
});
test('public offer responses allowlist fields and sanitize all failures',async()=>{
  const response = await createSignupOfferHandler(async()=>({enabled:true,amountUsd:5,identity_hash:sentinel,policy:sentinel} as any))();
  assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(await response.json(),{enabled:true,amountUsd:5});
  const error = await createSignupOfferHandler(async()=>{throw new Error(sentinel);})();
  assert.equal(error.status,503); assert(!(await error.text()).includes(sentinel));
  for (const amountUsd of ['5',-5,0,Infinity,NaN,1001,1.001]) assert.equal(parseSignupCreditOffer({enabled:true,amountUsd}),null);
  assert.deepEqual(parseSignupCreditOffer({enabled:false,amountUsd:null,private:sentinel}),{enabled:false,amountUsd:null});
});
