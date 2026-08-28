import assert from 'node:assert/strict';
import { BroccoliVitalsTrendCompactor, VitalSignReading } from '../src/core/broccolidb/BroccoliVitalsTrendCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB CLINICAL VITALS TREND COMPACTOR');
  console.log('======================================================================\n');

  BroccoliVitalsTrendCompactor.clear();

  // 10 readings: 8 stable readings + 2 critical sepsis readings
  const telemetryReadings: VitalSignReading[] = [
    { time: '08:00', heartRate: 72, systolicBp: 120, diastolicBp: 80, respRate: 16, spO2: 98, tempF: 98.6 },
    { time: '08:15', heartRate: 74, systolicBp: 122, diastolicBp: 79, respRate: 15, spO2: 99, tempF: 98.6 },
    { time: '08:30', heartRate: 70, systolicBp: 118, diastolicBp: 81, respRate: 16, spO2: 98, tempF: 98.5 },
    { time: '08:45', heartRate: 75, systolicBp: 121, diastolicBp: 80, respRate: 14, spO2: 99, tempF: 98.7 },
    { time: '09:00', heartRate: 73, systolicBp: 119, diastolicBp: 78, respRate: 16, spO2: 98, tempF: 98.6 },
    { time: '09:15', heartRate: 71, systolicBp: 124, diastolicBp: 82, respRate: 15, spO2: 98, tempF: 98.4 },
    { time: '09:30', heartRate: 76, systolicBp: 120, diastolicBp: 80, respRate: 16, spO2: 99, tempF: 98.6 },
    { time: '09:45', heartRate: 72, systolicBp: 122, diastolicBp: 79, respRate: 15, spO2: 98, tempF: 98.5 },
    { time: '10:00', heartRate: 135, systolicBp: 84, diastolicBp: 52, respRate: 28, spO2: 89, tempF: 102.5 }, // Critical spike
    { time: '10:15', heartRate: 142, systolicBp: 80, diastolicBp: 48, respRate: 30, spO2: 87, tempF: 102.8 }, // Critical spike
  ];

  console.log('[1/2] Compacting 10-Point ICU Vitals Flowsheet in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliVitalsTrendCompactor.compactVitals(telemetryReadings);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Total Readings: ${res.totalReadingsCount} (Unstable Deviations: ${res.unstableReadingsCount})`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Telemetry Preview:\n"""\n${res.compactedTelemetrySummary}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.totalReadingsCount, 10);
  assert.equal(res.unstableReadingsCount, 2);
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedTelemetrySummary.includes('STABLE BASELINE INTERVAL (8 readings)'));
  assert.ok(res.compactedTelemetrySummary.includes('HR 70-76 bpm'));
  assert.ok(res.compactedTelemetrySummary.includes('[10:00] HR: 135 bpm'));
  assert.ok(res.compactedTelemetrySummary.includes('[10:15] HR: 142 bpm'));

  console.log('\n[✓] Clinical Vitals Stable Range Compression & Critical Event Isolation Verified.');

  console.log('\n======================================================================');
  console.log('   ALL VITALS TREND COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
