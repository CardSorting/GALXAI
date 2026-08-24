import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// ANSI Terminal Colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

const REQUIRED_VARS = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'GALX_VAULT_MASTER_SECRET',
  'GALX_VAULT_KEY',
  'GALX_VAULT_ACTIVE_KEY_VERSION',
  'NEXT_PUBLIC_GALX_EDGE_URL',
  'PUBLIC_ASSETS_URL',
];

const OPTIONAL_VARS = [
  'SUPABASE_POOL_SIZE',
  'SUPABASE_TIMEOUT_MS',
  'OPENAI_API_KEY',
  'XAI_API_KEY',
  'GALX_API_KEY',
];

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

async function syncVercelEnv() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isPrintCli = args.includes('--print-cli');
  const targetEnv = args.find((a) => a.startsWith('--target='))?.split('=')[1] || 'production';

  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}     GALXAI: VERCEL ENVIRONMENT VARIABLE SYNCHRONIZER                 ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`  Target Environment: ${BOLD}${targetEnv}${RESET}`);
  console.log(`  Mode: ${BOLD}${isDryRun ? 'DRY-RUN (No changes applied)' : isPrintCli ? 'PRINT CLI COMMANDS' : 'DIRECT SYNC'}${RESET}\n`);

  const envLocalPath = path.join(process.cwd(), '.env.local');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  const localEnv = parseEnvFile(envLocalPath);
  const exampleEnv = parseEnvFile(envExamplePath);

  const mergedEnv: Record<string, string | undefined> = {
    ...exampleEnv,
    ...localEnv,
    ...process.env,
  };

  const syncList: { key: string; value: string; isSecret: boolean; isOptional?: boolean }[] = [];

  for (const key of REQUIRED_VARS) {
    const val = mergedEnv[key];
    if (!val) {
      console.log(`  ${RED}✗ Missing required variable:${RESET} ${key}`);
      continue;
    }
    const isSecret = !key.startsWith('NEXT_PUBLIC_') && !key.startsWith('PUBLIC_');
    syncList.push({ key, value: val, isSecret });
  }

  for (const key of OPTIONAL_VARS) {
    const val = mergedEnv[key];
    if (val && val.trim() !== '') {
      const isSecret = !key.startsWith('NEXT_PUBLIC_') && !key.startsWith('PUBLIC_');
      syncList.push({ key, value: val, isSecret, isOptional: true });
    }
  }

  console.log(`  ${GREEN}✓${RESET} Identified ${BOLD}${syncList.length}${RESET} critical & runtime environment variables (${REQUIRED_VARS.length} required, ${syncList.length - REQUIRED_VARS.length} optional).\n`);

  if (isPrintCli || isDryRun) {
    console.log(`${BOLD}Generated Vercel CLI Sync Commands:${RESET}`);
    console.log(`${DIM}----------------------------------------------------------------------${RESET}`);
    for (const item of syncList) {
      const maskedVal = item.isSecret ? `${item.value.slice(0, 4)}...${item.value.slice(-4)}` : item.value;
      console.log(`vercel env add ${item.key} ${targetEnv}  ${DIM}# ${maskedVal}${RESET}`);
    }
    console.log(`${DIM}----------------------------------------------------------------------${RESET}\n`);

    if (isDryRun) {
      console.log(`${GREEN}Dry-run completed successfully! Use without --dry-run to apply directly.${RESET}\n`);
      return;
    }
  }

  // Attempt direct sync via vercel CLI if available
  const isPush = args.includes('--push') || (!isDryRun && !isPrintCli);
  try {
    execSync('vercel --version', { stdio: 'ignore' });
    console.log(`  ${GREEN}✓${RESET} Vercel CLI detected on system path.`);

    if (isPush) {
      console.log(`\n${BOLD}Synchronizing environment variables to Vercel (${targetEnv})...${RESET}`);
      let pushed = 0;
      let failed = 0;

      for (const item of syncList) {
        try {
          // Remove existing key in target env first to allow clean overwrite
          try {
            execSync(`vercel env rm ${item.key} ${targetEnv} -y`, { stdio: 'ignore' });
          } catch {}

          // Add fresh key
          execSync(`printf "%s" "${item.value}" | vercel env add ${item.key} ${targetEnv}`, {
            stdio: 'ignore',
            input: item.value,
          });
          console.log(`  ${GREEN}✓${RESET} Pushed ${BOLD}${item.key}${RESET}`);
          pushed++;
        } catch {
          console.log(`  ${YELLOW}⚠${RESET} Could not push ${BOLD}${item.key}${RESET} (run 'vercel login' if unauthenticated)`);
          failed++;
        }
      }

      console.log(`\n  ${GREEN}✓ Synchronized ${pushed}/${syncList.length} variables to ${targetEnv}.${RESET}`);
      if (failed > 0) {
        console.log(`  ${DIM}(Tip: Use 'npm run vercel:env:print' to inspect CLI commands manually)${RESET}`);
      }
    }
  } catch {
    console.log(`  ${YELLOW}⚠${RESET} Vercel CLI not found globally. To push secrets automatically:`);
    console.log(`     ${CYAN}npx vercel env add <KEY> ${targetEnv}${RESET}\n`);
  }

  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}\n`);
}

syncVercelEnv().catch((err) => {
  console.error('Environment sync error:', err);
  process.exit(1);
});
