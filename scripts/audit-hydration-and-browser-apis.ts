import fs from 'fs';
import path from 'path';

console.log('🔍 Auditing React Hydration Safety, Window Guards & SSR Integrity...\n');

const srcDir = path.join(process.cwd(), 'src');

function getAllFiles(dir: string, list: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(full, list);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      list.push(full);
    }
  }
  return list;
}

const files = getAllFiles(srcDir);
let hydrationIssues = 0;
let filesAudited = 0;

for (const file of files) {
  const rel = path.relative(process.cwd(), file);
  const content = fs.readFileSync(file, 'utf-8');

  // Skip test scripts and api routes
  if (rel.startsWith('scripts/') || rel.includes('/api/') || rel.includes('/v1/')) {
    continue;
  }

  filesAudited++;

  // Check for unguarded window or localStorage in top-level or render scope without 'use client'
  const isClient = content.includes("'use client'") || content.includes('"use client"');

  if (!isClient) {
    if (/\bwindow\.[a-zA-Z]/.test(content) && !content.includes('typeof window')) {
      console.warn(`⚠️ [${rel}]: Server component contains unguarded 'window.' reference`);
      hydrationIssues++;
    }
    if (/\blocalStorage\.[a-zA-Z]/.test(content) && !content.includes('typeof window')) {
      console.warn(`⚠️ [${rel}]: Server component contains unguarded 'localStorage.' reference`);
      hydrationIssues++;
    }
    if (/\bdocument\.[a-zA-Z]/.test(content) && !content.includes('typeof document')) {
      console.warn(`⚠️ [${rel}]: Server component contains unguarded 'document.' reference`);
      hydrationIssues++;
    }
  }

  // Check for dangerouslySetInnerHTML usage
  const dangerousMatches = content.match(/dangerouslySetInnerHTML=\{([^}]+)\}/g) || [];
  for (const match of dangerousMatches) {
    // Ensure it's for JSON-LD script tags or properly formatted __html
    if (!match.includes('__html') && !match.includes('JSON.stringify')) {
      console.warn(`⚠️ [${rel}]: Potentially unsafe dangerouslySetInnerHTML usage: ${match.slice(0, 60)}`);
      hydrationIssues++;
    }
  }
}

console.log(`\nHydration & SSR Safety Audit: scanned ${filesAudited} files, found ${hydrationIssues} hydration safety issues.`);
