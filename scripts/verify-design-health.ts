#!/usr/bin/env tsx

/**
 * 🎨 GALXAI Design Integrity & Anti-Slop Automated Verifier
 * Powered by Impeccable (https://impeccable.style)
 * 
 * Scans the codebase using the Impeccable deterministic detector,
 * classifies findings into design risk tiers, and outputs structured remediation guidance.
 */

import { execSync } from 'child_process';
import path from 'path';

interface Finding {
  file: string;
  line: number;
  rule: string;
  detail: string;
  hint: string;
}

interface CategorySummary {
  name: string;
  emoji: string;
  count: number;
  rules: Set<string>;
}

function runDetector(targetDir: string = 'src'): { rawOutput: string; exitCode: number } {
  try {
    const rawOutput = execSync(`npx -y impeccable detect ${targetDir}`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    return { rawOutput, exitCode: 0 };
  } catch (error: any) {
    return {
      rawOutput: (error.stdout || '') + '\n' + (error.stderr || ''),
      exitCode: error.status ?? 1
    };
  }
}

function parseFindings(output: string): Finding[] {
  const findings: Finding[] = [];
  const lines = output.split('\n');

  let currentFile = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect file header (e.g. /Users/.../src/components/...)
    if (line.startsWith('/') || (line.includes('src/') && !line.startsWith('line '))) {
      const match = line.match(/^(\S+\.(?:tsx|ts|jsx|js|css|html))/);
      if (match) {
        currentFile = path.relative(process.cwd(), match[1]);
      }
      continue;
    }

    // Detect line finding (e.g. line 60: [bounce-easing] animate-bounce ...)
    const lineMatch = line.match(/^line\s+(\d+):\s+\[([^\]]+)\]\s+(.*)$/);
    if (lineMatch && currentFile) {
      const lineNum = parseInt(lineMatch[1], 10);
      const rule = lineMatch[2];
      const detail = lineMatch[3];

      let hint = '';
      if (i + 1 < lines.length && lines[i + 1].trim().startsWith('→')) {
        hint = lines[i + 1].trim().replace(/^→\s*/, '');
        i++; // skip hint line
      }

      findings.push({
        file: currentFile,
        line: lineNum,
        rule,
        detail,
        hint
      });
    }
  }

  return findings;
}

function classifyFindings(findings: Finding[]) {
  const categories: Record<string, CategorySummary> = {
    color: { name: 'AI Color Palettes & Gimmicks', emoji: '🎨', count: 0, rules: new Set() },
    contrast: { name: 'Contrast & Legibility Failures', emoji: '👁️', count: 0, rules: new Set() },
    motion: { name: 'Janky / Bouncy Motion', emoji: '⚡', count: 0, rules: new Set() },
    layout: { name: 'Layout & Density Anti-patterns', emoji: '📐', count: 0, rules: new Set() },
    typography: { name: 'Typography & Structural Tells', emoji: '🔤', count: 0, rules: new Set() },
    other: { name: 'General UI Quality Defects', emoji: '🛠️', count: 0, rules: new Set() }
  };

  for (const f of findings) {
    let catKey = 'other';
    const r = f.rule.toLowerCase();

    if (r.includes('color') || r.includes('gradient') || r.includes('glow') || r.includes('halo')) {
      catKey = 'color';
    } else if (r.includes('contrast') || r.includes('gray-on-color') || r.includes('undersized')) {
      catKey = 'contrast';
    } else if (r.includes('bounce') || r.includes('motion') || r.includes('transition') || r.includes('pulse')) {
      catKey = 'motion';
    } else if (r.includes('card') || r.includes('spacing') || r.includes('grid') || r.includes('layout')) {
      catKey = 'layout';
    } else if (r.includes('font') || r.includes('type') || r.includes('kicker') || r.includes('tracking') || r.includes('eyebrow')) {
      catKey = 'typography';
    }

    categories[catKey].count++;
    categories[catKey].rules.add(f.rule);
  }

  return categories;
}

function main() {
  const args = process.argv.slice(2);
  const isStrict = args.includes('--strict');
  const showHints = args.includes('--hints');
  const targetDir = args.find(a => !a.startsWith('--')) || 'src';

  console.log('\n======================================================================');
  console.log(' ✨ GALXAI Impeccable Design Integrity & Anti-Slop Audit');
  console.log('======================================================================\n');
  console.log(`🔍 Scanning target directory: "${targetDir}" using Impeccable detector...\n`);

  const { rawOutput } = runDetector(targetDir);
  const findings = parseFindings(rawOutput);

  if (findings.length === 0) {
    console.log('✅ EXCELLENT CRAFT: 0 UI anti-patterns or AI slop detected!');
    console.log('💎 All frontend code conforms to Impeccable Design Standards.\n');
    process.exit(0);
  }

  const categories = classifyFindings(findings);

  console.log(`⚠️  Found ${findings.length} design anti-pattern(s) across the codebase:\n`);

  console.log('┌──────────────────────────────────────────────────┬───────┬──────────────────────────────┐');
  console.log('│ Category                                         │ Count │ Rules Triggered              │');
  console.log('├──────────────────────────────────────────────────┼───────┼──────────────────────────────┤');

  for (const cat of Object.values(categories)) {
    if (cat.count === 0) continue;
    const catTitle = `${cat.emoji} ${cat.name}`.padEnd(48);
    const countStr = `${cat.count}`.padStart(5);
    const rulesList = Array.from(cat.rules).join(', ');
    const truncatedRules = rulesList.length > 28 ? rulesList.substring(0, 25) + '...' : rulesList.padEnd(28);
    console.log(`│ ${catTitle} │ ${countStr} │ ${truncatedRules} │`);
  }
  console.log('└──────────────────────────────────────────────────┴───────┴──────────────────────────────┘\n');

  // File breakdown
  const fileMap = new Map<string, Finding[]>();
  for (const f of findings) {
    if (!fileMap.has(f.file)) fileMap.set(f.file, []);
    fileMap.get(f.file)!.push(f);
  }

  console.log(`📁 Top affected files (${fileMap.size} files total):`);
  const sortedFiles = Array.from(fileMap.entries()).sort((a, b) => b[1].length - a[1].length);

  for (const [file, fileFindings] of sortedFiles.slice(0, 8)) {
    console.log(`   • ${file} (${fileFindings.length} findings)`);
    if (showHints) {
      for (const finding of fileFindings) {
        console.log(`     - L${finding.line} [${finding.rule}]: ${finding.detail}`);
        if (finding.hint) console.log(`       ↳ Fix: ${finding.hint}`);
      }
    }
  }

  if (sortedFiles.length > 8) {
    console.log(`   ... and ${sortedFiles.length - 8} more files.\n`);
  } else {
    console.log('');
  }

  console.log('💡 Quick Remediation Tips:');
  console.log('   1. Run `npx impeccable detect <file>` on specific components while editing.');
  console.log('   2. Use `/impeccable polish <component>` or `/impeccable distill <component>` in chat.');
  console.log('   3. Pass `--hints` flag to view line-by-line remediation directions.\n');

  if (isStrict) {
    console.error('❌ STRICT MODE FAILED: Design defects must be resolved before deployment.\n');
    process.exit(1);
  }
}

main();
