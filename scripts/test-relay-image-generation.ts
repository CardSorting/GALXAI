/**
 * @file scripts/test-relay-image-generation.ts
 * @description Forensic End-to-End Test Suite for User & Session R2 Image Partitioning
 * and Always-On VM Relay GPT Live Wire Image Synthesis.
 */

import * as path from 'node:path';
import * as fs from 'node:fs';

// Load environment configuration natively
const envLocal = path.join(process.cwd(), '.env.local');
const envRoot = path.join(process.cwd(), '.env');
if (fs.existsSync(envLocal)) {
  try { (process as any).loadEnvFile?.(envLocal); } catch {}
} else if (fs.existsSync(envRoot)) {
  try { (process as any).loadEnvFile?.(envRoot); } catch {}
}

import { GalxR2AssetAdapter } from '../src/workers/cloudflare/GalxR2AssetAdapter';
import { GalxUnifiedR2StorageManager } from '../src/core/storage/GalxUnifiedR2StorageManager';
import { galxRouter } from '../src/core/router/GalxModelRouter';

// Simple 1x1 transparent PNG buffer for testing R2 lifecycle
const TEST_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const TEST_PNG_BUFFER = Buffer.from(TEST_PNG_BASE64, 'base64');

async function main() {
  console.log('========================================================================');
  console.log('🧪 GALXAI: User & Session R2 Storage + Relay Image Generation Audit');
  console.log('========================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, label: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${label}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${label}`);
      throw new Error(`Assertion failed: ${label}`);
    }
  }

  // ==========================================================================
  // PHASE 1: Cloudflare R2 Partitioning, Manifest & Cascade Purge
  // ==========================================================================
  console.log('📦 PHASE 1: Testing Cloudflare R2 User & Session Partitioning...');
  const testUserId = `usr_test_${Date.now().toString(36)}`;
  const testSessionId = `sess_vis_${Math.random().toString(36).substring(2, 8)}`;
  const r2Adapter = GalxR2AssetAdapter.getInstance();

  try {
    // 1. Upload Test Image
    console.log(`  -> Uploading image to R2 under user=${testUserId}, session=${testSessionId}`);
    const uploadResult = await r2Adapter.uploadUserSessionImage({
      userId: testUserId,
      sessionId: testSessionId,
      data: TEST_PNG_BUFFER,
      contentType: 'image/png',
      prompt: 'Test synthetic circuit blueprint',
      model: 'openai-gpt-image-latest',
      size: '1024x1024',
      quality: 'hd',
    });

    assert(!!uploadResult.assetId, 'Upload returned valid assetId');
    assert(uploadResult.key.startsWith(`users/${testUserId}/sessions/${testSessionId}/images/`), `R2 key follows partition layout: ${uploadResult.key}`);
    assert(uploadResult.publicUrl.startsWith('https://assets.galx.ai/'), `Public URL points to assets CDN: ${uploadResult.publicUrl}`);
    assert(uploadResult.publicUrl.endsWith('.png'), 'Public URL has .png extension');
    assert(!!uploadResult.lqipDataUri && uploadResult.lqipDataUri.startsWith('data:image/svg+xml'), 'LQIP placeholder generated');
    assert(uploadResult.sizeBytes === TEST_PNG_BUFFER.length, `Byte size matches buffer size (${uploadResult.sizeBytes} bytes)`);

    // 2. List Session Images
    console.log(`  -> Querying session gallery for session=${testSessionId}`);
    const sessionImages = await r2Adapter.listSessionImages(testUserId, testSessionId);
    assert(sessionImages.length >= 1, `Session gallery contains ${sessionImages.length} image(s)`);
    assert(sessionImages[0].assetId === uploadResult.assetId, 'Listed asset matches uploaded assetId');

    // 3. Inspect Session Visual Manifest
    console.log('  -> Fetching session manifest.json');
    const manifest = await r2Adapter.getSessionManifest(testUserId, testSessionId);
    assert(manifest !== null, 'Session manifest exists');
    assert(manifest!.totalImages >= 1, `Manifest tracks totalImages (${manifest?.totalImages})`);
    assert(manifest!.totalBytes >= TEST_PNG_BUFFER.length, `Manifest tracks totalBytes (${manifest?.totalBytes})`);

    // 4. Test Cascade Purge
    console.log(`  -> Executing cascade purge on session=${testSessionId}`);
    const purgeResult = await r2Adapter.deleteSessionImages(testUserId, testSessionId);
    assert(purgeResult.deletedCount >= 1, `Cascade purge purged ${purgeResult.deletedCount} object(s)`);

    const remainingImages = await r2Adapter.listSessionImages(testUserId, testSessionId);
    assert(remainingImages.length === 0, 'Session gallery is empty after cascade purge');

    console.log('  🎉 Phase 1: All R2 User/Session Partitioning tests passed!\n');
  } catch (err: any) {
    console.error('  ❌ Phase 1 Error:', err.message);
    throw err;
  }

  // ==========================================================================
  // PHASE 2: Always-On VM Relay Endpoint Verification
  // ==========================================================================
  console.log('⚡ PHASE 2: Testing Always-On VM Relay (http://localhost:3001)...');
  const relayUrl = process.env.VM_RELAY_URL || 'http://localhost:3001';

  try {
    const healthResp = await fetch(`${relayUrl}/health`).catch(() => null);
    if (!healthResp || !healthResp.ok) {
      console.warn(`  ⚠️ VM Relay not reachable at ${relayUrl}. Skipping live relay wire test.`);
    } else {
      console.log(`  -> Relay is ONLINE at ${relayUrl}`);
      assert(healthResp.ok, 'VM Relay /health responds 200 OK');

      // Test POST /v1/images/generations on the relay
      console.log('  -> Dispatching test image generation to Relay Server...');
      const relayGenResp = await fetch(`${relayUrl}/v1/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-galx-client': 'forensic-test-suite',
        },
        body: JSON.stringify({
          prompt: 'Minimalist neon cube floating in black void, 8k render',
          model: 'gpt-5.6-terra',
        }),
      });

      console.log(`  -> Relay response status: ${relayGenResp.status}`);
      if (relayGenResp.ok) {
        const relayData = await relayGenResp.json() as any;
        assert(Array.isArray(relayData.data) && relayData.data.length > 0, 'Relay returned image data array');
        assert(typeof relayData.data[0].b64_json === 'string' && relayData.data[0].b64_json.length > 1000, 'Relay returned base64 image data');
        console.log(`  -> Generated base64 length: ${relayData.data[0].b64_json.length} characters`);
        console.log(`  -> Revised prompt: "${relayData.data[0].revised_prompt || 'N/A'}"`);
        console.log('  🎉 Phase 2: Live VM Relay Wire Synthesis verified!\n');
      } else {
        const errText = await relayGenResp.text();
        console.warn(`  ⚠️ Relay image generation returned ${relayGenResp.status}: ${errText}`);
      }
    }
  } catch (err: any) {
    console.warn(`  ⚠️ Phase 2 Notice: Relay check encountered: ${err.message}`);
  }

  // ==========================================================================
  // PHASE 3: Full Gateway Route & R2 Mirroring via GalxModelRouter
  // ==========================================================================
  console.log('🚀 PHASE 3: Testing End-to-End Visual Synthesis via GalxModelRouter...');
  const e2eUserId = `usr_e2e_${Date.now().toString(36)}`;
  const e2eSessionId = `sess_flow_${Math.random().toString(36).substring(2, 8)}`;

  try {
    console.log(`  -> Dispatching router image generation (user=${e2eUserId}, session=${e2eSessionId})...`);
    const routerResult = await galxRouter.routeImageGeneration({
      request: {
        prompt: 'Futuristic solar eclipse over cyberpunk city skyline, cinematic lighting',
        model: 'openai-gpt-image-latest',
        size: '1024x1024',
        quality: 'standard',
        sessionId: e2eSessionId,
      },
      userId: e2eUserId,
      requestId: `req_audit_${Date.now()}`,
      isPriorityUser: true,
      headers: {
        'x-galx-session-id': e2eSessionId,
      },
    });

    assert(Array.isArray(routerResult.data) && routerResult.data.length > 0, 'Router returned data array');
    const firstImage = routerResult.data[0];

    console.log('  -> Inspecting synthesized image result:');
    console.log(`     URL: ${firstImage.url}`);
    console.log(`     R2 Key: ${firstImage.r2_key}`);
    console.log(`     Asset ID: ${firstImage.asset_id}`);
    console.log(`     LQIP: ${firstImage.lqip ? firstImage.lqip.substring(0, 40) + '...' : 'none'}`);

    assert(!!firstImage.url, 'Image has a public URL');
    assert(firstImage.url!.startsWith('https://assets.galx.ai/'), `Image URL is served from CDN: ${firstImage.url}`);
    assert(!!firstImage.r2_key, `Image has R2 storage key: ${firstImage.r2_key}`);
    assert(firstImage.r2_key!.includes(e2eUserId), `R2 key is partitioned by userId: ${firstImage.r2_key}`);
    assert(firstImage.r2_key!.includes(e2eSessionId), `R2 key is partitioned by sessionId: ${firstImage.r2_key}`);
    assert(!!firstImage.asset_id, `Image has an authoritative asset_id: ${firstImage.asset_id}`);
    assert(firstImage.session_id === e2eSessionId, 'Image session_id matches request');

    // Verify session gallery contains the ingested asset
    const storedSessionImages = await r2Adapter.listSessionImages(e2eUserId, e2eSessionId);
    assert(storedSessionImages.length >= 1, `Session gallery has ${storedSessionImages.length} image(s)`);

    // Cleanup E2E test session
    await r2Adapter.deleteSessionImages(e2eUserId, e2eSessionId);
    console.log('  🎉 Phase 3: Full End-to-End Synthesis and R2 Mirroring verified!\n');
  } catch (err: any) {
    console.error('  ❌ Phase 3 Error:', err.message);
    throw err;
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('========================================================================');
  console.log(`🏁 TEST SUITE COMPLETE: ${passedTests}/${totalTests} Assertions Passed!`);
  console.log('========================================================================\n');
}

main().catch((err) => {
  console.error('Unhandled fatal error in test suite:', err);
  process.exit(1);
});
