import fs from 'fs';
import path from 'path';

console.log('🔍 Auditing All Public Dynamic Pages for SEO Excellence...\n');

const publicDynamicPaths = [
  'src/app/capabilities/[slug]/page.tsx',
  'src/app/security/patterns/[slug]/page.tsx',
  'src/app/security/[slug]/page.tsx',
  'src/app/providers/[slug]/page.tsx',
  'src/app/industries/[slug]/page.tsx',
  'src/app/solutions/[slug]/page.tsx',
  'src/app/cookbook/[slug]/page.tsx',
  'src/app/models/vs/[slug]/page.tsx',
  'src/app/models/[id]/page.tsx',
  'src/app/docs/sdks/[lang]/page.tsx',
  'src/app/docs/integrations/[slug]/page.tsx',
  'src/app/docs/errors/[code]/page.tsx',
  'src/app/compliance/[id]/page.tsx',
  'src/app/postmortems/[slug]/page.tsx',
  'src/app/architecture/[slug]/page.tsx',
  'src/app/migrate/[slug]/page.tsx',
  'src/app/benchmarks/[workload]/page.tsx',
  'src/app/reliability/[slug]/page.tsx',
  'src/app/glossary/[slug]/page.tsx',
  'src/app/alternatives/[slug]/page.tsx',
];

let issues = 0;

for (const relPath of publicDynamicPaths) {
  const fullPath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing file: ${relPath}`);
    issues++;
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const hasStaticParams = content.includes('generateStaticParams');
  const hasMetadata = content.includes('generateMetadata') || content.includes('export const metadata');
  const hasJsonLd = content.includes('JsonLd') || content.includes('schema') || content.includes('jsonld');

  console.log(`Checking [${relPath}]:`);
  console.log(`  - generateStaticParams: ${hasStaticParams ? '✅' : '❌ MISSING (SSG)'}`);
  console.log(`  - metadata: ${hasMetadata ? '✅' : '❌ MISSING'}`);
  console.log(`  - JsonLd Schema: ${hasJsonLd ? '✅' : '⚠️ No JsonLd'}`);

  if (!hasStaticParams || !hasMetadata) {
    issues++;
  }
}

console.log(`\nAudit finished with ${issues} issues across ${publicDynamicPaths.length} dynamic routes.`);
