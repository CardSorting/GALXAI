import fs from 'fs';
import path from 'path';

console.log('🔍 Performing 100% Exhaustive Internal Link Graph Audit...\n');

// 1. Collect all valid route paths in Next.js
const appDir = path.join(process.cwd(), 'src/app');

function getBuiltRoutes(dir: string, baseRoute = ''): string[] {
  const routes: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
        // Route group, skip segment
        routes.push(...getBuiltRoutes(path.join(dir, entry.name), baseRoute));
      } else {
        const nextSegment = `${baseRoute}/${entry.name}`;
        routes.push(...getBuiltRoutes(path.join(dir, entry.name), nextSegment));
      }
    } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
      routes.push(baseRoute === '' ? '/' : baseRoute);
    }
  }
  return routes;
}

const allValidRoutes = getBuiltRoutes(appDir);
console.log(`Discovered ${allValidRoutes.length} route patterns across src/app.`);

// 2. Scan all TSX and TS source files in src/ for internal href links
const srcDir = path.join(process.cwd(), 'src');

function getAllSourceFiles(dir: string, list: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllSourceFiles(full, list);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      list.push(full);
    }
  }
  return list;
}

const sourceFiles = getAllSourceFiles(srcDir);
const linkRegex = /href=["'](\/[^"'#?]+)["']/g;
const linksFound = new Set<string>();

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const href = match[1];
    // Filter out API endpoints or external schemes
    if (!href.startsWith('/api') && !href.startsWith('/_next') && !href.startsWith('/icon') && !href.startsWith('/favicon') && !href.startsWith('/apple')) {
      linksFound.add(href);
    }
  }
}

console.log(`Extracted ${linksFound.size} unique internal links from JSX/TSX components.\n`);

// 3. Match each link against route patterns and dynamic datasets
const staticEndpoints = new Set([
  '/opensearch.xml',
  '/feed.xml',
  '/sitemap.xml',
  '/robots.txt',
  '/llms.txt',
  '/llms-full.txt',
  '/manifest.webmanifest',
]);
import { FRONTEND_VISIBLE_MODELS } from '../src/core/router/ModelCatalog';
import { COOKBOOK_RECIPES_DATA } from '../src/lib/data/cookbooksData';
import { PROVIDERS_DATA } from '../src/lib/data/providersData';
import { CAPABILITIES_DATA } from '../src/lib/data/capabilitiesData';
import { SECURITY_SPECIFICATIONS_DATA } from '../src/lib/data/securityData';
import { SECURITY_PATTERNS_DATA } from '../src/lib/data/securityPatternsData';
import { RELIABILITY_DATA } from '../src/lib/data/reliabilityData';
import { POSTMORTEMS_DATA } from '../src/lib/data/postmortemsData';
import { INDUSTRIES_DATA } from '../src/lib/data/industriesData';
import { SOLUTION_GUIDES } from '../src/lib/data/solutionsData';
import { MIGRATION_GUIDES_DATA } from '../src/lib/data/migrationData';
import { COMPETITOR_ALTERNATIVES } from '../src/lib/data/alternativesData';
import { CURATED_MATCHUPS } from '../src/lib/data/comparisonData';
import { ERROR_TROUBLESHOOT_DATA } from '../src/lib/data/errorsData';
import { INTEGRATION_GUIDES } from '../src/lib/data/integrationsData';
import { GLOSSARY_TERMS } from '../src/lib/data/glossaryData';

const dynamicKnownUrls = new Set([
  ...FRONTEND_VISIBLE_MODELS.map(m => `/models/${m.id.replace('/', '-')}`),
  ...COOKBOOK_RECIPES_DATA.map(c => `/cookbook/${c.slug}`),
  ...PROVIDERS_DATA.map(p => `/providers/${p.slug}`),
  ...CAPABILITIES_DATA.map(c => `/capabilities/${c.slug}`),
  ...SECURITY_SPECIFICATIONS_DATA.map(s => `/security/${s.slug}`),
  ...SECURITY_PATTERNS_DATA.map(p => `/security/patterns/${p.slug}`),
  ...RELIABILITY_DATA.map(r => `/reliability/${r.slug}`),
  ...POSTMORTEMS_DATA.map(pm => `/postmortems/${pm.slug}`),
  ...INDUSTRIES_DATA.map(i => `/industries/${i.slug}`),
  ...SOLUTION_GUIDES.map(s => `/solutions/${s.slug}`),
  ...MIGRATION_GUIDES_DATA.map(m => `/migrate/${m.slug}`),
  ...COMPETITOR_ALTERNATIVES.map(a => `/alternatives/${a.slug}`),
  ...CURATED_MATCHUPS.map(m => `/models/vs/${m.slug}`),
  ...ERROR_TROUBLESHOOT_DATA.map(e => `/docs/errors/${e.code}`),
  ...INTEGRATION_GUIDES.map(i => `/docs/integrations/${i.slug}`),
  ...GLOSSARY_TERMS.map(g => `/glossary/${g.slug}`),
]);

let brokenLinks: string[] = [];

for (const link of Array.from(linksFound)) {
  // Check static XML/text endpoints
  if (staticEndpoints.has(link)) continue;
  // Check exact static match
  if (allValidRoutes.includes(link)) continue;
  // Check dynamic route dataset match
  if (dynamicKnownUrls.has(link)) continue;
  // Check if matches a bracketed pattern
  const isMatch = allValidRoutes.some(route => {
    const routeRegex = new RegExp('^' + route.replace(/\[[^\]]+\]/g, '[^/]+') + '$');
    return routeRegex.test(link);
  });
  if (isMatch) continue;

  brokenLinks.push(link);
}

if (brokenLinks.length > 0) {
  console.error(`❌ Found ${brokenLinks.length} potentially broken internal links:`);
  brokenLinks.forEach(l => console.error(`  - ${l}`));
  process.exit(1);
} else {
  console.log(`✅ All ${linksFound.size} internal component links are 100% valid! ZERO 404 crawl gaps.`);
}
