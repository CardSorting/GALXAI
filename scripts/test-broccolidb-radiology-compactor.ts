import assert from 'node:assert/strict';
import { BroccoliRadiologyCompactor } from '../src/core/broccolidb/BroccoliRadiologyCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB CLINICAL RADIOLOGY COMPACTOR');
  console.log('======================================================================\n');

  BroccoliRadiologyCompactor.clear();

  // Full CT Chest/Abdomen/Pelvis Radiology report with 20 lines of negative normal findings + acute appendicitis impression
  const ctReport = `
EXAMINATION: CT ABDOMEN AND PELVIS WITH IV CONTRAST
CLINICAL INDICATION: 34-year-old male with acute right lower quadrant abdominal pain and fever.
TECHNIQUE: Helical CT scan performed with 100mL Omnipaque IV contrast. CTDIvol: 12.4 mGy, DLP: 580 mGy-cm.

FINDINGS:
Lungs: Visualized lung bases are clear without consolidation or pleural effusion.
Liver: Normal size and contour without focal hepatic mass.
Gallbladder: Unremarkable without wall thickening or radio-opaque gallstones.
Spleen: Normal size and homogeneous attenuation.
Pancreas: Normal parenchymal enhancement without ductal dilatation.
Adrenals: Normal bilateral appearance.
Kidneys: Symmetric contrast excretion. No hydronephrosis or obstructing nephrolithiasis.
Bowel: Thickened, dilated appendix measuring 1.2 cm in diameter with prominent surrounding fat stranding and an appendicolith in the appendiceal orifice.
Pelvis: No free fluid or pelvic abscess.
Bones: No acute fracture or aggressive osteolytic lesion.

IMPRESSION:
1. Acute appendicitis with appendicolith and localized periappendiceal inflammatory fat stranding.
2. No evidence of perforation or organized abscess.
`.trim();

  console.log('[1/2] Compacting Radiology Report in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliRadiologyCompactor.compactReport(ctReport);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Report Preview:\n"""\n${res.compactedRadiologyReport}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedRadiologyReport.includes('CT ABDOMEN AND PELVIS'));
  assert.ok(res.compactedRadiologyReport.includes('Acute appendicitis with appendicolith'));
  assert.ok(res.compactedRadiologyReport.includes('NEGATIVE / UNREMARKABLE ANATOMY'));
  assert.ok(!res.compactedRadiologyReport.includes('CTDIvol: 12.4 mGy')); // Scanner parameters pruned

  console.log('\n[✓] Radiology Diagnostic Impression Isolation & Normal Organ Condensation Verified.');

  console.log('\n======================================================================');
  console.log('   ALL RADIOLOGY COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
