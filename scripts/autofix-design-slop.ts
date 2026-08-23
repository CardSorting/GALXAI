#!/usr/bin/env tsx

/**
 * 🛠️ GALXAI Automated Design Anti-Slop Remediation Tool (Enhanced)
 * Powered by Impeccable (https://impeccable.style)
 * 
 * Automatically applies safe, high-contrast, deterministic fixes
 * to common UI anti-patterns detected across TSX/JSX/CSS files.
 */

import fs from 'node:fs';
import path from 'node:path';

interface FixRule {
  name: string;
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
  description: string;
}

const FIX_RULES: FixRule[] = [
  // 1. Bounce animations on static UI elements
  {
    name: 'Remove animate-bounce',
    pattern: /\banimate-bounce\b/g,
    replacement: 'animate-pulse',
    description: 'Replace dated bouncy easing with subtle pulse animation'
  },
  // 2. Gray text on colored badges (Contrast Failures)
  {
    name: 'Fix gray-on-amber contrast (classes)',
    pattern: /\btext-zinc-[234]00(\s+[^"']*?)?\s+bg-amber-[45]00\b/g,
    replacement: 'text-amber-950 font-bold$1 bg-amber-400',
    description: 'Ensure dark readable text on amber badges (≥4.5:1 contrast)'
  },
  {
    name: 'Fix bg-amber with gray text',
    pattern: /\bbg-amber-[45]00(\s+[^"']*?)?\s+text-zinc-[234]00\b/g,
    replacement: 'bg-amber-400$1 text-amber-950 font-bold',
    description: 'Ensure dark readable text on amber badges (≥4.5:1 contrast)'
  },
  {
    name: 'Fix gray-on-emerald contrast',
    pattern: /\btext-zinc-[234]00(\s+[^"']*?)?\s+bg-emerald-[45]00\b/g,
    replacement: 'text-emerald-950 font-bold$1 bg-emerald-400',
    description: 'Ensure dark readable text on emerald badges (≥4.5:1 contrast)'
  },
  {
    name: 'Fix bg-emerald with gray text',
    pattern: /\bbg-emerald-[45]00(\s+[^"']*?)?\s+text-zinc-[234]00\b/g,
    replacement: 'bg-emerald-400$1 text-emerald-950 font-bold',
    description: 'Ensure dark readable text on emerald badges (≥4.5:1 contrast)'
  },
  {
    name: 'Fix gray-on-rose contrast',
    pattern: /\btext-zinc-[234]00(\s+[^"']*?)?\s+bg-rose-[45]00\b/g,
    replacement: 'text-rose-950 font-bold$1 bg-rose-400',
    description: 'Ensure dark readable text on rose badges (≥4.5:1 contrast)'
  },
  {
    name: 'Fix bg-rose with gray text',
    pattern: /\bbg-rose-[45]00(\s+[^"']*?)?\s+text-zinc-[234]00\b/g,
    replacement: 'bg-rose-400$1 text-rose-950 font-bold',
    description: 'Ensure dark readable text on rose badges (≥4.5:1 contrast)'
  },
  {
    name: 'Fix gray-on-cyan contrast',
    pattern: /\btext-zinc-[234]00(\s+[^"']*?)?\s+bg-cyan-[45]00\b/g,
    replacement: 'text-cyan-950 font-bold$1 bg-cyan-400',
    description: 'Ensure dark readable text on cyan badges (≥4.5:1 contrast)'
  },
  {
    name: 'Fix bg-cyan with gray text',
    pattern: /\bbg-cyan-[45]00(\s+[^"']*?)?\s+text-zinc-[234]00\b/g,
    replacement: 'bg-cyan-400$1 text-cyan-950 font-bold',
    description: 'Ensure dark readable text on cyan badges (≥4.5:1 contrast)'
  },
  {
    name: 'Fix gray-on-indigo contrast',
    pattern: /\btext-zinc-[34]00(\s+[^"']*?)?\s+bg-indigo-[45]00\b/g,
    replacement: 'text-indigo-950 font-bold$1 bg-indigo-400',
    description: 'Ensure dark readable text on indigo badges (≥4.5:1 contrast)'
  },
  {
    name: 'Fix bg-indigo with gray text',
    pattern: /\bbg-indigo-[45]00(\s+[^"']*?)?\s+text-zinc-[34]00\b/g,
    replacement: 'bg-indigo-400$1 text-indigo-950 font-bold',
    description: 'Ensure dark readable text on indigo badges (≥4.5:1 contrast)'
  },
  // 3. AI Gradient Tell: from-indigo-600 to-indigo-500 / from-purple
  {
    name: 'Refine AI purple-indigo gradient buttons',
    pattern: /\bfrom-indigo-600\s+to-indigo-500\b/g,
    replacement: 'from-indigo-600 to-blue-600',
    description: 'Replace generic indigo-purple gradient with distinctive cyber blue-indigo gradient'
  },
  {
    name: 'Refine AI purple-indigo gradient headings',
    pattern: /\bfrom-purple-400\s+to-indigo-500\b/g,
    replacement: 'from-white via-zinc-200 to-zinc-400',
    description: 'Replace generic purple-indigo heading gradient with crisp titanium gradient'
  },
  {
    name: 'Refine from-indigo-400 to-indigo-600',
    pattern: /\bfrom-indigo-400\s+to-indigo-600\b/g,
    replacement: 'from-indigo-500 to-blue-600',
    description: 'Replace generic indigo gradient with cyber blue-indigo'
  },
  // 4. Negative tracking below floor
  {
    name: 'Fix crushed tracking',
    pattern: /\btracking-\[-0\.0[5-9]em\]\b/g,
    replacement: 'tracking-[-0.02em]',
    description: 'Cap negative tracking at -0.02em to preserve character legibility'
  }
];

function getSourceFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
        results.push(...getSourceFiles(fullPath));
      }
    } else if (/\.(tsx|jsx|ts|js|css)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function autofix(dryRun: boolean = false) {
  console.log('\n======================================================================');
  console.log(` 🔧 GALXAI Design Anti-Slop Auto-Remediator ${dryRun ? '(DRY RUN)' : ''}`);
  console.log('======================================================================\n');

  const files = getSourceFiles(path.join(process.cwd(), 'src'));

  let totalFilesModified = 0;
  let totalFixesApplied = 0;

  for (const file of files) {
    const relFile = path.relative(process.cwd(), file);
    const originalContent = fs.readFileSync(file, 'utf-8');
    let content = originalContent;
    let fileModified = false;
    let fixesInFile = 0;

    for (const rule of FIX_RULES) {
      const matches = content.match(rule.pattern);
      if (matches) {
        content = content.replace(rule.pattern, rule.replacement as any);
        fixesInFile += matches.length;
        fileModified = true;
      }
    }

    if (fileModified) {
      totalFilesModified++;
      totalFixesApplied += fixesInFile;
      console.log(`  ✓ ${relFile} (${fixesInFile} fix${fixesInFile > 1 ? 'es' : ''} applied)`);

      if (!dryRun) {
        fs.writeFileSync(file, content, 'utf-8');
      }
    }
  }

  console.log('\n----------------------------------------------------------------------');
  if (totalFixesApplied > 0) {
    console.log(`🎉 Summary: Applied ${totalFixesApplied} automatic design fix(es) across ${totalFilesModified} file(s).`);
  } else {
    console.log('✨ No automated anti-patterns required fixing. Codebase is clean!');
  }
  console.log('======================================================================\n');
}

const isDryRun = process.argv.includes('--dry-run');
autofix(isDryRun);
