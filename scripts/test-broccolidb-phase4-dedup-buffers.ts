/**
 * GALXAI BroccoliDB Phase 4 Forensic & Multi-Modal Protocol DeDuplication Buffer Verification Suite
 * 
 * Tests the 5 Phase 4 deduplication buffers:
 * 1. BroccoliXmlSoapEnvelopeDedupBuffer (XML/SOAP Namespace & Envelope Hoisting)
 * 2. BroccoliPiiDeidentificationMaskBuffer (PII/PHI Surrogate De-identification)
 * 3. BroccoliMarkdownTableMatrixDedupBuffer (Markdown Table Column & Header Merger)
 * 4. BroccoliYamlK8sManifestDedupBuffer (K8s YAML Infrastructure Overlay)
 * 5. BroccoliBase64BinaryStripperDedupBuffer (Base64 Binary Image CAS Stripper)
 */

import { BroccoliXmlSoapEnvelopeDedupBuffer } from '../src/core/broccolidb/BroccoliXmlSoapEnvelopeDedupBuffer';
import { BroccoliPiiDeidentificationMaskBuffer } from '../src/core/broccolidb/BroccoliPiiDeidentificationMaskBuffer';
import { BroccoliMarkdownTableMatrixDedupBuffer } from '../src/core/broccolidb/BroccoliMarkdownTableMatrixDedupBuffer';
import { BroccoliYamlK8sManifestDedupBuffer } from '../src/core/broccolidb/BroccoliYamlK8sManifestDedupBuffer';
import { BroccoliBase64BinaryStripperDedupBuffer } from '../src/core/broccolidb/BroccoliBase64BinaryStripperDedupBuffer';

async function runPhase4DedupSuite() {
  console.log('================================================================');
  console.log('  GALXAI BROCCOLIDB PHASE 4 DEDUPLICATION BUFFER VERIFICATION   ');
  console.log('================================================================\n');

  // 1. Test BroccoliXmlSoapEnvelopeDedupBuffer
  console.log('[1/5] Testing BroccoliXmlSoapEnvelopeDedupBuffer (XML/SOAP Envelope Hoisting)...');
  const soapPayload = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:fin="http://fedwire.org/2026/financial" xmlns:sec="http://oasis-open.org/wss/2004/01/oasis">
    <soapenv:Header>
      <sec:SecurityToken>TOKEN_84920</sec:SecurityToken>
    </soapenv:Header>
    <soapenv:Body>
      <fin:GetAccountStatementResponse xmlns:fin="http://fedwire.org/2026/financial">
        <fin:TransactionRecord xmlns:fin="http://fedwire.org/2026/financial">
          <fin:TransactionId>TX-84920-1</fin:TransactionId>
          <fin:Amount>14500.00</fin:Amount>
          <fin:Currency>USD</fin:Currency>
        </fin:TransactionRecord>
        <fin:TransactionRecord xmlns:fin="http://fedwire.org/2026/financial">
          <fin:TransactionId>TX-84920-2</fin:TransactionId>
          <fin:Amount>82000.50</fin:Amount>
          <fin:Currency>USD</fin:Currency>
        </fin:TransactionRecord>
      </fin:GetAccountStatementResponse>
    </soapenv:Body>
  </soapenv:Envelope>`;

  const xmlResult = BroccoliXmlSoapEnvelopeDedupBuffer.deduplicateXmlSoap(soapPayload);
  console.log(`      Original XML Tokens : ${xmlResult.originalTokens}`);
  console.log(`      Compacted XML Tokens: ${xmlResult.compactedTokens}`);
  console.log(`      Tokens Saved        : ${xmlResult.tokensSaved} (${xmlResult.savingsPercentage}% spend cut)`);
  console.log(`      Namespaces Hoisted  : ${xmlResult.namespacesHoistedCount}`);

  if (!xmlResult.wasDeduplicated || xmlResult.savingsPercentage < 35.0) {
    throw new Error('XML/SOAP deduplication failed');
  }
  console.log('      [PASS] XmlSoapEnvelopeDedupBuffer: 100% verified XML namespace hoisting.\n');

  // 2. Test BroccoliPiiDeidentificationMaskBuffer
  console.log('[2/5] Testing BroccoliPiiDeidentificationMaskBuffer (PII Entity Surrogate Masking)...');
  const clinicalRecord = 'Patient Jane Doe (SSN: 123-45-6789, Email: jane.doe@hospital.org) was examined. ' +
    'Follow up with 123-45-6789 or email jane.doe@hospital.org regarding lab results. ' +
    'Billing card 4532-1234-5678-9012 charged for visit. Contact patient at 555-839-2049.';

  const piiResult = BroccoliPiiDeidentificationMaskBuffer.maskAndDeduplicate(clinicalRecord);
  const rehydrated = BroccoliPiiDeidentificationMaskBuffer.rehydrate(piiResult.maskedText);

  console.log(`      Original Tokens     : ${piiResult.originalTokens} | Masked Tokens: ${piiResult.compactedTokens}`);
  console.log(`      Entities Masked     : ${piiResult.distinctEntitiesMasked}`);
  console.log(`      Total Replacements  : ${piiResult.totalPiiOccurrencesReplaced}`);
  console.log(`      Rehydration Match   : ${rehydrated === clinicalRecord}`);

  if (!piiResult.wasMasked || rehydrated !== clinicalRecord || piiResult.totalPiiOccurrencesReplaced !== 6) {
    throw new Error('PII de-identification surrogate masking failed');
  }
  console.log('      [PASS] PiiDeidentificationMaskBuffer: 100% verified bidirectional PII masking.\n');

  // 3. Test BroccoliMarkdownTableMatrixDedupBuffer
  console.log('[3/5] Testing BroccoliMarkdownTableMatrixDedupBuffer (Markdown Table Header Merger)...');
  const brokenMarkdownTable = '| Date       | Tx ID       | Amount USD | Status   |\n' +
    '|------------|-------------|------------|----------|\n' +
    '| 2026-08-01 | TX-84920-01 |   1,500.00 | SETTLED  |\n' +
    '| 2026-08-02 | TX-84920-02 |   2,400.00 | SETTLED  |\n' +
    '| Date       | Tx ID       | Amount USD | Status   |\n' +
    '|------------|-------------|------------|----------|\n' +
    '| 2026-08-03 | TX-84920-03 |   9,800.00 | PENDING  |\n';

  const tableResult = BroccoliMarkdownTableMatrixDedupBuffer.deduplicateMarkdownTables(brokenMarkdownTable);
  console.log(`      Original Tokens       : ${tableResult.originalTokens}`);
  console.log(`      Compacted Tokens      : ${tableResult.compactedTokens}`);
  console.log(`      Duplicate Headers Cut : ${tableResult.duplicateHeadersMerged}`);
  console.log(`      Total Rows Retained   : ${tableResult.totalRowsPreserved}`);

  if (!tableResult.wasDeduplicated || tableResult.duplicateHeadersMerged !== 1 || tableResult.totalRowsPreserved !== 3) {
    throw new Error('Markdown table header deduplication failed');
  }
  console.log('      [PASS] MarkdownTableMatrixDedupBuffer: 100% verified table header consolidation.\n');

  // 4. Test BroccoliYamlK8sManifestDedupBuffer
  console.log('[4/5] Testing BroccoliYamlK8sManifestDedupBuffer (K8s YAML Metadata Hoisting)...');
  const multiDocYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production-core
spec:
  replicas: 3
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-svc
  namespace: production-core
spec:
  ports:
    - port: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway-ingress
  namespace: production-core
spec:
  rules:
    - host: api.enterprise.com`;

  const yamlResult = BroccoliYamlK8sManifestDedupBuffer.deduplicateYaml(multiDocYaml);
  console.log(`      Original YAML Tokens : ${yamlResult.originalTokens}`);
  console.log(`      Compacted YAML Tokens: ${yamlResult.compactedTokens}`);
  console.log(`      Docs Processed       : ${yamlResult.manifestDocsProcessed}`);
  console.log(`      Tokens Saved         : ${yamlResult.tokensSaved} (${yamlResult.savingsPercentage}% spend cut)`);

  if (!yamlResult.wasDeduplicated || yamlResult.manifestDocsProcessed !== 3) {
    throw new Error('YAML K8s manifest deduplication failed');
  }
  console.log('      [PASS] YamlK8sManifestDedupBuffer: 100% verified K8s overlay metadata deduplication.\n');

  // 5. Test BroccoliBase64BinaryStripperDedupBuffer
  console.log('[5/5] Testing BroccoliBase64BinaryStripperDedupBuffer (Base64 Binary CAS Stripper)...');
  const fakePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='.repeat(20);
  const jsonWithImage = JSON.stringify({
    reportId: 'REP-2026-84920',
    chartScreenshot: `data:image/png;base64,${fakePngBase64}`,
    analysis: 'The quarterly revenue chart shows a 42% growth trend.',
  });

  const b64Result = BroccoliBase64BinaryStripperDedupBuffer.stripBase64Attachments(jsonWithImage);
  const restoredJson = BroccoliBase64BinaryStripperDedupBuffer.restoreBase64Attachments(b64Result.compactedText);

  console.log(`      Original JSON Tokens : ${b64Result.originalTokens}`);
  console.log(`      Compacted JSON Tokens: ${b64Result.compactedTokens}`);
  console.log(`      Tokens Saved         : ${b64Result.tokensSaved} (${b64Result.savingsPercentage}% spend reduction)`);
  console.log(`      Binary Restored Match: ${restoredJson === jsonWithImage}`);

  if (!b64Result.wasStripped || restoredJson !== jsonWithImage || b64Result.savingsPercentage < 90.0) {
    throw new Error('Base64 binary CAS stripping failed');
  }
  console.log('      [PASS] Base64BinaryStripperDedupBuffer: 100% verified Base64 CAS attachment extraction.\n');

  console.log('================================================================');
  console.log('  ALL 5 PHASE 4 DEDUPLICATION BUFFERS VERIFIED 100%!            ');
  console.log('================================================================\n');
}

runPhase4DedupSuite().catch(err => {
  console.error('Phase 4 dedup suite error:', err);
  process.exit(1);
});
