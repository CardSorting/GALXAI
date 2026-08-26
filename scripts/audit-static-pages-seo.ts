import fs from 'fs';
import path from 'path';

console.log('🔍 Auditing All Static Public Pages for SEO & Rich Schema Integrity...\n');

const staticPublicPages = [
  'src/app/page.tsx',
  'src/app/pricing/page.tsx',
  'src/app/status/page.tsx',
  'src/app/how-it-works/page.tsx',
  'src/app/faq/page.tsx',
  'src/app/grants/page.tsx',
  'src/app/queues/page.tsx',
  'src/app/playground/page.tsx',
  'src/app/calculator/page.tsx',
  'src/app/architecture/page.tsx',
  'src/app/compliance/page.tsx',
  'src/app/about/page.tsx',
  'src/app/terms/page.tsx',
  'src/app/privacy/page.tsx',
  'src/app/docs/page.tsx',
  'src/app/docs/quickstart/page.tsx',
  'src/app/docs/ide-setup/page.tsx',
  'src/app/docs/prompt-caching/page.tsx',
  'src/app/models/page.tsx',
  'src/app/models/compare/page.tsx',
  'src/app/models/routing/page.tsx',
  'src/app/models/resolver/page.tsx',
  'src/app/tools/page.tsx',
  'src/app/cookbook/page.tsx',
  'src/app/providers/page.tsx',
  'src/app/capabilities/page.tsx',
  'src/app/security/page.tsx',
  'src/app/security/patterns/page.tsx',
  'src/app/reliability/page.tsx',
  'src/app/postmortems/page.tsx',
  'src/app/industries/page.tsx',
  'src/app/solutions/page.tsx',
  'src/app/migrate/page.tsx',
  'src/app/alternatives/page.tsx',
  'src/app/models/vs/page.tsx',
  'src/app/docs/errors/page.tsx',
  'src/app/docs/integrations/page.tsx',
  'src/app/glossary/page.tsx',
  'src/app/benchmarks/page.tsx',
];

let issues = 0;

for (const relPath of staticPublicPages) {
  const fullPath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing file: ${relPath}`);
    issues++;
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const layoutPath = path.join(path.dirname(fullPath), 'layout.tsx');
  if (fs.existsSync(layoutPath)) {
    content += '\n' + fs.readFileSync(layoutPath, 'utf-8');
  }

  // Follow component imports in src/components/
  const componentImports = content.match(/from\s+['"]@\/components\/([^'"]+)['"]/g) || [];
  for (const imp of componentImports) {
    const relComp = imp.replace(/from\s+['"]@\/components\//, '').replace(/['"]/, '');
    const possiblePaths = [
      path.join(process.cwd(), 'src/components', `${relComp}.tsx`),
      path.join(process.cwd(), 'src/components', `${relComp}.ts`),
      path.join(process.cwd(), 'src/components', relComp, 'index.tsx'),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        content += '\n' + fs.readFileSync(p, 'utf-8');
        break;
      }
    }
  }

  const hasMetadata = content.includes('metadata') || content.includes('constructMetadata') || content.includes('generateMetadata');
  const hasCanonical = content.includes('canonical') || content.includes('canonicalPath') || content.includes('SITE_CONFIG.url');
  const hasJsonLd = content.includes('JsonLd') || content.includes('create') || content.includes('schema') || content.includes('application/ld+json');
  const hasH1 = content.includes('<h1');

  const status = hasMetadata && hasCanonical;
  console.log(`[${relPath}]:`);
  console.log(`  - Metadata: ${hasMetadata ? '✅' : '❌'}`);
  console.log(`  - Canonical: ${hasCanonical ? '✅' : '❌'}`);
  console.log(`  - Schema/JsonLd: ${hasJsonLd ? '✅' : '⚠️ Optional'}`);
  console.log(`  - Semantic H1: ${hasH1 ? '✅' : '⚠️ Check H1'}`);

  if (!status) {
    issues++;
  }
}

console.log(`\nAudit completed with ${issues} issues across ${staticPublicPages.length} static public pages.`);
