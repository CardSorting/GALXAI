import fs from 'fs';
import path from 'path';

console.log('🔍 Auditing Breadcrumb Hierarchy Consistency Across All Pages...\n');

const appDir = path.join(process.cwd(), 'src/app');

function getAllPageFiles(dir: string, list: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllPageFiles(full, list);
    } else if (entry.name === 'page.tsx') {
      list.push(full);
    }
  }
  return list;
}

const allPages = getAllPageFiles(appDir);
let breadcrumbIssues = 0;
let checked = 0;

for (const pageFile of allPages) {
  const rel = path.relative(appDir, pageFile);
  let content = fs.readFileSync(pageFile, 'utf-8');

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

  // Skip root homepage, api routes, and internal dev routes
  if (rel === 'page.tsx' || rel.startsWith('api/') || rel.startsWith('v1/') || rel.startsWith('vault/shards') || rel.startsWith('todos/') || rel.startsWith('telemetry/')) {
    continue;
  }

  checked++;
  const hasVisualBreadcrumbs = content.includes('<Breadcrumbs') || content.includes('Breadcrumbs');
  const hasSchemaBreadcrumbs = content.includes('createBreadcrumbSchema') || content.includes('BreadcrumbList') || content.includes('createItemPageGraph');

  if (!hasVisualBreadcrumbs || !hasSchemaBreadcrumbs) {
    console.log(`⚠️ [src/app/${rel}]:`);
    console.log(`  - Visual Breadcrumbs: ${hasVisualBreadcrumbs ? '✅' : '❌'}`);
    console.log(`  - Schema BreadcrumbList: ${hasSchemaBreadcrumbs ? '✅' : '❌'}`);
    breadcrumbIssues++;
  }
}

console.log(`\nAudit completed: scanned ${checked} public pages, found ${breadcrumbIssues} breadcrumb issues.`);
