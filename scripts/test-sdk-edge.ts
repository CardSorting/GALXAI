/**
 * GALXAI: SDK & Cloudflare Edge Gateway Integration Smoke Test
 */

import { GalxAI } from '../src/sdk';

async function testSDK() {
  console.log('\n======================================================================');
  console.log('   GALXAI SDK -> CLOUDFLARE EDGE GATEWAY SMOKE TEST');
  console.log('======================================================================\n');

  const galx = new GalxAI({
    apiKey: 'galx_live_test_key_sdk_smoke',
    baseURL: 'https://galxai-edge-gateway.notsosuper688651.workers.dev'
  });

  // 1. Test Model Catalog List via Edge Cache
  console.log('[1/4] Querying Model Catalog from Edge Cache...');
  const models = await galx.models.list();
  console.log(`  ✓ Received ${models.length} models from Edge Gateway:`);
  console.log(`    • Models: ${models.slice(0, 3).map(m => m.id).join(', ')}...`);

  // 2. Test 1536-dim Vector Embeddings
  console.log('\n[2/4] Generating Vector Embeddings at Edge PoP...');
  const embResponse = await galx.embeddings.create({
    model: 'text-embedding-3-small',
    input: 'Zero-Egress Cloudflare Edge Substrate'
  });
  console.log(`  ✓ Generated vector with ${embResponse.data[0].embedding.length} dimensions.`);
  console.log(`  ✓ Sample vector slice: [${embResponse.data[0].embedding.slice(0, 4).join(', ')}...]`);

  // 3. Test Image Generation with R2 URL
  console.log('\n[3/4] Generating Multimodal Asset with R2 CDN link...');
  const img = await galx.generateImage('A futuristic AI data center in orbit');
  console.log(`  ✓ Generated image URL: ${img.url}`);

  // 4. Test 1-Line Execution
  console.log('\n[4/4] Running 1-Line Execution (galx.run)...');
  const answer = await galx.run('Ping edge gateway', { model: 'gpt-5.6-sol' });
  console.log(`  ✓ Edge response: "${answer}"`);

  console.log('\n======================================================================');
  console.log('   ALL SDK -> CLOUDFLARE EDGE SMOKE TESTS COMPLETED SUCCESSFULLY! ✨');
  console.log('======================================================================\n');
}

testSDK().catch(err => {
  console.error('\n[FATAL ERROR]:', err);
  process.exit(1);
});
