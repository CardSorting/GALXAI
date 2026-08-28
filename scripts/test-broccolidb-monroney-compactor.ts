import assert from 'node:assert/strict';
import { BroccoliMonroneyCompactor } from '../src/core/broccolidb/BroccoliMonroneyCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB MONRONEY WINDOW STICKER COMPACTOR');
  console.log('======================================================================\n');

  BroccoliMonroneyCompactor.clear();

  // Full mock OEM Monroney window sticker with EPA fuel economy disclosures, NHTSA 5-star ratings, and options
  const rawMonroneySticker = `
UNITED STATES AUTOMOTIVE WINDOW STICKER - MONRONEY LABEL
2026 Porsche 911 Carrera 4S Coupe
VIN: WP0AB2A99TS194820 | Exterior: Guards Red | Interior: Leather Interior in Black

POWERTRAIN & MECHANICAL:
Engine: 3.0-Liter Twin-Turbocharged Boxer 6 (443 HP / 390 lb-ft)
Transmission: 8-Speed Porsche Doppelkupplung (PDK)
Drivetrain: All-Wheel Drive (AWD) with Porsche Traction Management (PTM)

STANDARD FACTORY EQUIPMENT:
- Power 4-way sport seats with embossed crests
- Automatic dual-zone climate control
- LED headlights with integrated 4-point daytime running lights
- Porsche Communication Management (PCM) with navigation

INSTALLED OPTIONAL PACKAGES & EQUIPMENT:
- Sport Chrono Package with Mode Switch ($2,790)
- Porsche Ceramic Composite Brakes (PCCB) ($9,860)
- Front Axle Lift System ($2,770)
- Burmester High-End 3D Surround Sound System ($5,560)
- Sport Exhaust System with Tailpipes in Silver ($2,950)

GOVERNMENT 5-STAR SAFETY RATINGS:
Overall Vehicle Score: Not Rated. Frontal Crash: 5 Stars. Side Crash: 5 Stars. Rollover: 5 Stars.
Source: National Highway Traffic Safety Administration (NHTSA).

EPA FUEL ECONOMY & ENVIRONMENT RATINGS:
Combined MPG: 20 (18 City / 23 Highway). Smog Rating: 5/10. Annual Fuel Cost: $3,200.
This vehicle emits 432 grams CO2 per mile. The best emits 0 grams per mile.

Total MSRP: $158,430
`.trim();

  console.log('[1/2] Compacting Monroney Window Sticker in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliMonroneyCompactor.compactMonroney(rawMonroneySticker);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Vehicle: ${res.vehicleTitle} (VIN: ${res.vin})`);
  console.log(`      - Total MSRP: ${res.msrpPrice}`);
  console.log(`      - Powertrain: ${res.powertrain}`);
  console.log(`      - Packages: ${res.installedPackages.length} items`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Monroney Preview:\n"""\n${res.compactedMonroneyPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.vin, 'WP0AB2A99TS194820');
  assert.equal(res.msrpPrice, '$158,430');
  assert.equal(res.installedPackages.length, 5);
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedMonroneyPrompt.includes('2026 Porsche 911'));
  assert.ok(res.compactedMonroneyPrompt.includes('WP0AB2A99TS194820'));
  assert.ok(res.compactedMonroneyPrompt.includes('$158,430'));
  assert.ok(res.compactedMonroneyPrompt.includes('Sport Chrono Package'));
  assert.ok(!res.compactedMonroneyPrompt.includes('National Highway Traffic Safety Administration')); // NHTSA boilerplate pruned
  assert.ok(!res.compactedMonroneyPrompt.includes('This vehicle emits 432 grams CO2')); // EPA smog text pruned

  console.log('\n[✓] Monroney Window Sticker & Build Sheet Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL MONRONEY COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
