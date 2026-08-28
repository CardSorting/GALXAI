import assert from 'node:assert/strict';
import { BroccoliBolCompactor } from '../src/core/broccolidb/BroccoliBolCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB OCEAN BILL OF LADING & CUSTOMS COMPACTOR');
  console.log('======================================================================\n');

  BroccoliBolCompactor.clear();

  // Full mock Ocean Master BOL & CBP Customs Entry with Hague-Visby maritime disclaimers and seal notes
  const rawBol = `
MEDITERRANEAN SHIPPING COMPANY (MSC) - OCEAN BILL OF LADING
B/L NO: MSCU-9482019-US | VOYAGE NO: 2608W | OCEAN VESSEL: MSC OSCAR
SHIPPER: Shanghai High-Density Electronics Manufacturing Ltd, Pudong, China
CONSIGNEE: GALXAI Technologies Inc, Chicago, IL, USA

PORTS & ROUTING:
PORT OF LOADING: Shanghai Port, China
PORT OF DISCHARGE: Port of Long Beach, CA, USA

CARGO DESCRIPTION:
DESCRIPTION OF GOODS: 1,200 Cartons AI Server Accelerator Modules
HTS CODE: 8471.50.0150
GROSS WEIGHT: 14,850 KG
CONTAINER NO: MSCU-8849201-40HC | SEAL: E-SEAL-884920

PAYMENT & CUSTOMS CLEARANCE:
FREIGHT TERMS: PREPAID
CBP CUSTOMS STATUS: RELEASED (CBP Entry 948-2019482-1 Cleared Long Beach)

CARRIER CONDITIONS OF CARRIAGE (HAGUE-VISBY RULES):
The Carrier shall in no case be responsible for loss or damage to goods arising or resulting from unseaworthiness, fire, perils of the sea, act of God, or latent defects not discoverable by due diligence. All container seals must remain intact upon discharge.
AUTHORIZED MSC AGENT: [DIGITAL PORT STAMP 2026-08-28]
`.trim();

  console.log('[1/2] Compacting Ocean BOL in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliBolCompactor.compactBol(rawBol);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Shipment: ${res.bolAndVessel}`);
  console.log(`      - Routing: ${res.partiesAndRouting}`);
  console.log(`      - Cargo: ${res.cargoAndContainer}`);
  console.log(`      - Customs: ${res.freightAndCustomsStatus}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted BOL Preview:\n"""\n${res.compactedBolPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.bolAndVessel.includes('MSCU-9482019-US'));
  assert.ok(res.bolAndVessel.includes('MSC OSCAR'));
  assert.ok(res.partiesAndRouting.includes('Shanghai'));
  assert.ok(res.partiesAndRouting.includes('Long Beach'));
  assert.ok(res.cargoAndContainer.includes('8471.50'));
  assert.ok(res.freightAndCustomsStatus.includes('PREPAID'));
  assert.ok(res.freightAndCustomsStatus.includes('RELEASED'));
  assert.ok(res.savingsPercentage >= 30);
  assert.ok(!res.compactedBolPrompt.includes('The Carrier shall in no case be responsible')); // Hague-Visby boilerplate pruned

  assert.ok(!res.compactedBolPrompt.includes('DIGITAL PORT STAMP')); // Signature stamp pruned

  console.log('\n[✓] Ocean Bill of Lading & Customs Manifest Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL BOL COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
