import assert from 'node:assert/strict';
import { BroccoliObdCompactor } from '../src/core/broccolidb/BroccoliObdCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB OBD-II TELEMATICS & DTC COMPACTOR');
  console.log('======================================================================\n');

  BroccoliObdCompactor.clear();

  // Full mock OBD-II CAN bus stream dump with raw hex frames, DTC fault codes, and freeze frame metrics
  const rawObdData = `
DIAGNOSTIC SCAN TOOL LOG - PROTOCOL ISO 15765-4 (CAN 11-BIT 500KBAUD)
Interface: OBDLink MX+ | Vehicle: 2024 Ford F-150 3.5L EcoBoost

DIAGNOSTIC TROUBLE CODES (DTC):
- P0300 - Random/Multiple Cylinder Misfire Detected
- P0420 - Catalyst System Efficiency Below Threshold (Bank 1)

MIL STATUS:
Malfunction Indicator Lamp: Active (MIL ON)
Distance Traveled with MIL ON: 42 miles

FREEZE FRAME DATA (FRAME #0 TRIGGERED BY P0300):
Engine RPM: 2,850 RPM
Vehicle Speed: 62 MPH
Calculated Load: 74.5%
Coolant Temp: 195 °F
Intake Air Temp: 82 °F
Short Term Fuel Trim Bank 1: +3.2%
Long Term Fuel Trim Bank 1: +11.8%
Mass Air Flow: 48.2 g/s
Absolute Throttle Position: 28.4%

I/M READINESS MONITORS:
Misfire Monitor: Ready
Fuel System: Ready
Catalyst Monitor: Complete

RAW CAN BUS PACKET TRACE (HEX):
0x7E8 03 41 00 BF 1F E8 00
0x7E8 04 41 05 7B 00 00 00
0x7E8 04 41 0C 1A 40 00 00
0x7E8 03 41 0D 3E 00 00 00
`.trim();

  console.log('[1/2] Compacting OBD-II Diagnostic Telematics in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliObdCompactor.compactObdTelematics(rawObdData);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - DTC Codes: ${res.activeDtcCodes.join(', ')}`);
  console.log(`      - MIL Status: ${res.milStatus}`);
  console.log(`      - Freeze Frame: ${res.freezeFrameSummary}`);
  console.log(`      - Readiness: ${res.readinessStatus}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted OBD Preview:\n"""\n${res.compactedObdPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.activeDtcCodes.length, 2);
  assert.equal(res.milStatus, 'ACTIVE (MIL ON)');
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedObdPrompt.includes('P0300'));
  assert.ok(res.compactedObdPrompt.includes('P0420'));
  assert.ok(res.compactedObdPrompt.includes('ACTIVE (MIL ON)'));
  assert.ok(res.compactedObdPrompt.includes('RPM: 2,850'));
  assert.ok(!res.compactedObdPrompt.includes('0x7E8 03 41 00')); // Raw hex CAN packets pruned
  assert.ok(!res.compactedObdPrompt.includes('Short Term Fuel Trim Bank 1')); // Fuel trim telemetry noise pruned

  console.log('\n[✓] OBD-II CAN Bus DTC Fault & Freeze Frame Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL OBD COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
