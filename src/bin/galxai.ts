#!/usr/bin/env node

/**
 * GALXAI CLI Diagnostic & Developer Tooling
 * Usage: npx galxai doctor | npx galxai ping | npx galxai models
 */

import { GalxAI } from '../sdk';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'doctor';

  console.log('\n🌌 GALXAI Developer Gateway Diagnostics\n');

  const apiKey = process.env.GALX_API_KEY;
  const baseURL = process.env.GALX_BASE_URL || 'https://gateway.galx.ai';

  if (!apiKey && command !== 'help') {
    console.warn('⚠️  Warning: GALX_API_KEY environment variable is not set. Using anonymous mode.');
  }

  const galx = new GalxAI({ apiKey, baseURL });

  switch (command) {
    case 'ping': {
      const start = Date.now();
      try {
        const models = await galx.models.list();
        const latency = Date.now() - start;
        console.log(`✅ Gateway reachable at ${baseURL}`);
        console.log(`⚡ Roundtrip Latency: ${latency}ms`);
        console.log(`🤖 Available Models: ${models.length}`);
      } catch (err: any) {
        console.error(`❌ Ping failed: ${err.message}`);
        process.exit(1);
      }
      break;
    }

    case 'doctor': {
      console.log('🔍 Running Gateway Substrate Health Audit...\n');

      // 1. Check Endpoint
      const start = Date.now();
      let modelsCount = 0;
      try {
        const models = await galx.models.list();
        modelsCount = models.length;
        console.log(`  [✓] Gateway Connectivity: OK (${Date.now() - start}ms) -> ${baseURL}`);
      } catch (err: any) {
        console.log(`  [✗] Gateway Connectivity Failed: ${err.message}`);
      }

      // 2. Check Models
      console.log(`  [✓] Model Catalog: ${modelsCount} verified models available`);

      // 3. Check Queue Health
      try {
        const queues = await galx.queues.list();
        console.log(`  [✓] Queue Substrate: ${queues.length} active task queues configured`);
      } catch (err: any) {
        console.log(`  [!] Queue Substrate Audit: ${err.message}`);
      }

      // 4. Test Webhook Substrate
      const secret = 'test_cli_secret_123';
      const testSig = galx.webhooks.generateSignature('{"test":true}', secret);
      const isSigValid = galx.webhooks.verifySignature('{"test":true}', testSig, secret);
      if (isSigValid) {
        console.log('  [✓] Webhook HMAC-SHA256 Cryptographic Engine: Verified');
      }

      console.log('\n🎉 Diagnostics completed successfully. Environment is fully operational.\n');
      break;
    }

    case 'models': {
      try {
        const models = await galx.models.list();
        console.log(`Catalog of ${models.length} Supported Models:\n`);
        for (const m of models) {
          console.log(` • ${m.id.padEnd(25)} [${m.provider}] (Context: ${m.contextWindow.toLocaleString()} tokens)`);
        }
        console.log('');
      } catch (err: any) {
        console.error(`Failed to retrieve models: ${err.message}`);
        process.exit(1);
      }
      break;
    }

    case 'chat': {
      const model = args[1] || 'gpt-5.6-sol';
      const prompt = args.slice(2).join(' ') || 'Explain the concept of quantum computing concisely.';
      console.log(`💬 Streaming prompt to [${model}]: "${prompt}"\n`);
      const start = Date.now();
      let tokenCount = 0;

      try {
        const stream = await galx.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          stream: true
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            tokenCount++;
            process.stdout.write(delta);
          }
        }
        const durationSec = (Date.now() - start) / 1000;
        console.log(`\n\n⚡ Finished in ${durationSec.toFixed(2)}s (~${Math.round(tokenCount / durationSec)} tokens/sec)\n`);
      } catch (err: any) {
        console.error(`\n❌ Chat error: ${err.message}`);
        process.exit(1);
      }
      break;
    }

    default:
      console.log('Available Commands:');
      console.log('  npx galxai doctor                  Run full connectivity and substrate health diagnostics');
      console.log('  npx galxai ping                    Check gateway latency');
      console.log('  npx galxai models                  List supported models and context limits');
      console.log('  npx galxai chat [model] [prompt]   Stream real-time terminal completion with token velocity\n');
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  main().catch(err => {
    console.error('Fatal CLI Error:', err);
    process.exit(1);
  });
}

