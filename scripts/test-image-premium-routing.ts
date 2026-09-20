import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { GalxModelRouter } from '../src/core/router/GalxModelRouter';
import { GalxR2AssetAdapter } from '../src/workers/cloudflare/GalxR2AssetAdapter';
import { GalxEdgeBatchBuffer } from '../src/workers/cloudflare/GalxEdgeBatchBuffer';
import { GalxSeatTierEngine } from '../src/core/subscription/GalxSeatTierEngine';
import { clearRelayDiscoveryCache } from '../src/core/router/adapters/RelayEndpointDiscovery';

test('Premium images bypass legacy admission and persist sanitized owned assets before completion', async () => {
 const names=['GALX_PREMIUM_IMAGES_ENABLED','GALX_ISOLATED_RELAYS_ENABLED','GALX_PREMIUM_RELAY_URL','GALX_PREMIUM_RELAY_KEY'];
 const saved=names.map(k=>process.env[k]);const original=globalThis.fetch;
 const old=[GalxR2AssetAdapter.getInstance,GalxEdgeBatchBuffer.getInstance,GalxSeatTierEngine.getInstance];
 const events:string[]=[];
 const bytes=await sharp({create:{width:4,height:3,channels:3,background:'white'}}).withExif({IFD0:{Software:'private-fixture'}}).png().toBuffer();
 try{
  Object.assign(process.env,{GALX_PREMIUM_IMAGES_ENABLED:'1',GALX_ISOLATED_RELAYS_ENABLED:'0',GALX_PREMIUM_RELAY_URL:'https://premium.invalid',GALX_PREMIUM_RELAY_KEY:'p'.repeat(64)});
  clearRelayDiscoveryCache();
  globalThis.fetch=async(url,init)=>{
   const target=new URL(String(url));
   if(target.pathname==='/health/live') return Response.json({ok:true});
   if(target.pathname==='/v1/images/availability') return Response.json({available:null});
   assert.equal(String(url),'https://premium.invalid/v1/images/generations');assert.equal(init?.method,'POST');events.push('dispatch');return Response.json({data:[{b64_json:bytes.toString('base64')}]});
  };
  GalxR2AssetAdapter.getInstance=()=>({uploadUserSessionImage:async(input:any)=>{
   assert.equal(input.userId,'owner');assert.equal(input.sessionId,'session');assert.equal(input.prompt,'paper boat');assert.equal((await sharp(input.data).metadata()).exif,undefined);events.push('upload');return {assetId:'owned-image',key:'private-key',sizeBytes:input.data.length,sha256:'fixture'};
  },updateSessionManifestBatch:async(owner:string,session:string,images:any[])=>{assert.equal(owner,'owner');assert.equal(session,'session');assert.equal(images.length,1);events.push('manifest');},flushImageLibraryBuffer:async()=>{events.push('durable-flush');}}) as any;
  GalxEdgeBatchBuffer.getInstance=()=>({enqueueTokenDraw:()=>{}}) as any;
  GalxSeatTierEngine.getInstance=()=>({recordSeatTokenDraw:async()=>{},recordSeatUsage:()=>{}}) as any;
  const router=Object.create(GalxModelRouter.prototype);
  router.substrate={ensureFreshFromAuthority:()=>assert.fail('legacy authority must not be used')};
  router.pool={acquireLeaseAuthoritatively:()=>assert.fail('a second lease must not be acquired')};
  router.privacyEngine={resolvePrivacyPolicy:()=>({profile:'standard',dataResidency:'global'})};
  const result=await router.routeImageGeneration({request:{prompt:'paper boat',sessionId:'session',n:1},userId:'owner',requestId:'operation'});
  assert.equal(result.data[0].asset_id,'owned-image');assert.deepEqual(events,['dispatch','upload','manifest','durable-flush']);
 }finally{globalThis.fetch=original;[GalxR2AssetAdapter.getInstance,GalxEdgeBatchBuffer.getInstance,GalxSeatTierEngine.getInstance]=old as any;names.forEach((k,i)=>{if(saved[i]===undefined)delete process.env[k];else process.env[k]=saved[i];});}
});
