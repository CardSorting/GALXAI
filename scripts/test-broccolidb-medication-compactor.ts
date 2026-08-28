import assert from 'node:assert/strict';
import { BroccoliMedicationCompactor, MedicationEntry } from '../src/core/broccolidb/BroccoliMedicationCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB CLINICAL MEDICATION COMPACTOR');
  console.log('======================================================================\n');

  BroccoliMedicationCompactor.clear();

  // 6 verbose patient prescription entries
  const patientMeds: MedicationEntry[] = [
    {
      name: 'Metformin Hydrochloride',
      dosage: '1000 MG',
      rawSig: 'Take 1 tablet by mouth twice daily with meals',
      prescriber: 'Dr. Robert Chen, MD',
      quantity: 60,
      refills: 3,
    },
    {
      name: 'Lisinopril',
      dosage: '20 MG',
      rawSig: 'Take 1 tablet by mouth once daily in the morning',
      prescriber: 'Dr. Robert Chen, MD',
      quantity: 30,
      refills: 5,
    },
    {
      name: 'Atorvastatin Calcium',
      dosage: '40 MG',
      rawSig: 'Take 1 tablet by mouth once daily at bedtime',
      prescriber: 'Dr. Robert Chen, MD',
      quantity: 30,
      refills: 3,
    },
    {
      name: 'Albuterol Sulfate HFA',
      dosage: '90 MCG/ACT',
      rawSig: 'Inhale 2 puffs as needed for shortness of breath',
      prescriber: 'Dr. Sarah Jenkins, MD',
      quantity: 1,
      refills: 2,
    },
    {
      name: 'Ibuprofen',
      dosage: '600 MG',
      rawSig: 'Take 1 tablet by mouth three times daily as needed for pain',
      prescriber: 'Dr. Robert Chen, MD',
      quantity: 30,
      refills: 1,
    },
    {
      name: 'Levothyroxine Sodium',
      dosage: '50 MCG',
      rawSig: 'Take 1 tablet by mouth once daily on an empty stomach 30 minutes before breakfast',
      prescriber: 'Dr. Robert Chen, MD',
      quantity: 90,
      refills: 3,
    },
  ];

  console.log('[1/2] Compacting 6-Medication Patient Prescription List in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliMedicationCompactor.compactMedicationList(patientMeds);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Total Medications: ${res.totalMedicationsCount}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Medication List Preview:\n"""\n${res.compactedMedList}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedMedList.includes('1 tab PO BID w/ meals'));
  assert.ok(res.compactedMedList.includes('1 tab PO QAM'));
  assert.ok(res.compactedMedList.includes('1 tab PO QHS'));
  assert.ok(!res.compactedMedList.includes('Dr. Robert Chen')); // Redundant metadata pruned

  console.log('\n[✓] Clinical Sig Shorthand Normalization & Admin Metadata Pruning Verified.');

  console.log('\n======================================================================');
  console.log('   ALL MEDICATION COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
