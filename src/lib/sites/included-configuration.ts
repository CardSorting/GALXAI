import { getPostgresPool } from '../db/postgres';
import { StripeEngine } from '../stripe/stripe';
import { requireSitesRelayPreflight } from '../billing/sites-relay-preflight';
import { FairUsageError } from './fair-policy';
import { SitesFairStore } from './fair-store';
import { requirePaidSitesAccess } from './paid-access';
import { createIncludedGenerator } from './included-generation';
import { generationMembership } from '../billing/generation-access';

export function includedSitesConfiguration(){
  const pool=getPostgresPool();
  if(!pool||pool.waitingCount>=25)throw new FairUsageError(503,'authority');
  const store=new SitesFairStore(pool);
  const relay={url:process.env.VM_RELAY_URL||process.env.GALXAI_RELAY_URL||process.env.RELAY_URL||'',key:process.env.VM_RELAY_API_KEY||process.env.RELAY_API_KEYS?.split(',')[0]?.trim()||''};
  const model='gpt-5.6-luna';
  const membership=async(owner:string,allowFree=false)=>{
    const policy=await store.policy();
    if (allowFree) {
      const {plan,access}=await generationMembership(owner,pool,policy);
      if(policy.mode!=='enforce')throw new FairUsageError(503,'rollout');
      return {policy,plan,access};
    }
    const access=await requirePaidSitesAccess(pool,StripeEngine.getInstance().getClient(),owner,policy);
    if(policy.mode!=='enforce')throw new FairUsageError(503,'rollout');
    return {policy,access,plan:'pro' as const};
  };
  return {store,relay,model,membership,prepare:async(owner:string,allowFree=false)=>{
    const {policy,access,plan}=await membership(owner,allowFree);
    if(process.env.GALX_SITES_CONTENT_ENABLED!=='1'||!relay.url||!relay.key||!process.env.GALX_SITES_RELAY_ADMIN_KEY)throw new FairUsageError(503,'rollout');
    return Object.assign(createIncludedGenerator({store,policy,access,relay,refresh:signal=>requireSitesRelayPreflight({...relay,adminKey:process.env.GALX_SITES_RELAY_ADMIN_KEY,model,maxOutputTokens:2048,profile:'sites-local-v1',signal})}),{free:plan==='free'});
  }};
}
