/**
 * GALXAI: Stripe Product & Price Provisioning Script
 * 
 * Creates or updates all Compute Tier Products and Prices in the connected Stripe account.
 * Supports both test and live environments.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import Stripe from 'stripe';
import { STRIPE_PRODUCT_TIERS, StripeProductTier } from '../src/lib/stripe/products';
import { getStripeConfig } from '../src/lib/stripe/config';

interface SeededPriceRecord {
  tierKey: string;
  depositAmount: number;
  totalCredit: number;
  amountUsd?: number;
  totalCreditUsd?: number;
  productId: string;
  productName: string;
  priceId: string;
  currency: string;
  unitAmount: number;
}

async function seedStripeProducts() {
  console.log('======================================================================');
  console.log('   🚀  GALXAI STRIPE PRODUCT & TIER PROVISIONING SUBSTRATE          ');
  console.log('======================================================================\n');

  const config = getStripeConfig();
  const isMock = !config.isConfigured || !config.secretKey || config.secretKey.includes('Mock');

  if (isMock) {
    console.log('ℹ Notice: Running in Local Simulation / Offline Dev Mode.');
    console.log('  Generating mock Stripe Product & Price catalog without live API calls.\n');

    const generatedMap: Record<string, SeededPriceRecord> = {};
    for (const [key, tier] of Object.entries(STRIPE_PRODUCT_TIERS)) {
      generatedMap[key] = {
        tierKey: key,
        depositAmount: tier.depositAmountUsd,
        totalCredit: tier.totalCreditUsd,
        amountUsd: tier.depositAmountUsd,
        totalCreditUsd: tier.totalCreditUsd,
        productId: `prod_mock_${key}`,
        productName: tier.name,
        priceId: `price_mock_${key}`,
        currency: 'usd',
        unitAmount: tier.depositAmountUsd * 100
      };
      console.log(`  ✓ Simulated Tier [${key.padEnd(15)}]: $${tier.depositAmountUsd.toString().padEnd(3)} deposit -> $${tier.totalCreditUsd.toFixed(2)} compute (ID: price_mock_${key})`);
    }

    const outputPath = path.resolve(process.cwd(), 'src/lib/stripe/stripe-products.generated.json');
    if (fs.existsSync(outputPath)) {
      const existing = fs.readFileSync(outputPath, 'utf8');
      if ((existing.includes('price_1') || existing.includes('prod_V')) && !process.argv.includes('--force')) {
        console.log(`\n✓ Existing live Stripe catalog preserved at ${outputPath} (use --force to overwrite)`);
        console.log('======================================================================\n');
        return;
      }
    }
    fs.writeFileSync(outputPath, JSON.stringify(generatedMap, null, 2), 'utf8');
    console.log(`\n✓ Generated Product Catalog saved to: ${outputPath}`);
    console.log('======================================================================\n');
    return;
  }

  const stripe = new Stripe(config.secretKey, {
    apiVersion: '2025-02-24.acacia' as any,
    appInfo: {
      name: 'GALXAI-Product-Seeder',
      version: '3.0.0'
    }
  });

  console.log('Connecting to Stripe API with configured secret key...\n');

  // 1. Fetch existing products
  const existingProducts = await stripe.products.list({ limit: 100, active: true });
  const productByTierKey = new Map<string, Stripe.Product>();

  for (const prod of existingProducts.data) {
    if (prod.metadata?.galxai_tier_key) {
      productByTierKey.set(prod.metadata.galxai_tier_key, prod);
    }
  }

  const generatedMap: Record<string, SeededPriceRecord> = {};

  for (const [key, tier] of Object.entries(STRIPE_PRODUCT_TIERS)) {
    let product = productByTierKey.get(key);

    if (!product) {
      console.log(`Creating Product for Tier [${key}]...`);
      product = await stripe.products.create({
        name: tier.name,
        description: tier.description,
        statement_descriptor: tier.statementDescriptor,
        tax_code: tier.taxCode,
        metadata: tier.metadata
      });
      console.log(`  ✓ Product Created: ${product.id} (${tier.name})`);
    } else {
      console.log(`Updating Product for Tier [${key}] (${product.id})...`);
      product = await stripe.products.update(product.id, {
        name: tier.name,
        description: tier.description,
        statement_descriptor: tier.statementDescriptor,
        tax_code: tier.taxCode,
        metadata: tier.metadata
      });
      console.log(`  ✓ Product Updated: ${product.id}`);
    }

    // Check or create Price
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
    const targetAmountCents = Math.round(tier.depositAmountUsd * 100);
    let price = prices.data.find(p => p.unit_amount === targetAmountCents && p.currency === 'usd');

    if (!price) {
      console.log(`  Creating Price ($${tier.depositAmountUsd}.00 USD) for ${product.id}...`);
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: targetAmountCents,
        currency: 'usd',
        tax_behavior: 'exclusive',
        metadata: {
          galxai_tier_key: key
        }
      });
      console.log(`  ✓ Price Created: ${price.id}`);
    } else {
      console.log(`  ✓ Price Exists: ${price.id}`);
    }

    generatedMap[key] = {
      tierKey: key,
      depositAmount: tier.depositAmountUsd,
      totalCredit: tier.totalCreditUsd,
      amountUsd: tier.depositAmountUsd,
      totalCreditUsd: tier.totalCreditUsd,
      productId: product.id,
      productName: tier.name,
      priceId: price.id,
      currency: 'usd',
      unitAmount: targetAmountCents
    };
  }

  const outputPath = path.resolve(process.cwd(), 'src/lib/stripe/stripe-products.generated.json');
  fs.writeFileSync(outputPath, JSON.stringify(generatedMap, null, 2), 'utf8');
  console.log(`\n======================================================================`);
  console.log(`✨ ALL ${Object.keys(STRIPE_PRODUCT_TIERS).length} COMPUTE PACKS SEEDED & SYNCED IN STRIPE!`);
  console.log(`   Saved authoritative catalog to: ${outputPath}`);
  console.log(`======================================================================\n`);
}

seedStripeProducts().catch(err => {
  console.error('Fatal error during Stripe product provisioning:', err);
  process.exit(1);
});
