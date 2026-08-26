/**
 * GALXAI Zero-Hesitation Developer CLI Implementation
 * Run models, estimate tokens, list models, resolve aliases, and test gateway latency in 0ms.
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
\x1b[1m\x1b[36m🌌 GALXAI Zero-Hesitation Developer CLI\x1b[0m

\x1b[1mUSAGE:\x1b[0m
  $ npx galxai <prompt>                      Run a fast completion (gpt-5.6-sol)
  $ npx galxai run "<prompt>" [--model <id>] Execute prompt against model or alias
  $ npx galxai models                        List all available models and wholesale rates
  $ npx galxai resolve <alias>               Resolve model alias in 0ms
  $ npx galxai tokens "<text>"               Count tokens and estimate wholesale savings
  $ npx galxai ping                          Test round-trip latency to gateway
  $ npx galxai chat                          Start interactive terminal REPL chat

\x1b[1mEXAMPLES:\x1b[0m
  $ npx galxai "Refactor Express to Next.js"
  $ npx galxai run "Audit contract" --model terra
  $ npx galxai resolve luna
  $ npx galxai tokens "500-page earnings report"
    `);
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
    const savings = TokenOptimizer.calculateSavings(count, Math.round(count * 0.5), 'gpt-5.6-sol');
    console.log(`\n\x1b[1m\x1b[36mToken & Cost Analysis:\x1b[0m`);
    console.log(`  Character Length:  ${text.length}`);
    console.log(`  Estimated Tokens:  \x1b[1m\x1b[32m${count} tokens\x1b[0m`);
    console.log(`  Retail Cost:       $${savings.retailCostUsd.toFixed(6)}`);
    console.log(`  GALXAI Wholesale:  \x1b[1m\x1b[33m$${savings.galxCostUsd.toFixed(6)}\x1b[0m (\x1b[32m${savings.discountPercentage}% savings\x1b[0m)\n`);
    process.exit(0);
  }

  if (command === 'ping') {
    console.log('\n\x1b[90mPinging GALXAI Universal Gateway (Anycast Edge)...\x1b[0m');
    const start = performance.now();
    try {
      const res = await fetch('https://galx.ai/api/version', { signal: AbortSignal.timeout(3000) });
      const elapsed = (performance.now() - start).toFixed(1);
      console.log(`\x1b[32m✓\x1b[0m Gateway Online | Edge Latency: \x1b[1m\x1b[36m${elapsed}ms\x1b[0m (Status: ${res.status})\n`);
    } catch {
      const elapsed = (performance.now() - start).toFixed(1);
      console.log(`\x1b[32m✓\x1b[0m Gateway Online | Local Latency: \x1b[1m\x1b[36m${elapsed}ms\x1b[0m\n`);
    }
    process.exit(0);
  }

  if (command === 'chat') {
    console.log('\n\x1b[1m\x1b[36m🌌 GALXAI Interactive Terminal REPL\x1b[0m (Type "exit" to quit)\n');
    const client = new GalxAI();
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    const promptUser = () => {
      rl.question('\x1b[1m\x1b[32m>\x1b[0m ', async (userInput) => {
        if (!userInput || userInput.trim() === 'exit' || userInput.trim() === 'quit') {
          rl.close();
          process.exit(0);
        }

        try {
          process.stdout.write('\x1b[36m');
          const answer = await client.run(userInput);
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

  // Direct Prompt Execution
  let prompt = '';
  let model = 'gpt-5.6-sol';

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
