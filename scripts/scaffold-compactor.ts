#!/usr/bin/env node
/**
 * scripts/scaffold-compactor.ts
 * 
 * Interactive Maintainer Scaffolding Tool for New BroccoliDB Domain Compactors.
 * Generates the compactor class with strict regex hoisting and safety provenance.
 * 
 * Usage:
 *   npx tsx scripts/scaffold-compactor.ts --name=DicomImaging --cluster="Clinical Medicine"
 *   npm run scaffold:compactor -- --name=DicomImaging --cluster="Clinical Medicine"
 */

import * as fs from 'fs';
import * as path from 'path';

function parseArgs(): { name?: string; cluster?: string } {
  const args = process.argv.slice(2);
  const result: { name?: string; cluster?: string } = {};
  for (const arg of args) {
    if (arg.startsWith('--name=')) {
      result.name = arg.replace('--name=', '').trim();
    } else if (arg.startsWith('--cluster=')) {
      result.cluster = arg.replace('--cluster=', '').trim();
    }
  }
  return result;
}

function scaffoldCompactor() {
  console.log('\n======================================================================');
  console.log('  🥦 GALXAI: MAINTAINER COMPACTOR SCAFFOLDING ENGINE');
  console.log('======================================================================\n');

  const { name, cluster } = parseArgs();
  const domainName = name || 'SampleDomain';
  const clusterName = cluster || 'Enterprise Systems';

  const className = `Broccoli${domainName.replace(/[^a-zA-Z0-9]/g, '')}Compactor`;
  const fileName = `${className}.ts`;
  const filePath = path.join(process.cwd(), 'src', 'core', 'broccolidb', fileName);

  if (fs.existsSync(filePath)) {
    console.error(`❌ File already exists: src/core/broccolidb/${fileName}`);
    process.exit(1);
  }

  const code = `/**
 * GALXAI BroccoliDB ${domainName} Domain Compactor
 * Cluster: ${clusterName}
 * 
 * Representation Transformation Substrate:
 * Preserves factual invariants (identifiers, measurements, codes, dates)
 * while eliminating representational boilerplate and structural noise.
 */

export interface ${domainName}CompactedRecord {
  domain: '${domainName}';
  cluster: '${clusterName}';
  summaryDigest: string;
  operativeFacts: Record<string, string | number>;
  reductionPercentage: number;
}

export class ${className} {
  public static readonly DOMAIN = '${domainName}';
  public static readonly CLUSTER = '${clusterName}';

  /**
   * Transforms raw ${domainName} text into dense task-relevant representation.
   */
  public static compact(rawText: string): string {
    if (!rawText || typeof rawText !== 'string') {
      return '';
    }

    const lines = rawText.split('\\n').map(l => l.trim()).filter(Boolean);
    const operativeLines: string[] = [];

    // Extract operative facts while filtering static preamble boilerplate
    for (const line of lines) {
      if (
        /\\b(?:ID|UID|CODE|TOTAL|AMOUNT|DATE|DOSAGE|FINDING|RESULT|STATUS|TIMESTAMP)\\b/i.test(line) ||
        /[0-9]+(?:\\.[0-9]+)?\\s*(?:%|\\$|USD|EUR|GBP|mg|mL|mm|kVp|mA)/i.test(line)
      ) {
        operativeLines.push(line);
      }
    }

    if (operativeLines.length === 0) {
      // Fallback to first 5 lines if no specific patterns matched
      return lines.slice(0, 5).join('\\n');
    }

    return \`## \${this.DOMAIN.toUpperCase()} COMPACTED DIGEST (\${this.CLUSTER}):\\n\` +
      operativeLines.join('\\n') +
      '\\n\\n[STATIC FORMATTING & STRUCTURAL BOILERPLATE PRUNED]';
  }
}
`;

  fs.writeFileSync(filePath, code, 'utf-8');
  console.log(`  ✅ Created compactor: src/core/broccolidb/${fileName}`);
  console.log(`  📋 Class: ${className}`);
  console.log(`  🏢 Domain: ${domainName} | Cluster: ${clusterName}`);
  console.log('\n  Next Steps:');
  console.log(`  1. Customize regex patterns in src/core/broccolidb/${fileName}`);
  console.log('  2. Wire into src/core/broccolidb/BroccoliDomainSpendOptimizer.ts');
  console.log('  3. Run `npm run bench:180-domains` to verify reduction and grounding.\n');
}

scaffoldCompactor();
