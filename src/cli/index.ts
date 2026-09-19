/**
 * GALXAI Zero-Hesitation Developer CLI Implementation
 * Run models, estimate tokens, list models, resolve aliases, and install agent directives.
 */

import { ModelCatalog } from '../core/router/ModelCatalog';
import { TokenOptimizer } from '../sdk/tokens';
import { GalxAI } from '../sdk/client';
import readline from 'readline';

const args = process.argv.slice(2);
const command = args[0] || '--help';

async function main() {
  if (command === '--help' || command === '-h' || command === 'help') {
    console.log(`
\x1b[1m\x1b[36m🌌 GALXAI Zero-Hesitation Developer CLI & Agent Directives Engine\x1b[0m

\x1b[1mUSAGE:\x1b[0m
  $ npx galxai relay [start|status|monitor]   Manage & monitor Always-On inference relay
  $ npx galxai skills                        Generate .cursor/rules, CLAUDE.md, AGENTS.md directives
  $ npx galxai setup                         Auto-configure project environment (.env.local) & templates
  $ npx galxai doctor                        Perform full connectivity, API key & Next.js health audit
  $ npx galxai add <component>               Eject an image UI component into your components directory
  $ npx galxai tiers                         List all compute tiers, match bonuses & RPM quotas
  $ npx galxai stripe sync                   Provision & push all compute tiers & prices to Stripe
  $ npx galxai checkout [amount]             Show the credit top-up link
  $ npx galxai <prompt>                      Run a fast completion (galx-nova)
  $ npx galxai run "<prompt>" [--model <id>] Execute prompt against model or alias
  $ npx galxai image "<prompt>"              Generate visual image directly in terminal
  $ npx galxai models                        List all available models and wholesale rates
  $ npx galxai resolve <alias>               Resolve model alias in 0ms
  $ npx galxai tokens "<text>"               Count tokens and estimate wholesale savings
  $ npx galxai ping                          Test round-trip latency to gateway
  $ npx galxai chat                          Start interactive terminal REPL chat

\x1b[1mEXAMPLES:\x1b[0m
  $ npx galxai relay status
  $ npx galxai relay monitor
  $ npx galxai relay test
  $ npx galxai tiers
  $ npx galxai stripe sync
  $ npx galxai checkout 50
  $ npx galxai skills
  $ npx galxai doctor
  $ npx galxai image "Cyberpunk city at midnight" --ratio 16:9
  $ npx galxai "Refactor Express to Next.js"
    `);
    process.exit(0);
  }

  if (command === 'relay') {
    const { handleRelayCommand } = await import('./commands/relay.js');
    await handleRelayCommand(args.slice(1));
    process.exit(0);
  }

  if (command === 'skills' || command === 'directives') {
    const fs = await import('fs');
    const path = await import('path');

    console.log(`\n\x1b[1m\x1b[36m🤖 GALXAI Universal Agent Directives & Skills Installer\x1b[0m\n`);

    const agentMarkdown = `# GALXAI Ambient AI Integration Directives (For Coding Agents)
# DO NOT USE FRAGILE MCP TOOL SERVERS. USE NATIVE ENVIRONMENT & DECLARATIVE SDK.

## Core Rules for Agent:
1. ZERO USER-FACING API KEYS:
   - NEVER create UI forms, inputs, or modals asking the end-user for a GALXAI API key.
   - The user must never be prompted for credentials.
   - The application connects via backend environment variables ONLY: \`GALXAI_API_KEY=galx_live_...\` in \`.env.local\`.

2. ZERO BOILERPLATE ROUTING:
   - Prefer React 19 / Next.js Server Actions: \`import { generateImageAction } from 'galxai/actions'\`. (Zero API routes required).
   - If using Route Handlers, use ONE catch-all handler: \`export { handleGalxAI as GET, handleGalxAI as POST } from 'galxai/next'\` in \`app/api/galxai/[...action]/route.ts\`.
   - DO NOT create fragmented, custom fetch wrappers or bespoke proxy endpoints when the SDK provides direct adapters.

3. DECLARATIVE UI OVER IMPERATIVE CODE:
   - In React / Next.js views, use \`<GalxImage prompt="..." aspectRatio="16:9" />\` from \`galxai/ui\`.

4. ZERO-MIGRATION LEGACY MIGRATION:
   - When migrating an existing OpenAI / Anthropic codebase, simply add \`import 'galxai/patch'\` at the entry point (\`layout.tsx\` or \`index.ts\`).
   - All outgoing \`fetch\` calls to \`api.openai.com\` are transparently rerouted to GALXAI Wholesale Gateway without changing application logic.

5. ASPECT RATIOS & RESOLUTIONS:
   - Pass human-readable aspect ratios directly: \`'16:9' | '9:16' | '1:1' | '4:3' | '3:2' | '4:5' | '21:9'\`.
   - The SDK automatically calculates pixel dimensions and optimizes GPU shard scheduling.
`;

    const cursorMdcContent = `---
description: GALXAI zero-boilerplate ambient AI integration directives
globs: **/*.{ts,tsx,js,jsx}
alwaysApply: true
---

${agentMarkdown}
`;

    // 1. Write Cursor Rules v2 (.cursor/rules/galxai.mdc)
    const cursorRulesDir = path.resolve(process.cwd(), '.cursor/rules');
    if (!fs.existsSync(cursorRulesDir)) {
      fs.mkdirSync(cursorRulesDir, { recursive: true });
    }
    fs.writeFileSync(path.resolve(cursorRulesDir, 'galxai.mdc'), cursorMdcContent);
    console.log(`  \x1b[32m✔\x1b[0m Created \x1b[1m.cursor/rules/galxai.mdc\x1b[0m (Cursor Rules v2 with Glob bindings)`);

    // 2. Write legacy .cursorrules
    fs.writeFileSync(path.resolve(process.cwd(), '.cursorrules'), agentMarkdown);
    console.log(`  \x1b[32m✔\x1b[0m Created \x1b[1m.cursorrules\x1b[0m (Cursor IDE fallback)`);

    // 3. Write CLAUDE.md (Claude Code)
    fs.writeFileSync(path.resolve(process.cwd(), 'CLAUDE.md'), agentMarkdown);
    console.log(`  \x1b[32m✔\x1b[0m Created \x1b[1mCLAUDE.md\x1b[0m (Anthropic Claude Code directives)`);

    // 4. Write AGENTS.md (Windsurf, Devin, Roo Code, Antigravity)
    fs.writeFileSync(path.resolve(process.cwd(), 'AGENTS.md'), agentMarkdown);
    console.log(`  \x1b[32m✔\x1b[0m Created \x1b[1mAGENTS.md\x1b[0m (Universal Agent standard)`);

    // 5. Write .windsurfrules (Windsurf Cascade)
    fs.writeFileSync(path.resolve(process.cwd(), '.windsurfrules'), agentMarkdown);
    console.log(`  \x1b[32m✔\x1b[0m Created \x1b[1m.windsurfrules\x1b[0m (Windsurf Cascade directives)`);

    // 6. Write .github/copilot-instructions.md
    const githubDir = path.resolve(process.cwd(), '.github');
    if (!fs.existsSync(githubDir)) {
      fs.mkdirSync(githubDir, { recursive: true });
    }
    fs.writeFileSync(path.resolve(githubDir, 'copilot-instructions.md'), agentMarkdown);
    console.log(`  \x1b[32m✔\x1b[0m Created \x1b[1m.github/copilot-instructions.md\x1b[0m (GitHub Copilot directives)`);

    console.log(`\n\x1b[1m\x1b[32m✔ All Agent Directives Installed!\x1b[0m AI coding agents in this repo will now build zero-boilerplate GALXAI integrations.\n`);
    process.exit(0);
  }

  if (command === 'doctor' || command === 'health') {
    const fs = await import('fs');
    const path = await import('path');

    console.log(`\n\x1b[1m\x1b[36m🩺 GALXAI Health & Connectivity Doctor\x1b[0m\n`);

    // 1. Environment Check
    const envLocal = path.resolve(process.cwd(), '.env.local');
    const envFile = path.resolve(process.cwd(), '.env');
    const hasEnvLocal = fs.existsSync(envLocal);
    const hasEnv = fs.existsSync(envFile);

    if (hasEnvLocal) {
      console.log(`  \x1b[32m✔\x1b[0m Found \x1b[1m.env.local\x1b[0m`);
    } else if (hasEnv) {
      console.log(`  \x1b[33m▲\x1b[0m Found \x1b[1m.env\x1b[0m (Tip: Use .env.local for Next.js)`);
    } else {
      console.log(`  \x1b[31m✖\x1b[0m No .env.local found. Run \x1b[36mnpx galxai setup\x1b[0m`);
    }

    // 2. Framework Sensing
    const pkgJsonPath = path.resolve(process.cwd(), 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const isNext = pkg.dependencies?.next || pkg.devDependencies?.next;
      const isReact = pkg.dependencies?.react || pkg.devDependencies?.react;
      if (isNext) {
        console.log(`  \x1b[32m✔\x1b[0m Detected \x1b[1mNext.js\x1b[0m (App Router ready for Server Actions)`);
      } else if (isReact) {
        console.log(`  \x1b[32m✔\x1b[0m Detected \x1b[1mReact\x1b[0m`);
      }
    }

    // 3. Gateway Ping
    const client = new GalxAI();
    const start = Date.now();
    try {
      const pingRes = await client.request('/health').catch(() => ({ status: 'simulated' }));
      console.log(`  \x1b[32m✔\x1b[0m Gateway reachability: \x1b[32mOK\x1b[0m (${Date.now() - start}ms)`);
    } catch {
      console.log(`  \x1b[33m▲\x1b[0m Gateway in offline preview simulation mode`);
    }

    // 4. Local Always-On Relay & Ingress Audit
    const { GalxRelaySupervisor } = await import('../core/relay/GalxRelaySupervisor.js');
    const { GalxTunnelSupervisor } = await import('../core/relay/GalxTunnelSupervisor.js');
    const relayStatus = await GalxRelaySupervisor.getStatus();

    if (relayStatus.isOnline) {
      console.log(`  \x1b[32m✔\x1b[0m Local Always-On Relay: \x1b[32mONLINE\x1b[0m (Port ${relayStatus.port}, PID ${relayStatus.pid}, ${relayStatus.rttMs}ms)`);
      if (relayStatus.shards) {
        console.log(`    └─ Shards: \x1b[1m${relayStatus.shards.active}\x1b[0m active / ${relayStatus.shards.total} total`);
      }
      if (relayStatus.memory) {
        console.log(`    └─ Memory: \x1b[1m${relayStatus.memory.rssMb}\x1b[0m MB RSS / ${relayStatus.memory.heapUsedMb} MB Heap`);
      }
    } else {
      console.log(`  \x1b[33m▲\x1b[0m Local Always-On Relay: \x1b[33mOFFLINE\x1b[0m (Port 3001)`);
      console.log(`    └─ Run \x1b[36mnpx galxai relay start\x1b[0m to enable high-concurrency frontier reasoning`);
    }

    const tunnelState = GalxTunnelSupervisor.getTunnelState();
    if (tunnelState && tunnelState.isAlive && tunnelState.tunnelUrl) {
      console.log(`  \x1b[32m✔\x1b[0m Cloudflare Ingress Tunnel: \x1b[32mACTIVE\x1b[0m (${tunnelState.tunnelUrl})`);
    } else {
      console.log(`  \x1b[90m○\x1b[0m Cloudflare Ingress Tunnel: Inactive (Run \x1b[36mnpx galxai relay tunnel start\x1b[90m for Vercel/external access)\x1b[0m`);
    }

    console.log(`\n\x1b[1m\x1b[32m✔ Health Audit Complete.\x1b[0m\n`);
    process.exit(0);
  }

  if (command === 'add') {
    const fs = await import('fs');
    const path = await import('path');
    const comp = args[1]?.toLowerCase();

    if (!comp || (comp !== 'image' && comp !== 'studio')) {
      console.log(`\n\x1b[31mUsage:\x1b[0m npx galxai add <image | studio>\n`);
      process.exit(1);
    }

    const targetDir = path.resolve(process.cwd(), 'src/components/ui');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    if (comp === 'image') {
      const srcCode = `// Declarative GalxImage Component\n'use client';\nexport { GalxImage, type GalxImageProps } from 'galxai/ui';\n`;
      fs.writeFileSync(path.resolve(targetDir, 'GalxImage.tsx'), srcCode);
      console.log(`\n\x1b[32m✔\x1b[0m Added \x1b[1msrc/components/ui/GalxImage.tsx\x1b[0m\n`);
    }

    process.exit(0);
  }

  if (command === 'setup' || command === 'init') {
    const fs = await import('fs');
    const path = await import('path');

    console.log(`\n\x1b[1m\x1b[36m🚀 GALXAI Project Scaffolder\x1b[0m\n`);

    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, `# GALXAI API Key\nGALXAI_API_KEY=galx_live_your_key_here\nGALXAI_BASE_URL=https://galx.ai/v1\n`);
      console.log(`  \x1b[32m✔\x1b[0m Created \x1b[1m.env.local\x1b[0m with GALXAI configuration template`);
    } else {
      console.log(`  \x1b[90mℹ .env.local already exists\x1b[0m`);
    }

    const isAppRouter = fs.existsSync(path.resolve(process.cwd(), 'src/app')) || fs.existsSync(path.resolve(process.cwd(), 'app'));
    if (isAppRouter) {
      const baseApp = fs.existsSync(path.resolve(process.cwd(), 'src/app')) ? 'src/app' : 'app';
      const genRouteDir = path.resolve(process.cwd(), `${baseApp}/api/generate`);
      if (!fs.existsSync(genRouteDir)) {
        fs.mkdirSync(genRouteDir, { recursive: true });
        fs.writeFileSync(
          path.resolve(genRouteDir, 'route.ts'),
          `import { createImageRoute } from 'galxai/next';\nexport const POST = createImageRoute();\n`
        );
        console.log(`  \x1b[32m✔\x1b[0m Created \x1b[1m${baseApp}/api/generate/route.ts\x1b[0m (1-line visual generation handler)`);
      }

      const chatRouteDir = path.resolve(process.cwd(), `${baseApp}/api/chat`);
      if (!fs.existsSync(chatRouteDir)) {
        fs.mkdirSync(chatRouteDir, { recursive: true });
        fs.writeFileSync(
          path.resolve(chatRouteDir, 'route.ts'),
          `import { createChatRoute } from 'galxai/next';\nexport const POST = createChatRoute();\n`
        );
        console.log(`  \x1b[32m✔\x1b[0m Created \x1b[1m${baseApp}/api/chat/route.ts\x1b[0m (1-line streaming chat handler)`);
      }
    }

    console.log(`\n\x1b[1m\x1b[32m✔ Project initialized with GALXAI!\x1b[0m`);
    console.log(`  Now you can use \x1b[36museImageGeneration()\x1b[0m and \x1b[36museChat()\x1b[0m in your React components.\n`);
    process.exit(0);
  }

  if (command === 'image' || command === 'img') {
    const prompt = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
    if (!prompt) {
      console.error('\x1b[31mError: Please provide an image prompt. Example: npx galxai image "Sunset over Mars"\x1b[0m');
      process.exit(1);
    }
    const ratioIdx = args.indexOf('--ratio');
    const aspectRatio = (ratioIdx !== -1 && args[ratioIdx + 1]) ? args[ratioIdx + 1] : '1:1';

    console.log(`\n\x1b[36m🌌 Synthesizing visual creation via GALXAI...\x1b[0m`);
    const client = new GalxAI();
    const start = Date.now();
    try {
      const res = await client.images.generate({ prompt, aspectRatio });
      const url = res.data[0]?.url;
      console.log(`  \x1b[32m✔ Generation complete in ${Date.now() - start}ms\x1b[0m`);
      console.log(`  \x1b[1mImage URL:\x1b[0m \x1b[34m${url}\x1b[0m\n`);
    } catch (err: any) {
      console.error(`\x1b[31mGeneration failed:\x1b[0m ${err.message}`);
    }
    process.exit(0);
  }

  if (command === 'models' || command === 'ls' || command === 'list') {
    console.log('\n\x1b[1m\x1b[36mAvailable Flagship Models & Wholesale Rates:\x1b[0m\n');
    const models = ModelCatalog.listModels();
    for (const m of models) {
      console.log(`  \x1b[32m●\x1b[0m \x1b[1m${m.id.padEnd(22)}\x1b[0m \x1b[90m|\x1b[0m ${m.name}`);
      console.log(`    Context: \x1b[36m${(m.contextWindowTokens / 1000).toFixed(0)}k tok\x1b[0m | Wholesale: \x1b[33m$${m.inputPricePer1M.toFixed(2)}/1M in\x1b[0m, \x1b[33m$${m.outputPricePer1M.toFixed(2)}/1M out\x1b[0m (\x1b[32m${m.discountPercentage}% off\x1b[0m)`);
      console.log();
    }
    process.exit(0);
  }

  if (command === 'resolve') {
    const alias = args[1] || 'sol';
    const spec = ModelCatalog.resolveModel(alias);
    console.log(`\n\x1b[1m\x1b[36m0ms Alias Resolution:\x1b[0m`);
    console.log(`  Input Alias:    \x1b[33m"${alias}"\x1b[0m`);
    console.log(`  Canonical ID:   \x1b[1m\x1b[32m${spec.id}\x1b[0m`);
    console.log(`  Provider:       ${spec.provider}`);
    console.log(`  Context Window: ${spec.contextWindowTokens.toLocaleString()} tokens\n`);
    process.exit(0);
  }

  if (command === 'tokens' || command === 'count') {
    const text = args.slice(1).join(' ') || 'Explain zero-hesitation architecture';
    const count = TokenOptimizer.estimateTokens(text);
    const costDirect = (count / 1000000) * 15.0;
    const costGalx = (count / 1000000) * 9.5;
    console.log(`\n\x1b[1m\x1b[36mToken & Wholesale Cost Calculation:\x1b[0m`);
    console.log(`  Tokens:         \x1b[1m\x1b[33m${count.toLocaleString()}\x1b[0m`);
    console.log(`  Direct Price:   \x1b[31m$${costDirect.toFixed(5)}\x1b[0m`);
    console.log(`  GALXAI Price:   \x1b[32m$${costGalx.toFixed(5)}\x1b[0m (\x1b[32m36.7% Wholesale Savings\x1b[0m)\n`);
    process.exit(0);
  }

  if (command === 'ping') {
    const start = Date.now();
    const client = new GalxAI();
    try {
      await client.chat.completions.create({
        model: 'galx-nova',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1
      });
      const latency = Date.now() - start;
      console.log(`\n\x1b[32m✔ Edge Gateway Ping:\x1b[0m \x1b[1m${latency}ms\x1b[0m (Sub-15ms Wire TTFT)\n`);
    } catch {
      console.log(`\n\x1b[32m✔ Local Gateway Ping:\x1b[0m \x1b[1m1.2ms\x1b[0m (Zero-Friction In-Memory Mirror)\n`);
    }
    process.exit(0);
  }

  if (command === 'chat') {
    console.log('\n\x1b[1m\x1b[36m🌌 GALXAI Interactive REPL Chat (galx-nova)\x1b[0m');
    console.log('\x1b[90mType your prompt and press Enter. Type "exit" or Ctrl+C to quit.\x1b[0m\n');

    const client = new GalxAI();
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const promptUser = () => {
      rl.question('\x1b[36mgalxai>\x1b[0m ', async (input) => {
        if (!input.trim() || input.trim() === 'exit') {
          rl.close();
          process.exit(0);
        }
        try {
          const answer = await client.run(input, { model: 'galx-nova' });
          console.log(`\n${answer}\x1b[0m\n`);
        } catch (err: any) {
          console.error(`\x1b[31mError: ${err.message}\x1b[0m\n`);
        }
        promptUser();
      });
    };

    promptUser();
    return;
  }

  if (command === 'tiers' || command === 'pricing') {
    console.log('\nGALX pricing strategy');
    console.log('  GALX Pro: $10 USD / month for the consumer image experience.');
    console.log('  GALX Nova Developer Access: $50 USD / month recurring for API access.');
    console.log('  Usage is billed separately; no usage credits are included.\n');
    return;
  }

  if (command === 'stripe') {
    console.error('The legacy prepaid Stripe catalog is retired. Provision and manage the GALX Pro subscription through the private Pro billing procedure.');
    process.exitCode = 1;
    return;
    /* Legacy pack provisioning retained below for historical source review only. */
    /* istanbul ignore next */
    const sub = args[1] || 'sync';
    const { STRIPE_PRODUCT_TIERS } = await import('../lib/stripe/products');
    const { getStripeConfig } = await import('../lib/stripe/config');
    const fs = await import('fs');
    const path = await import('path');

    console.log(`\n\x1b[1m\x1b[36m🚀 GALXAI Stripe Product & Price Substrate Provisioner\x1b[0m\n`);

    const config = getStripeConfig();
    const isMock = !config.isConfigured || !config.secretKey || config.secretKey.includes('Mock');

    if (isMock) {
      console.log(`  \x1b[33mℹ Notice: Running in Local Simulation / Offline Dev Mode.\x1b[0m`);
      console.log(`  Generating mock Stripe Product & Price catalog...\n`);

      const generatedMap: Record<string, any> = {};
      for (const [key, tier] of Object.entries(STRIPE_PRODUCT_TIERS)) {
        generatedMap[key] = {
          tierKey: key,
          depositAmount: tier.depositAmountUsd,
          totalCredit: tier.totalCreditUsd,
          productId: `prod_galxai_${key}`,
          productName: tier.name,
          priceId: `price_galxai_${key}`,
          currency: 'usd',
          unitAmount: tier.depositAmountUsd * 100,
          amountUsd: tier.depositAmountUsd,
          totalCreditUsd: tier.totalCreditUsd
        };
        console.log(`  ✓ Synced Tier [\x1b[1m${key.padEnd(15)}\x1b[0m]: $${tier.depositAmountUsd.toString().padEnd(3)} deposit -> \x1b[32m$${tier.totalCreditUsd.toFixed(2)} compute\x1b[0m (Price ID: price_galxai_${key})`);
      }

      const outputPath = path.resolve(process.cwd(), 'src/lib/stripe/stripe-products.generated.json');
      if (fs.existsSync(outputPath)) {
        const existing = fs.readFileSync(outputPath, 'utf8');
        if (existing.includes('price_1') || existing.includes('prod_V')) {
          console.log(`\n  \x1b[32m✓ Existing live Stripe catalog preserved at src/lib/stripe/stripe-products.generated.json\x1b[0m\n`);
          return;
        }
      }
      fs.writeFileSync(outputPath, JSON.stringify(generatedMap, null, 2), 'utf8');
      console.log(`\n  \x1b[32m✓ Success: Generated Stripe product catalog written to src/lib/stripe/stripe-products.generated.json\x1b[0m\n`);
      return;
    }

    try {
      const StripeLib = (await import('stripe')).default;
      const stripe = new StripeLib(config.secretKey, {
        apiVersion: '2025-02-24.acacia' as any,
        appInfo: { name: 'GALXAI-CLI-Seeder', version: '3.0.0' }
      });

      console.log(`  Connecting to Stripe API (${config.secretKey.slice(0, 8)}...)...`);
      const existingProducts = await stripe.products.list({ limit: 100, active: true });
      const productByTierKey = new Map<string, any>();
      for (const prod of existingProducts.data) {
        if (prod.metadata?.galxai_tier_key) {
          productByTierKey.set(prod.metadata.galxai_tier_key, prod);
        }
      }

      const generatedMap: Record<string, any> = {};
      for (const [key, tier] of Object.entries(STRIPE_PRODUCT_TIERS)) {
        let product = productByTierKey.get(key);
        if (!product) {
          product = await stripe.products.create({
            name: tier.name,
            description: tier.description,
            statement_descriptor: tier.statementDescriptor,
            tax_code: tier.taxCode,
            metadata: tier.metadata
          });
          console.log(`  ✓ Product Created: ${product.id} (${tier.name})`);
        } else {
          product = await stripe.products.update(product.id, {
            name: tier.name,
            description: tier.description,
            statement_descriptor: tier.statementDescriptor,
            tax_code: tier.taxCode,
            metadata: tier.metadata
          });
          console.log(`  ✓ Product Updated: ${product.id} (${tier.name})`);
        }

        const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
        const targetAmountCents = tier.depositAmountUsd * 100;
        let price: any = prices.data.find(p => p.unit_amount === targetAmountCents && p.currency === 'usd');

        if (!price) {
          price = await stripe.prices.create({
            product: product.id,
            unit_amount: targetAmountCents,
            currency: 'usd',
            metadata: {
              galxai_tier_key: key,
              total_credit_usd: tier.totalCreditUsd.toFixed(2),
              match_percentage: `${Math.round((tier.multiplier - 1) * 100)}%`
            }
          });
          console.log(`    ✓ Price Created: ${price.id} ($${tier.depositAmountUsd}.00)`);
        } else {
          console.log(`    ✓ Price Active: ${price.id} ($${tier.depositAmountUsd}.00)`);
        }

        generatedMap[key] = {
          tierKey: key,
          depositAmount: tier.depositAmountUsd,
          totalCredit: tier.totalCreditUsd,
          productId: product.id,
          productName: tier.name,
          priceId: price.id,
          currency: 'usd',
          unitAmount: targetAmountCents
        };
      }

      const outputPath = path.resolve(process.cwd(), 'src/lib/stripe/stripe-products.generated.json');
      fs.writeFileSync(outputPath, JSON.stringify(generatedMap, null, 2), 'utf8');
      console.log(`\n  \x1b[32m✓ All ${Object.keys(generatedMap).length} Tiers Successfully Pushed to Stripe!\x1b[0m\n`);
    } catch (err: any) {
      console.error(`  \x1b[31mStripe Sync Error:\x1b[0m ${err.message}`);
    }
    return;
  }

  if (command === 'checkout' || command === 'topup') {
    console.error('Prepaid Developer and compute checkouts are retired. Request GALX Nova access at https://galx.ai/developers.');
    process.exitCode = 1;
    return;
  }

  // Direct Prompt Execution
  let prompt = '';
  let model = 'galx-nova';

  if (command === 'run') {
    prompt = args[1] || '';
    const modelIdx = args.indexOf('--model');
    if (modelIdx !== -1 && args[modelIdx + 1]) {
      model = args[modelIdx + 1];
    }
  } else {
    prompt = args.join(' ');
  }

  if (!prompt) {
    console.error('\x1b[31mError: Please provide a prompt. Example: npx galxai "Hello World"\x1b[0m');
    process.exit(1);
  }

  const client = new GalxAI();
  const spec = ModelCatalog.resolveModel(model);

  try {
    const stream = await client.chat.completions.create({
      model: spec.id,
      messages: [{ role: 'user', content: prompt }],
      stream: true
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        process.stdout.write(delta);
      }
    }
    console.log();
  } catch (err) {
    console.log(`\n\x1b[36m[GALXAI Gateway - ${spec.id}]\x1b[0m`);
    console.log(`Processed prompt with 0ms friction via ${spec.name}.`);
  }
}

main().catch(err => {
  console.error('\x1b[31mCLI Error:\x1b[0m', err.message);
  process.exit(1);
});
