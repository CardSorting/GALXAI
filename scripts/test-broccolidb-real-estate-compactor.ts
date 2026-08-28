import assert from 'node:assert/strict';
import { BroccoliRealEstateCompactor } from '../src/core/broccolidb/BroccoliRealEstateCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB REAL ESTATE PROPERTY & LEASE COMPACTOR');
  console.log('======================================================================\n');

  BroccoliRealEstateCompactor.clear();

  // Full mock MLS listing with flowery marketing prose, school ratings, and commercial lease financials
  const rawPropertyListing = `
LUXURY WATERFRONT ESTATE - MLS #FL-9482019

Property Address: 1420 Brickell Bay Dr, Penthouse 40A, Miami, FL 33131
List Price: $3,450,000
Property Type: Luxury High-Rise Condominium

SPECIFICATIONS:
3 Beds, 3.5 Baths, 3,450 sqft, Built in 2022
2 Assigned Covered Garage Parking Spaces, Private Elevator Foyer

MARKETING DESCRIPTION:
Welcome to an unparalleled architectural masterpiece overlooking Biscayne Bay. This sun-drenched oasis boasts floor-to-ceiling impact glass windows, custom Calacatta marble waterfalls, European oak hardwood flooring, and a bespoke Gaggenau chef's kitchen. Enjoy breathtaking sunrise vistas and nocturnal city lights.

COMMERCIAL LEASE & INVESTMENT FINANCIALS:
Cap Rate: 6.8%
NOI: $234,600 / yr
HOA Dues: $1,850 / mo (includes 24/7 concierge, spa, rooftop infinity pool, and valet)
Lease Structure: Triple Net (NNN) commercial ground floor tenant with 10-year term

SCHOOL DISTRICT RATINGS & ZONING:
Miami-Dade County School District 14 (Southside Elementary rating 9/10, Shenandoah Middle 8/10).
Assessor Parcel APN: 01-4139-082-0190. Zoning Code: T6-48b-O.
`.trim();

  console.log('[1/2] Compacting Real Estate MLS Listing in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliRealEstateCompactor.compactProperty(rawPropertyListing);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Property Address: ${res.propertyAddress}`);
  console.log(`      - Pricing: ${res.propertyPrice}`);
  console.log(`      - Specs: ${res.propertySpecs}`);
  console.log(`      - Financials: ${res.financialMetrics}`);
  console.log(`      - Lease Structure: ${res.leaseStructure}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Property Preview:\n"""\n${res.compactedPropertyPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.propertyAddress, '1420 Brickell Bay Dr, Penthouse 40A, Miami, FL 33131');
  assert.equal(res.propertyPrice, '$3,450,000');
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedPropertyPrompt.includes('1420 Brickell Bay Dr'));
  assert.ok(res.compactedPropertyPrompt.includes('$3,450,000'));
  assert.ok(res.compactedPropertyPrompt.includes('Cap Rate: 6.8%'));
  assert.ok(!res.compactedPropertyPrompt.includes('sun-drenched oasis')); // Marketing adjectives pruned
  assert.ok(!res.compactedPropertyPrompt.includes('Shenandoah Middle 8/10')); // School district pruned
  assert.ok(!res.compactedPropertyPrompt.includes('01-4139-082-0190')); // APN parcel pruned

  console.log('\n[✓] Real Estate MLS Listing & Lease Underwriting Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL REAL ESTATE COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
