/**
 * @file scripts/generate-showcase-gallery.ts
 * @description Generates visual showcase images via the live Relay and GalxModelRouter,
 * saving them to the artifact directory and Cloudflare R2.
 */

import * as path from 'node:path';
import * as fs from 'node:fs';

const envLocal = path.join(process.cwd(), '.env.local');
const envRoot = path.join(process.cwd(), '.env');
if (fs.existsSync(envLocal)) {
  try { (process as any).loadEnvFile?.(envLocal); } catch {}
} else if (fs.existsSync(envRoot)) {
  try { (process as any).loadEnvFile?.(envRoot); } catch {}
}

import { GalxR2AssetAdapter } from '../src/workers/cloudflare/GalxR2AssetAdapter';
import { galxRouter } from '../src/core/router/GalxModelRouter';

const ARTIFACT_DIR = '/Users/bozoegg/.gemini/antigravity-ide/brain/dfd0cf32-731b-494c-b1f1-e69ef8f1ac1b';

async function main() {
  console.log('Generating showcase images via live Relay & Router...');

  const relayUrl = process.env.VM_RELAY_URL || 'http://localhost:3001';
  const r2Adapter = GalxR2AssetAdapter.getInstance();

  // 1. Generate Image 1 via Relay
  console.log('\n[1/2] Generating Neon Geometric Cube via Relay Server...');
  const prompt1 = 'Minimalist high-end 8K CGI render: a single perfectly geometric neon cube floating in a pure black void. Thin luminous edges with cyan-blue glow and subtle magenta highlights, dark glossy transparent faces, soft volumetric bloom, faint ambient reflection below, centered composition, dramatic cinematic lighting, ultra-clean, no text, no objects, no background clutter.';
  
  const relayResp = await fetch(`${relayUrl}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-galx-client': 'gallery-showcase-generator',
    },
    body: JSON.stringify({
      prompt: prompt1,
      model: 'gpt-5.6-terra',
      response_format: 'b64_json',
    }),
  });

  if (!relayResp.ok) {
    const err = await relayResp.text();
    throw new Error(`Relay generation failed (${relayResp.status}): ${err}`);
  }

  const relayData = await relayResp.json() as any;
  const b64_1 = relayData.data?.[0]?.b64_json;
  if (!b64_1) throw new Error('No base64 data returned for image 1');

  const buf1 = Buffer.from(b64_1, 'base64');
  const imgPath1 = path.join(ARTIFACT_DIR, 'gpt_image_neon_cube.png');
  fs.writeFileSync(imgPath1, buf1);
  console.log(`Saved Image 1 to ${imgPath1} (${buf1.length} bytes)`);

  // Upload to R2 under showcase session
  const r2Upload1 = await r2Adapter.uploadUserSessionImage({
    userId: 'user_showcase',
    sessionId: 'session_gallery',
    data: buf1,
    contentType: 'image/png',
    prompt: prompt1,
    revisedPrompt: relayData.data[0].revised_prompt,
    model: 'gpt-5.6-terra',
  });
  console.log(`Uploaded Image 1 to R2: ${r2Upload1.publicUrl}`);

  // 2. Generate Image 2 via GalxModelRouter
  console.log('\n[2/2] Generating Cyberpunk Solar Eclipse via GalxModelRouter...');
  const prompt2 = 'Ultra detailed cinematic shot of a glowing solar eclipse hanging over a rainy futuristic cyberpunk metropolis. Towering skyscrapers with holographic neon advertisements, wet asphalt reflecting violet and amber lights, atmospheric fog and volumetric god-rays piercing through clouds, 8k resolution, cinematic composition.';

  const routerResult = await galxRouter.routeImageGeneration({
    request: {
      prompt: prompt2,
      model: 'openai-gpt-image-latest',
      size: '1024x1024',
      quality: 'hd',
      response_format: 'b64_json',
      sessionId: 'session_gallery',
    },
    userId: 'user_showcase',
    requestId: `req_gallery_${Date.now()}`,
    isPriorityUser: true,
  });

  const imgItem2 = routerResult.data?.[0];
  if (!imgItem2) throw new Error('No image returned from GalxModelRouter');

  let buf2: Buffer;
  if (imgItem2.b64_json) {
    buf2 = Buffer.from(imgItem2.b64_json, 'base64');
  } else if (imgItem2.r2_key) {
    const r2Obj = await (r2Adapter as any).r2Manager.getObject('images', imgItem2.r2_key);
    buf2 = r2Obj.data;
  } else {
    throw new Error('Could not retrieve image buffer for image 2');
  }

  const imgPath2 = path.join(ARTIFACT_DIR, 'gpt_image_cyberpunk_city.png');
  fs.writeFileSync(imgPath2, buf2);
  console.log(`Saved Image 2 to ${imgPath2} (${buf2.length} bytes)`);
  console.log(`Image 2 R2 URL: ${imgItem2.r2_url || imgItem2.url}`);

  // Summary JSON
  const summary = {
    images: [
      {
        filename: 'gpt_image_neon_cube.png',
        localPath: imgPath1,
        r2Url: r2Upload1.publicUrl,
        r2Key: r2Upload1.key,
        bytes: buf1.length,
        prompt: prompt1,
        revisedPrompt: relayData.data[0].revised_prompt,
        lqip: r2Upload1.lqipDataUri,
      },
      {
        filename: 'gpt_image_cyberpunk_city.png',
        localPath: imgPath2,
        r2Url: imgItem2.r2_url || imgItem2.url,
        r2Key: imgItem2.r2_key,
        bytes: buf2.length,
        prompt: prompt2,
        revisedPrompt: imgItem2.revised_prompt,
        lqip: imgItem2.lqip,
      },
    ],
  };

  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'gallery_metadata.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log('\n[✓] Showcase gallery generation complete!');
}

main().catch((err) => {
  console.error('Showcase generation error:', err);
  process.exit(1);
});
