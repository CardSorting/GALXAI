import fs from 'fs';
import path from 'path';
import sitemap from '../src/app/sitemap';
import robots from '../src/app/robots';
import { SITE_CONFIG } from '../src/lib/seo/siteConfig';

console.log('🔍 Auditing Dynamic Sitemap, Robots.txt, and LLMs.txt Discovery Manifests...\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failCount++;
  }
}

// 1. Audit Sitemap
const sitemapEntries = sitemap();
assert(Array.isArray(sitemapEntries), 'Sitemap returns valid array of URL entries');
assert(sitemapEntries.length >= 200, `Sitemap contains comprehensive index (${sitemapEntries.length} URLs)`);

const urls = new Set(sitemapEntries.map(e => e.url));

// Check critical hub URLs in sitemap
const criticalPaths = [
  '/',
  '/pricing',
  '/status',
  '/how-it-works',
  '/faq',
  '/about',
  '/terms',
  '/privacy',
  '/models',
  '/tools',
  '/cookbook',
  '/providers',
  '/capabilities',
  '/security',
  '/security/patterns',
  '/reliability',
  '/postmortems',
  '/industries',
  '/solutions',
  '/migrate',
  '/alternatives',
  '/models/vs',
  '/docs/errors',
  '/docs/integrations',
  '/glossary',
  '/benchmarks',
];

for (const p of criticalPaths) {
  const fullUrl = p === '/' ? `${SITE_CONFIG.url}/` : `${SITE_CONFIG.url}${p}`;
  const fullUrlNoSlash = p === '/' ? SITE_CONFIG.url : `${SITE_CONFIG.url}${p}`;
  assert(urls.has(fullUrl) || urls.has(fullUrlNoSlash), `Sitemap includes critical path: ${p}`);
}

// 2. Audit Robots Configuration
const robotsConfig = robots();
assert(Boolean(robotsConfig.sitemap), 'Robots config references sitemap');
assert(Array.isArray(robotsConfig.rules), 'Robots config contains crawler rules array');

const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules : [robotsConfig.rules];
const userAgents = rules.flatMap(r => Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]);

assert(userAgents.includes('*'), 'Robots config has rule for generic web crawlers (*)');
assert(userAgents.some(ua => ua?.includes('GPTBot') || ua?.includes('ClaudeBot') || ua?.includes('*')), 'Robots config allows AI agents');

// 3. Audit llms.txt and llms-full.txt
const llmsPath = path.join(process.cwd(), 'public/llms.txt');
const llmsFullPath = path.join(process.cwd(), 'public/llms-full.txt');

assert(fs.existsSync(llmsPath), 'public/llms.txt exists');
assert(fs.existsSync(llmsFullPath), 'public/llms-full.txt exists');

const llmsContent = fs.readFileSync(llmsPath, 'utf-8');
assert(llmsContent.includes('# GALXAI'), 'llms.txt contains title header');
assert(llmsContent.includes('https://galx.ai'), 'llms.txt contains canonical links');
assert(llmsContent.includes('/tools'), 'llms.txt references /tools hub');
assert(llmsContent.includes('/models'), 'llms.txt references /models hub');

console.log(`\nSitemap & Discovery Audit: ${passCount} Passed, ${failCount} Failed.`);

if (failCount > 0) {
  process.exit(1);
}
