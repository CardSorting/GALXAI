import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// ANSI Colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function parseArgs() {
  const args = process.argv.slice(2);
  let generateFresh = false;
  let customKey: string | null = null;
  let envFile = '.env.local';
  let dryRun = false;

  for (const arg of args) {
    if (arg === '--fresh' || arg === '--random') {
      generateFresh = true;
    } else if (arg.startsWith('--key=')) {
      customKey = arg.split('=')[1];
    } else if (arg.startsWith('--file=')) {
      envFile = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      dryRun = true;
    }
  }

  return { generateFresh, customKey, envFile, dryRun };
}

function verifyVaultCrypto(masterSecret: string, keyVersion: string = 'v1'): boolean {
  try {
    // 1. Derive versioned key using HKDF-SHA256 matching GalxCryptoVault
    const derivedKey = crypto.hkdfSync(
      'sha256',
      Buffer.from(masterSecret, 'utf-8'),
      Buffer.from('galx-vault-salt-2026', 'utf-8'),
      Buffer.from(`galx-shard-isolation-${keyVersion}`, 'utf-8'),
      32
    );

    // 2. Test AES-256-GCM Encryption / Decryption Round-Trip
    const iv = crypto.randomBytes(12);
    const plaintext = 'galx_test_secret_payload_2026';
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(derivedKey), iv);
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(derivedKey), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted === plaintext;
  } catch (err) {
    return false;
  }
}

async function run() {
  const { generateFresh, customKey, envFile, dryRun } = parseArgs();

  console.log(`\n${BOLD}${CYAN}======================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   GALXAI: Vault Cryptography & Secrets Population   ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================${RESET}\n`);

  let masterSecret: string;
  if (customKey) {
    masterSecret = customKey;
    console.log(`  Using provided custom secret: ${BOLD}${masterSecret}${RESET}`);
  } else if (generateFresh) {
    masterSecret = `galx_vault_${crypto.randomBytes(24).toString('hex')}`;
    console.log(`  Generated new high-entropy 256-bit secret: ${BOLD}${masterSecret}${RESET}`);
  } else {
    masterSecret = 'galxai-apex-vault-master-secret-key-32b';
    console.log(`  Using standard master secret: ${BOLD}${masterSecret}${RESET}`);
  }

  const keyVersion = 'v1';

  // Perform Cryptographic Self-Test
  const isCryptoValid = verifyVaultCrypto(masterSecret, keyVersion);
  if (!isCryptoValid) {
    console.error(`\n${RED}${BOLD}✗ Cryptographic self-test failed with this secret!${RESET}`);
    process.exit(1);
  }
  console.log(`  ${GREEN}✓${RESET} HKDF-SHA256 & AES-256-GCM self-test passed.`);

  const targetPath = path.resolve(process.cwd(), envFile);
  const vaultSectionTemplate = `# ------------------------------------------------------------------------------
# 3. VAULT CRYPTOGRAPHY & SOC2 SECRETS (HKDF-SHA256 & AES-256-GCM)
# ------------------------------------------------------------------------------
GALX_VAULT_MASTER_SECRET=${masterSecret}
GALX_VAULT_KEY=${masterSecret}
GALX_VAULT_ACTIVE_KEY_VERSION=${keyVersion}`;

  let existingContent = '';
  if (fs.existsSync(targetPath)) {
    existingContent = fs.readFileSync(targetPath, 'utf8');
  }

  let updatedContent = existingContent;

  // Regex patterns to check if existing keys are present
  const hasMasterSecret = /GALX_VAULT_MASTER_SECRET=.*/.test(existingContent);
  const hasVaultKey = /GALX_VAULT_KEY=.*/.test(existingContent);
  const hasActiveVersion = /GALX_VAULT_ACTIVE_KEY_VERSION=.*/.test(existingContent);

  if (hasMasterSecret || hasVaultKey || hasActiveVersion) {
    // Replace existing variables
    updatedContent = updatedContent
      .replace(/GALX_VAULT_MASTER_SECRET=.*/g, `GALX_VAULT_MASTER_SECRET=${masterSecret}`)
      .replace(/GALX_VAULT_KEY=.*/g, `GALX_VAULT_KEY=${masterSecret}`)
      .replace(/GALX_VAULT_ACTIVE_KEY_VERSION=.*/g, `GALX_VAULT_ACTIVE_KEY_VERSION=${keyVersion}`);
  } else {
    // Append section cleanly
    if (updatedContent.length > 0 && !updatedContent.endsWith('\n')) {
      updatedContent += '\n\n';
    }
    updatedContent += `${vaultSectionTemplate}\n`;
  }

  if (dryRun) {
    console.log(`\n${YELLOW}[DRY RUN] Would write the following to ${envFile}:${RESET}\n`);
    console.log(vaultSectionTemplate);
  } else {
    fs.writeFileSync(targetPath, updatedContent, 'utf8');
    console.log(`  ${GREEN}✓${RESET} Successfully updated ${BOLD}${envFile}${RESET} with vault secrets.`);
  }

  console.log(`\n${BOLD}Vercel & Production Environment Snippet:${RESET}`);
  console.log(`${CYAN}------------------------------------------------------${RESET}`);
  console.log(`GALX_VAULT_MASTER_SECRET=${masterSecret}`);
  console.log(`GALX_VAULT_KEY=${masterSecret}`);
  console.log(`GALX_VAULT_ACTIVE_KEY_VERSION=${keyVersion}`);
  console.log(`${CYAN}------------------------------------------------------${RESET}`);

  console.log(`\n${GREEN}${BOLD}Done!${RESET}\n`);
}

run().catch((err) => {
  console.error('Error running vault population script:', err);
  process.exit(1);
});
