import assert from 'node:assert/strict';
import { BroccoliLabReportCompactor, LabTestRow } from '../src/core/broccolidb/BroccoliLabReportCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB CLINICAL LAB REPORT MATRIX COMPACTOR');
  console.log('======================================================================\n');

  BroccoliLabReportCompactor.clear();

  // Comprehensive Metabolic Panel (CMP) with 14 tests: 2 abnormal, 12 normal
  const cmpPanel: LabTestRow[] = [
    { testName: 'Sodium', value: 140, unit: 'mEq/L', referenceRange: '135-145', flag: 'NORMAL' },
    { testName: 'Potassium', value: 4.2, unit: 'mEq/L', referenceRange: '3.5-5.0', flag: 'NORMAL' },
    { testName: 'Chloride', value: 101, unit: 'mEq/L', referenceRange: '96-106', flag: 'NORMAL' },
    { testName: 'CO2', value: 24, unit: 'mEq/L', referenceRange: '22-29', flag: 'NORMAL' },
    { testName: 'BUN', value: 16, unit: 'mg/dL', referenceRange: '7-20', flag: 'NORMAL' },
    { testName: 'Creatinine', value: 0.9, unit: 'mg/dL', referenceRange: '0.6-1.2', flag: 'NORMAL' },
    { testName: 'Glucose', value: 235, unit: 'mg/dL', referenceRange: '70-99', flag: 'CRITICAL_HIGH' }, // Abnormal
    { testName: 'Calcium', value: 9.5, unit: 'mg/dL', referenceRange: '8.5-10.2', flag: 'NORMAL' },
    { testName: 'Total Protein', value: 7.1, unit: 'g/dL', referenceRange: '6.0-8.3', flag: 'NORMAL' },
    { testName: 'Albumin', value: 4.3, unit: 'g/dL', referenceRange: '3.5-5.0', flag: 'NORMAL' },
    { testName: 'Total Bilirubin', value: 0.8, unit: 'mg/dL', referenceRange: '0.1-1.2', flag: 'NORMAL' },
    { testName: 'Alkaline Phosphatase', value: 75, unit: 'U/L', referenceRange: '44-147', flag: 'NORMAL' },
    { testName: 'AST', value: 22, unit: 'U/L', referenceRange: '10-40', flag: 'NORMAL' },
    { testName: 'ALT', value: 89, unit: 'U/L', referenceRange: '7-56', flag: 'HIGH' }, // Abnormal
  ];

  console.log('[1/2] Compacting 14-Test CMP Panel in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliLabReportCompactor.compactLabReport(cmpPanel);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Total Tests: ${res.totalTestsCount} (Abnormal: ${res.abnormalTestsCount}, Normal: ${res.normalTestsCount})`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Report Preview:\n"""\n${res.compactedReport}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.abnormalTestsCount, 2);
  assert.equal(res.normalTestsCount, 12);
  assert.ok(res.savingsPercentage >= 50);
  assert.ok(res.compactedReport.includes('[CRITICAL_HIGH] Glucose: 235 mg/dL'));
  assert.ok(res.compactedReport.includes('[HIGH] ALT: 89 U/L'));
  assert.ok(res.compactedReport.includes('WITHIN NORMAL LIMITS (12 tests)'));

  console.log('\n[✓] Clinical Lab Abnormal Isolation & Normal Consolidation Verified.');

  console.log('\n======================================================================');
  console.log('   ALL LAB REPORT COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
