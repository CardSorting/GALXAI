import fs from 'fs';
import path from 'path';

console.log('🔍 Diagnosing Google Search Console Issues (5xx, 404, Redirects, Crawled-Not-Indexed)...\n');

const appDir = path.join(process.cwd(), 'src/app');

function getAllPageFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getAllPageFiles(filePath, fileList);
    } else if (file === 'page.tsx' || file === 'page.ts' || file === 'route.ts' || file === 'route.tsx') {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const pageFiles = getAllPageFiles(appDir);
console.log(`Found ${pageFiles.length} route files across src/app/.\n`);

let potential500Errors: { file: string; reason: string }[] = [];

for (const file of pageFiles) {
  const content = fs.readFileSync(file, 'utf-8');

  // Check 1: Next.js 15 params Promise without await
  // In Next.js 15: { params }: { params: Promise<{ id: string }> } must use await params
  if (file.includes('[') && file.includes(']')) {
    const hasParamsArg = /\{\s*params\s*\}/.test(content) || /params\s*:\s*/.test(content);
    if (hasParamsArg) {
      const hasDirectParamAccess = /params\.[a-zA-Z0-9_]+(?!\s*\()/.test(content);
      const hasAwaitParams = /await\s+params/.test(content);
      const isClientComponent = content.startsWith("'use client'") || content.startsWith('"use client"');

      if (hasDirectParamAccess && !hasAwaitParams && !isClientComponent) {
        potential500Errors.push({
          file: path.relative(process.cwd(), file),
          reason: 'Next.js 15 breaking change: params accessed synchronously without `await params`. This throws a 500 error during SSR crawl!',
        });
      }
    }
  }

  // Check 2: Unhandled Supabase Server Client calls that throw if auth/env is missing
  if (content.includes('createServerClient') || content.includes('createClient')) {
    if (content.includes('.from(') && !content.includes('try') && !content.includes('catch')) {
      // Check if it's a page component
      if (file.endsWith('page.tsx')) {
        potential500Errors.push({
          file: path.relative(process.cwd(), file),
          reason: 'Unprotected DB query in Server Component without try/catch fallback (may cause 500 during crawler request)',
        });
      }
    }
  }
}

console.log('--- 1. Potential 5xx Server Error Diagnosis ---');
if (potential500Errors.length > 0) {
  console.log(`❌ Found ${potential500Errors.length} potential 5xx causes:`);
  potential500Errors.forEach((e) => {
    console.log(`  - [${e.file}]: ${e.reason}`);
  });
} else {
  console.log('✅ No un-awaited Next.js 15 params found in dynamic routes.');
}

console.log('\n--- 2. Checking Redirecting Routes in Sitemap & App Config ---');
import nextConfig from '../next.config';
console.log('Redirects defined in next.config.ts:');
const redirects = nextConfig.redirects ? true : false;
console.log(`Configured redirects exist: ${redirects}`);

console.log('\nDiagnosis complete.');
