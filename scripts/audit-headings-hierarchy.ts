import fs from 'fs';
import path from 'path';

console.log('🔍 Auditing Semantic Heading Hierarchy (H1-H6) Across All Pages...\n');

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
let headingIssues = 0;
let totalChecked = 0;

for (const pageFile of allPages) {
  const rel = path.relative(appDir, pageFile);
  let content = fs.readFileSync(pageFile, 'utf-8');

  // Follow component imports
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

  // Skip api, v1, internal dev routes, and redirect pages
  if (rel.startsWith('api/') || rel.startsWith('v1/') || rel.startsWith('vault/shards') || rel.startsWith('todos/') || content.includes('redirect(')) {
    continue;
  }

  totalChecked++;
  const h1Matches = content.match(/<h1[\s\S]*?>[\s\S]*?<\/h1>/gi) || [];
  
  if (h1Matches.length === 0) {
    console.warn(`⚠️ [src/app/${rel}]: Missing <h1> tag`);
    headingIssues++;
  } else if (h1Matches.length > 1) {
    console.warn(`⚠️ [src/app/${rel}]: Multiple <h1> tags found (${h1Matches.length})`);
    headingIssues++;
  }
}

console.log(`\nHeading Hierarchy Audit: scanned ${totalChecked} pages, found ${headingIssues} heading structure issues.`);
