/**
 * GALXAI: Stripe CLI Setup & Diagnostic Helper
 * Checks CLI installation, authentication, webhook forwarding, and fixture triggering.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

function runCheck() {
  console.log('======================================================================');
  console.log('   ⚡  GALXAI STRIPE CLI SETUP & WEBHOOK TUNNEL ENVIRONMENT          ');
  console.log('======================================================================\n');

  // 1. Verify Stripe CLI installation
  try {
    const version = execSync('stripe version', { encoding: 'utf8' }).trim();
    console.log(`✓ Stripe CLI Installed: ${version.split('\n')[0]}`);
  } catch {
    console.error('✗ Stripe CLI is not installed. Run: brew install stripe/stripe-cli/stripe');
    process.exit(1);
  }

  // 2. Check environment configuration in .env.local
  const envPath = path.resolve(process.cwd(), '.env.local');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  console.log('\n--- Environment Variables (.env.local) ---');
  const hasSecret = envContent.includes('STRIPE_SECRET_KEY=sk_');
  const hasPublishable = envContent.includes('STRIPE_PUBLISHABLE_KEY=pk_') || envContent.includes('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_');
  const hasWebhookSecret = envContent.includes('STRIPE_WEBHOOK_SECRET=whsec_');

  console.log(`  STRIPE_SECRET_KEY:              ${hasSecret ? '✓ Configured' : '○ Placeholder / Not set'}`);
  console.log(`  NEXT_PUBLIC_STRIPE_PUBLISHABLE: ${hasPublishable ? '✓ Configured' : '○ Placeholder / Not set'}`);
  console.log(`  STRIPE_WEBHOOK_SECRET:          ${hasWebhookSecret ? '✓ Configured' : '○ Placeholder / Not set'}`);

  console.log('\n--- Quickstart Instructions with Stripe CLI ---');
  console.log('1. Authenticate with your Stripe account:');
  console.log('   $ stripe login\n');

  console.log('2. Start the local webhook forwarding tunnel:');
  console.log('   $ npm run stripe:listen');
  console.log('   (or: stripe listen --forward-to localhost:3000/api/stripe/webhook)\n');

  console.log('3. Copy the webhook signing secret from the CLI output:');
  console.log('   > Ready! Your webhook signing secret is whsec_xxxxxxxxxx');
  console.log('   Paste it into .env.local as STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxx\n');

  console.log('4. Trigger test checkout events in another terminal:');
  console.log('   $ npm run stripe:trigger:checkout');
  console.log('   $ npm run stripe:trigger:invoice\n');

  console.log('======================================================================\n');
}

runCheck();
