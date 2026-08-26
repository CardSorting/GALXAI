import fs from 'fs';
import path from 'path';

console.log('🔍 Auditing All 13 Tool Pages for Metadata and Schema.org Rich Cards...\n');

const toolsDir = path.join(process.cwd(), 'src/app/tools');
const subdirs = fs.readdirSync(toolsDir).filter(f => fs.statSync(path.join(toolsDir, f)).isDirectory());

let toolIssues = 0;

for (const dir of subdirs) {
  const pagePath = path.join(toolsDir, dir, 'page.tsx');
  if (!fs.existsSync(pagePath)) {
    console.error(`❌ Missing page.tsx in /tools/${dir}`);
    toolIssues++;
    continue;
  }

  const content = fs.readFileSync(pagePath, 'utf-8');
  const hasMetadata = content.includes('metadata') || content.includes('constructMetadata');
  const hasJsonLd = content.includes('JsonLd') || content.includes('schema') || content.includes('application/ld+json');
  const hasCanonical = content.includes('canonical') || content.includes('constructMetadata');

  console.log(`Checking [/tools/${dir}]:`);
  console.log(`  - Metadata: ${hasMetadata ? '✅' : '❌'}`);
  console.log(`  - Canonical: ${hasCanonical ? '✅' : '❌'}`);
  console.log(`  - JsonLd Schema: ${hasJsonLd ? '✅' : '⚠️ No JsonLd'}`);

  if (!hasMetadata || !hasCanonical) {
    toolIssues++;
  }
}

console.log(`\nTool audit finished with ${toolIssues} issues across ${subdirs.length} tools.`);
