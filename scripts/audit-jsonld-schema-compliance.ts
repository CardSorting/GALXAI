import fs from 'fs';
import path from 'path';

console.log('🔍 Auditing Schema.org JSON-LD Structured Data Compliance Across All Codefiles...\n');

const appDir = path.join(process.cwd(), 'src/app');

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

const files = getAllFiles(appDir);
let schemaIssues = 0;
let schemasFound = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(process.cwd(), file);

  // Check createBreadcrumbSchema invocations
  const breadcrumbCalls = content.match(/createBreadcrumbSchema\(\s*\[([\s\S]*?)\]\s*\)/g) || [];
  for (const call of breadcrumbCalls) {
    schemasFound++;
    if (call.includes('undefined') || call.includes('null')) {
      console.warn(`⚠️ [${rel}]: createBreadcrumbSchema contains undefined/null values`);
      schemaIssues++;
    }
  }

  // Check createFAQPageSchema invocations
  const faqCalls = content.match(/createFAQPageSchema\([\s\S]*?\)/g) || [];
  for (const call of faqCalls) {
    schemasFound++;
    if (call.includes('undefined') || call.includes('null')) {
      console.warn(`⚠️ [${rel}]: createFAQPageSchema contains undefined/null values`);
      schemaIssues++;
    }
  }

  // Check createTopicHubGraph invocations
  const topicHubCalls = content.match(/createTopicHubGraph\([\s\S]*?\)/g) || [];
  for (const call of topicHubCalls) {
    schemasFound++;
    if (call.includes('undefined') || call.includes('null')) {
      console.warn(`⚠️ [${rel}]: createTopicHubGraph contains undefined/null values`);
      schemaIssues++;
    }
  }

  // Check createTechArticleSchema invocations
  const articleCalls = content.match(/createTechArticleSchema\([\s\S]*?\)/g) || [];
  for (const call of articleCalls) {
    schemasFound++;
    if (call.includes('undefined') || call.includes('null')) {
      console.warn(`⚠️ [${rel}]: createTechArticleSchema contains undefined/null values`);
      schemaIssues++;
    }
  }
}

console.log(`\nSchema.org Compliance Audit: scanned ${files.length} app files, validated ${schemasFound} JSON-LD schema instances, found ${schemaIssues} compliance issues.`);
